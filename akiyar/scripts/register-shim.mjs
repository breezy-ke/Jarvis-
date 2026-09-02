import { register } from "node:module";

// Loaded via --import so the hook is in place before check-integrity.mjs runs.
register("./server-only-shim.mjs", import.meta.url);
