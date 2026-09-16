// Shared chat logic for both deployment targets:
//   - app/api/chat/route.js  (Next.js route handler, used on Vercel)
//   - worker/index.js        (Cloudflare Pages _worker.js, used on Pages)
// Both call handleChat() so the two paths cannot drift apart.

export const MODEL = "claude-opus-5";

// A voice assistant reading a reply aloud should not run for minutes, and the
// system prompt already asks for concise answers. Raise this if the daily
// briefs start getting cut off.
export const MAX_TOKENS = 4096;

// Chat is latency-sensitive — Brian is often waiting on a spoken reply. "medium"
// keeps answers sharp without the extra thinking time "high" spends. Raise it to
// "high" or "xhigh" if research answers start feeling shallow.
export const EFFORT = "medium";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const REQUEST_TIMEOUT_MS = 60_000;

export const SYSTEM_PROMPT = `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System. You are the personal AI assistant of Brian, an IT Communication Manager and founder of a digital craft consultancy in Kenya, working with Article 43 International (a nonprofit focused on grassroots legal empowerment in rural Africa, including Turkana County).

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

/** Reject anything that is not a well-formed chat history before spending a request on it. */
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "No message received. Please type or speak your command.";
  }
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) {
      return "That conversation history looks malformed. Try clearing the chat and starting again.";
    }
    if (typeof m.content !== "string" || m.content.trim() === "") {
      return "One of the messages was empty. Please type or speak your command.";
    }
  }
  return null;
}

/** Map an upstream failure onto something a person can act on. */
function humanErrorFor(status, upstreamMessage) {
  if (status === 401 || status === 403) {
    return "My API key was rejected. Check that ANTHROPIC_API_KEY is set correctly and still active.";
  }
  if (status === 429) {
    return "Rate limit reached. Give it a moment and try again.";
  }
  if (status === 529 || status >= 500) {
    return "The model is temporarily unavailable. Please try again shortly.";
  }
  if (status === 400) {
    return `That request was rejected: ${upstreamMessage || "invalid request"}.`;
  }
  return upstreamMessage || "Something went wrong reaching the model. Please retry.";
}

/**
 * Run one chat turn.
 * @param {{messages: unknown, apiKey: string|undefined}} args
 * @returns {Promise<{status: number, body: {content: string} | {error: string}}>}
 */
export async function handleChat({ messages, apiKey }) {
  if (!apiKey) {
    return {
      status: 500,
      body: {
        error:
          "No API key configured on the server. Set ANTHROPIC_API_KEY in your hosting environment and redeploy.",
      },
    };
  }

  const invalid = validateMessages(messages);
  if (invalid) return { status: 400, body: { error: invalid } };

  let response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        // Server-side fallback: if a safety classifier declines the request,
        // the API retries it on a fallback model inside the same call instead
        // of returning Brian an empty reply.
        "anthropic-beta": "server-side-fallback-2026-07-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        output_config: { effort: EFFORT },
        fallbacks: "default",
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err && (err.name === "TimeoutError" || err.name === "AbortError");
    return {
      status: 504,
      body: {
        error: timedOut
          ? "That took too long and I stopped waiting. Please try again."
          : "I could not reach the model. Check your connection and try again.",
      },
    };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return {
      status: 502,
      body: { error: "The model sent back a response I could not read. Please retry." },
    };
  }

  if (!response.ok) {
    return {
      status: response.status,
      body: { error: humanErrorFor(response.status, data?.error?.message) },
    };
  }

  // Opus 5 thinks by default, so content[0] is usually a thinking block, not
  // text. Reading content[0].text here would render a blank reply.
  const text = Array.isArray(data?.content)
    ? data.content
        .filter((b) => b?.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("")
        .trim()
    : "";

  if (data?.stop_reason === "refusal") {
    return {
      status: 200,
      body: {
        content:
          text ||
          "I'm not able to help with that one, Brian. Try rephrasing it, or ask me something else.",
      },
    };
  }

  if (!text) {
    return {
      status: 502,
      body: { error: "I came back with an empty reply. Please try again." },
    };
  }

  const truncated = data?.stop_reason === "max_tokens";
  return {
    status: 200,
    body: { content: truncated ? `${text}\n\n[Reply cut short at the length limit.]` : text },
  };
}
