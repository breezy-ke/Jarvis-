/**
 * Lets the check suite import modules marked `server-only`.
 *
 * `server-only` is a build-time guard: it exists so that importing a module from
 * a client component fails loudly. Next provides it during a build, but plain
 * Node cannot resolve it, which would put every genuinely server-side module —
 * OTP hashing, ticket signing, the pepper — permanently out of reach of the
 * tests.
 *
 * The alternative was to copy those functions into the test file. A second copy
 * of a security primitive that can silently drift from the real one is worse
 * than no test at all, so instead the specifier is resolved to an empty module
 * and the real source is exercised.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve as resolvePath } from "node:path";

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** Mirrors the `@/*` -> `src/*` alias in tsconfig.json, adding the extension
 *  that TypeScript lets the source omit. */
function resolveAlias(specifier) {
  const target = join(SRC, specifier.slice(2));
  for (const candidate of [target, `${target}.ts`, `${target}.tsx`, join(target, "index.ts")]) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier === "server-only" || specifier === "client-only") {
    return { url: "data:text/javascript,", shortCircuit: true };
  }

  if (specifier.startsWith("@/")) {
    const url = resolveAlias(specifier);
    if (url) return { url, format: url.endsWith(".json") ? "json" : undefined, shortCircuit: true };
  }

  return next(specifier, context);
}

/**
 * Bundlers import JSON with a plain `import x from "./y.json"`; Node requires an
 * explicit `with { type: "json" }`. Supplying the attribute here keeps the
 * source written the way the bundler expects rather than bending the app to suit
 * the test runner.
 */
export async function load(url, context, next) {
  if (url.endsWith(".json")) {
    return next(url, { ...context, importAttributes: { type: "json" } });
  }
  return next(url, context);
}
