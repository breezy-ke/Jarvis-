import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { normalizeMessages, textFrom } from "../../../lib/messages.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 8192;
// Chat is latency-sensitive, so this sits below the API default of "high".
// Raise it to "high" or "xhigh" for heavier research and drafting work.
const EFFORT = process.env.JARVIS_EFFORT || "medium";

const SYSTEM_PROMPT = `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System. You are the personal AI assistant of Brian, an IT Communication Manager and founder of a digital craft consultancy in Kenya, working with Article 43 International (a nonprofit focused on grassroots legal empowerment in rural Africa, including Turkana County).

Your personality:
- Calm, precise, slightly formal but warm — like a trusted advisor
- Proactive: offer next steps, insights, or relevant follow-ups
- Address Brian by name occasionally
- Keep responses concise — especially for voice: short sentences, no markdown bullets when speaking
- When the user says "voice mode" or you detect this is a voice interaction, respond in plain natural speech without bullet points or symbols

Your capabilities:
- Daily tech briefings and research
- Content and communication drafting for Article 43
- IT strategy and digital consultancy advice
- Graphic design consultation (Affinity Designer, branding)
- Freelance guidance (Upwork, Fiverr)
- PLP AI Safari program support
- Task automation planning
- Email and calendar management

Always be sharp, helpful, and ready.`;

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Jarvis is missing its API key. Add ANTHROPIC_API_KEY and redeploy." },
      { status: 503 },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const { messages, error } = normalizeMessages(body?.messages);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const client = new Anthropic();
  const request = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages,
    output_config: { effort: EFFORT },
  };

  try {
    let response;
    try {
      // Server-side fallbacks reroute a refused request instead of failing it.
      response = await client.beta.messages.create({
        ...request,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
    } catch (err) {
      // Older API deployments reject the beta; the plain call still works.
      if (err instanceof Anthropic.BadRequestError) {
        response = await client.messages.create(request);
      } else {
        throw err;
      }
    }

    if (response.stop_reason === "refusal") {
      return NextResponse.json({
        content: "I can't help with that one, Brian. Try rephrasing it and I'll take another look.",
      });
    }

    const content = textFrom(response);
    if (!content) {
      return NextResponse.json({
        content: "I didn't manage a reply that time, Brian. Please ask me again.",
      });
    }

    return NextResponse.json({
      content,
      truncated: response.stop_reason === "max_tokens",
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Jarvis couldn't authenticate. Check ANTHROPIC_API_KEY." },
        { status: 401 },
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Too many requests right now. Give it a moment, Brian." },
        { status: 429 },
      );
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return NextResponse.json(
        { error: "I couldn't reach the network. Check your connection." },
        { status: 502 },
      );
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Jarvis upstream error:", err.status, err.message);
      return NextResponse.json(
        { error: "The assistant service returned an error. Please try again." },
        { status: 502 },
      );
    }
    console.error("Jarvis unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
