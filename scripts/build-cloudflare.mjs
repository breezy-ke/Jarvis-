// Builds the Cloudflare Pages bundle: a static export of the UI plus a
// _worker.js that serves /api/chat at the edge.
//
//   npm run build:cloudflare   ->   jarvis-cloudflare.zip
//
// Next.js refuses to statically export a route handler that exports POST, so
// app/api is moved aside for the duration of the build and restored afterwards
// — including when the build fails. The source tree is left exactly as found.
import { spawnSync } from "node:child_process";
import { rmSync, renameSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out");
const ZIP = join(ROOT, "jarvis-cloudflare.zip");
const API_DIR = join(ROOT, "app", "api");
const API_STASH = join(ROOT, ".cf-api-stash");

const step = (msg) => console.log(`\n▸ ${msg}`);

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...opts });
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(" ")} exited with ${res.status}`);
}

function dirSize(dir) {
  let bytes = 0;
  let files = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = dirSize(p);
      bytes += sub.bytes;
      files += sub.files;
    } else {
      bytes += statSync(p).size;
      files += 1;
    }
  }
  return { bytes, files };
}

let stashed = false;
try {
  // Stale .next artifacts from `npm run dev` carry server-mode metadata that
  // conflicts with an export build, so always start clean.
  step("Cleaning previous build output");
  for (const p of [OUT, join(ROOT, ".next"), ZIP]) rmSync(p, { recursive: true, force: true });

  step("Moving app/api aside (route handlers cannot be statically exported)");
  rmSync(API_STASH, { recursive: true, force: true });
  if (existsSync(API_DIR)) {
    mkdirSync(API_STASH, { recursive: true });
    renameSync(API_DIR, join(API_STASH, "api"));
    stashed = true;
  }

  step("Building static export");
  run("npx", ["next", "build"], { env: { ...process.env, CF_PAGES: "1" } });

  if (!existsSync(join(OUT, "index.html"))) {
    throw new Error("Export finished but out/index.html is missing — aborting.");
  }

  step("Bundling worker/index.js -> out/_worker.js");
  await esbuild.build({
    entryPoints: [join(ROOT, "worker", "index.js")],
    outfile: join(OUT, "_worker.js"),
    bundle: true,
    format: "esm",
    target: "es2022",
    platform: "neutral",
    // Left unminified on purpose: this is the one file holding the API key
    // handling, and it should stay readable in the Cloudflare dashboard.
    minify: false,
  });

  // Without this, Pages routes every request — including static assets — through
  // the Worker. Limiting it to /api/* lets the CDN serve the UI directly.
  step("Writing out/_routes.json");
  writeFileSync(
    join(OUT, "_routes.json"),
    JSON.stringify({ version: 1, include: ["/api/*"], exclude: [] }, null, 2) + "\n"
  );

  step("Zipping for Cloudflare Pages direct upload");
  run("zip", ["-r", "-q", ZIP, "."], { cwd: OUT });

  const { bytes, files } = dirSize(OUT);
  const zipMb = (statSync(ZIP).size / 1024 / 1024).toFixed(2);
  console.log(
    `\n✔ jarvis-cloudflare.zip — ${zipMb} MB (${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MB uncompressed)\n`
  );
} finally {
  if (stashed) {
    rmSync(API_DIR, { recursive: true, force: true });
    renameSync(join(API_STASH, "api"), API_DIR);
  }
  rmSync(API_STASH, { recursive: true, force: true });
}
