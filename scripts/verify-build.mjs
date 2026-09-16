// Verifies the built Cloudflare bundle by actually serving it.
//
//   npm run verify
//
// Loads the real bundled out/_worker.js, puts a mock ASSETS binding and a
// stubbed Anthropic endpoint behind it, serves it over HTTP, and asserts on
// live responses. This exercises the artifact that gets uploaded, not the
// source it was built from.
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out");
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

if (!existsSync(join(OUT, "_worker.js"))) {
  console.error("✘ out/_worker.js not found — run `npm run build:cloudflare` first.");
  process.exit(1);
}

/* ── Stub the Anthropic endpoint, pass everything else through ── */
let stubResponse = null;
let lastRequestBody = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input?.url;
  if (url !== ANTHROPIC_URL) return realFetch(input, init);
  lastRequestBody = JSON.parse(init.body);
  const { status, payload } = stubResponse;
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

const worker = (await import(pathToFileURL(join(OUT, "_worker.js")).href)).default;

/* ── Mock the Pages ASSETS binding against the static export ── */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

const ASSETS = {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const candidates = pathname.endsWith("/")
      ? [join(OUT, pathname, "index.html")]
      : [join(OUT, pathname), join(OUT, pathname, "index.html")];
    for (const file of candidates) {
      if (existsSync(file) && !file.endsWith("/")) {
        try {
          const body = readFileSync(file);
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": TYPES[extname(file)] || "application/octet-stream" },
          });
        } catch {
          /* directory — try the next candidate */
        }
      }
    }
    return new Response(readFileSync(join(OUT, "404.html")), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
};

const env = { ASSETS, ANTHROPIC_API_KEY: "test-key-not-real" };

