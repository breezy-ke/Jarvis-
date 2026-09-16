import { NextResponse } from "next/server";
import { handleChat } from "../../../lib/chat.js";

// Server build only (Vercel / `npm run dev`). The Cloudflare Pages export
// cannot run route handlers, so scripts/build-cloudflare.mjs moves app/api
// aside for that build and worker/index.js serves this endpoint instead.
export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "I could not read that request. Please try again." },
      { status: 400 }
    );
  }

  const { status, body } = await handleChat({
    messages: payload?.messages,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  return NextResponse.json(body, { status });
}
