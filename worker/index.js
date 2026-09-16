// Cloudflare Pages "Advanced Mode" worker.
//
// scripts/build-cloudflare.mjs bundles this file to out/_worker.js. Pages runs
// it for every request: /api/chat is handled here at the edge, and everything
// else falls through to the static export via the ASSETS binding.
//
// This exists so ANTHROPIC_API_KEY stays a server-side secret. A purely static
// site would have to put the key in the browser bundle, where anyone visiting
// could read it and spend against the account.
import { handleChat } from "../lib/chat.js";

const CHAT_PATHS = new Set(["/api/chat", "/api/chat/"]);

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!CHAT_PATHS.has(url.pathname)) {
      // Static export: HTML, JS, icons, manifest.
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return json(405, { error: "This endpoint only accepts POST requests." });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json(400, { error: "I could not read that request. Please try again." });
    }

    const { status, body } = await handleChat({
      messages: payload?.messages,
      apiKey: env.ANTHROPIC_API_KEY,
    });

    return json(status, body);
  },
};