const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(`http://localhost${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
  const out = await worker.fetch(request, env);
  res.writeHead(out.status, Object.fromEntries(out.headers));
  res.end(Buffer.from(await out.arrayBuffer()));
});

const port = await new Promise((r) => server.listen(0, () => r(server.address().port)));
const base = `http://localhost:${port}`;
console.log(`\nServing the built export at ${base}\n`);

/* ── Assertions ── */
let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✘ ${name}\n      ${err.message}`);
    failures.push(name);
  }
}

const eq = (actual, expected, label) => {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};
const has = (haystack, needle, label) => {
  if (!String(haystack).includes(needle)) throw new Error(`${label}: ${JSON.stringify(String(haystack).slice(0, 160))} does not contain ${JSON.stringify(needle)}`);
};

const chat = (body) =>
  realFetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const ok = [{ role: "user", content: "Morning brief please" }];

console.log("Static export");
await check("GET / serves the app shell", async () => {
  const r = await realFetch(base);
  eq(r.status, 200, "status");
  has(r.headers.get("content-type"), "text/html", "content-type");
  has(await r.text(), "J.A.R.V.I.S.", "body");
});
await check("GET /manifest.json is valid JSON with both icons", async () => {
  const r = await realFetch(`${base}/manifest.json`);
  eq(r.status, 200, "status");
  const m = await r.json();
  eq(m.icons.length, 2, "icon count");
});
await check("GET /icon-192.png serves a real PNG as image/png", async () => {
  const r = await realFetch(`${base}/icon-192.png`);
  eq(r.status, 200, "status");
  eq(r.headers.get("content-type"), "image/png", "content-type");
  const sig = Buffer.from(await r.arrayBuffer()).subarray(0, 8);
  eq(sig.toString("hex"), "89504e470d0a1a0a", "PNG signature");
});
await check("GET /icon-512.png serves a real PNG", async () => {
  const r = await realFetch(`${base}/icon-512.png`);
  eq(r.status, 200, "status");
  eq(r.headers.get("content-type"), "image/png", "content-type");
});
await check("GET /_next/... serves the JS bundle", async () => {
  const html = await (await realFetch(base)).text();
  const src = html.match(/\/_next\/static\/chunks\/[^"']+\.js/)?.[0];
  if (!src) throw new Error("no chunk reference found in index.html");
  eq((await realFetch(base + src)).status, 200, `status for ${src}`);
});

console.log("\nChat endpoint");
await check("a thinking-block-first reply still returns the text", async () => {
  // Opus 5 thinks by default: content[0] is a thinking block. The old code read
  // content[0].text and would have rendered an empty reply here.
  stubResponse = {
    status: 200,
    payload: {
      stop_reason: "end_turn",
      content: [
        { type: "thinking", thinking: "" },
        { type: "text", text: "Good day, Brian. Three items this morning." },
      ],
    },
  };
  const r = await chat({ messages: ok });
  eq(r.status, 200, "status");
  eq((await r.json()).content, "Good day, Brian. Three items this morning.", "content");
});
await check("it asks for claude-opus-5 with fallbacks enabled", () => {
  eq(lastRequestBody.model, "claude-opus-5", "model");
  eq(lastRequestBody.fallbacks, "default", "fallbacks");
  eq(lastRequestBody.output_config.effort, "medium", "effort");
});
await check("a refusal returns a human sentence, not an empty bubble", async () => {
  stubResponse = { status: 200, payload: { stop_reason: "refusal", content: [], stop_details: { type: "refusal", category: "cyber" } } };
  const body = await (await chat({ messages: ok })).json();
  has(body.content, "Brian", "refusal text");
  if (body.error) throw new Error("refusal should not surface as an error");
});
await check("a truncated reply is flagged rather than silently cut", async () => {
  stubResponse = { status: 200, payload: { stop_reason: "max_tokens", content: [{ type: "text", text: "Item one" }] } };
  has((await (await chat({ messages: ok })).json()).content, "cut short", "truncation notice");
});
await check("a rejected key explains itself in plain English", async () => {
  stubResponse = { status: 401, payload: { error: { message: "invalid x-api-key" } } };
  const r = await chat({ messages: ok });
  eq(r.status, 401, "status");
  has((await r.json()).error, "ANTHROPIC_API_KEY", "error text");
});
await check("a rate limit explains itself in plain English", async () => {
  stubResponse = { status: 429, payload: { error: { message: "rate_limit_error" } } };
  has((await (await chat({ messages: ok })).json()).error, "Rate limit", "error text");
});
await check("a missing server key names the fix, with no stack trace", async () => {
  const before = lastRequestBody;
  env.ANTHROPIC_API_KEY = undefined;
  try {
    const r = await chat({ messages: ok });
    has((await r.json()).error, "ANTHROPIC_API_KEY", "error text");
    if (lastRequestBody !== before) throw new Error("it called the API without a key");
  } finally {
    env.ANTHROPIC_API_KEY = "test-key-not-real";
  }
});
await check("an empty message is refused before spending a request", async () => {
  const before = lastRequestBody;
  const r = await chat({ messages: [] });
  eq(r.status, 400, "status");
  has((await r.json()).error, "No message received", "error text");
  if (lastRequestBody !== before) throw new Error("it called the API for an empty message");
});
await check("a malformed history is refused with guidance", async () => {
  const body = await (await chat({ messages: [{ role: "wizard", content: "hi" }] })).json();
  has(body.error, "clearing the chat", "error text");
});
await check("GET /api/chat is rejected as 405", async () => {
  eq((await realFetch(`${base}/api/chat`)).status, 405, "status");
});
await check("no error message leaks raw API or library wording", async () => {
  for (const [status, payload] of [
    [401, { error: { message: "invalid x-api-key" } }],
    [429, { error: { message: "rate_limit_error" } }],
    [500, { error: { message: "internal_server_error" } }],
  ]) {
    stubResponse = { status, payload };
    const text = (await (await chat({ messages: ok })).json()).error || "";
    for (const leak of ["x-api-key", "_error", "undefined", "Error:", "at Object."]) {
      if (text.includes(leak)) throw new Error(`"${text}" leaks ${JSON.stringify(leak)}`);
    }
  }
});

server.close();
console.log(
  failures.length
    ? `\n✘ ${failures.length} failed, ${passed} passed\n`
    : `\n✔ all ${passed} checks passed\n`
);
process.exit(failures.length ? 1 : 0);
