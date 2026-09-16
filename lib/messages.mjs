// Pure helpers for shaping the chat transcript into a Messages API request.
// Kept out of the route handler so they can be tested directly.

// The endpoint is public once deployed, so cap what one request can spend.
export const MAX_TURNS = 40;
export const MAX_CHARS = 8000;

export function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return { error: "Malformed request." };

  const cleaned = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = m.role === "user" || m.role === "assistant" ? m.role : null;
    const content = typeof m.content === "string" ? m.content.trim() : "";
    if (!role || !content) continue;
    cleaned.push({ role, content: content.slice(0, MAX_CHARS) });
  }

  // The UI seeds the transcript with a greeting from Jarvis, but the Messages
  // API requires the first message to come from the user. Drop any leading
  // assistant turns before they reach the wire.
  while (cleaned.length && cleaned[0].role === "assistant") cleaned.shift();

  // Roles have to alternate, so collapse any consecutive same-role turns.
  const merged = [];
  for (const m of cleaned) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${m.content}`;
    else merged.push({ ...m });
  }

  // Keep the most recent turns, then re-anchor on a user message.
  const trimmed = merged.slice(-MAX_TURNS);
  while (trimmed.length && trimmed[0].role === "assistant") trimmed.shift();

  if (!trimmed.length || trimmed[trimmed.length - 1].role !== "user") {
    return { error: "There was no message to send." };
  }
  return { messages: trimmed };
}

export function textFrom(message) {
  // Thinking blocks can precede the answer, so collect every text block
  // rather than reaching for content[0].
  return (message?.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}
