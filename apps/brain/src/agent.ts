import Anthropic from "@anthropic-ai/sdk";
import type { ServerEvent } from "@jarvis/shared";
import { asc, eq } from "drizzle-orm";
import { config } from "./config.js";
import { db } from "./db/index.js";
import { conversations, messages as messagesTable } from "./db/schema.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { allTools } from "./tools/index.js";
import { toClaudeTool, type ToolContext } from "./tools/registry.js";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const MODEL = "claude-opus-5";

/** Caps runaway loops. A normal turn uses two or three iterations. */
const MAX_ITERATIONS = 12;

type BetaMessageParam = Anthropic.Beta.BetaMessageParam;

export interface RunTurnArgs {
  turnId: string;
  conversationId: string;
  text: string;
  mode: "voice" | "text";
  emit: (event: ServerEvent) => void;
}

export interface TurnUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

/**
 * Per-turn context Claude needs but which must not enter the cached prefix.
 *
 * The current time changes every second — putting it in the system prompt would
 * invalidate the cache on every single request, which is the classic way to
 * quietly pay full price for every turn.
 */
function turnContext(mode: "voice" | "text"): string {
  const now = new Intl.DateTimeFormat("en-GB", {
    timeZone: config.TIMEZONE,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());

  return [
    `[Context: It is ${now} (${config.TIMEZONE}).`,
    mode === "voice"
      ? "This message was spoken aloud and your reply will be read aloud — voice mode.]"
      : "Text mode.]",
  ].join(" ");
}

async function loadHistory(conversationId: string): Promise<BetaMessageParam[]> {
  const rows = await db
    .select({ role: messagesTable.role, content: messagesTable.content })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(asc(messagesTable.createdAt));

  // `system` role rows are not valid history for the Messages API; they are
  // stored for the record only.
  return rows
    .filter((row) => row.role === "user" || row.role === "assistant")
    .map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content as BetaMessageParam["content"],
    }));
}

async function persist(conversationId: string, newMessages: BetaMessageParam[]): Promise<void> {
  if (newMessages.length === 0) return;

  await db.insert(messagesTable).values(
    newMessages.map((message) => ({
      conversationId,
      role: message.role,
      content: message.content as object,
    })),
  );

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

/**
 * Run one turn to completion, streaming text and tool activity as it goes.
 *
 * Tools that need approval park inside their own `run()` while this loop stays
 * open, so there is no resumption logic here — from the loop's point of view an
 * approved write is just a slow tool.
 */
export async function runTurn(args: RunTurnArgs): Promise<{
  stopReason: string | null;
  usage: TurnUsage;
}> {
  const { turnId, conversationId, text, mode, emit } = args;

  const ctx: ToolContext = { turnId, conversationId, emit };
  const tools = allTools.map((def) => toClaudeTool(def, ctx));

  const history = await loadHistory(conversationId);
  const userMessage: BetaMessageParam = {
    role: "user",
    content: `${turnContext(mode)}\n\n${text}`,
  };

  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,

    // Adaptive is the only supported on-mode for current models; budget_tokens
    // is rejected outright. `summarized` so a long pause shows reasoning rather
    // than dead air.
    thinking: { type: "adaptive", display: "summarized" },

    // Spoken turns want speed over depth. Note this invalidates the message
    // cache if it changes mid-conversation, so a conversation should keep one
    // mode throughout.
    output_config: { effort: mode === "voice" ? "low" : "high" },

    // A safety refusal reroutes instead of dead-ending the conversation.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",

    // Cache breakpoint sits at the end of the system prompt, so tools + system
    // are cached and only the messages vary.
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],

    tools,
    messages: [...history, userMessage],
    max_iterations: MAX_ITERATIONS,
    stream: true,
  });

  const usage: TurnUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
  };

  let stopReason: string | null = null;

  try {
    for await (const stream of runner) {
      // Attach before awaiting, or the first deltas are already gone.
      stream.on("text", (delta) => emit({ type: "text", delta }));

      const message = await stream.finalMessage();
      stopReason = message.stop_reason;

      usage.inputTokens += message.usage.input_tokens ?? 0;
      usage.outputTokens += message.usage.output_tokens ?? 0;
      usage.cacheReadTokens += message.usage.cache_read_input_tokens ?? 0;
      usage.cacheCreationTokens += message.usage.cache_creation_input_tokens ?? 0;

      // A server-side tool (web search) hit its internal limit. The runner only
      // continues after a *client* tool returns, so without this the turn ends
      // silently truncated — no error, just a half-finished answer.
      if (message.stop_reason === "pause_turn") {
        runner.pushMessages({ role: "assistant", content: message.content });
      }
    }
  } finally {
    // Persist whatever was produced, even on a failed turn — a half-finished
    // exchange still has to replay correctly on the next one.
    const finalMessages = runner.params.messages as BetaMessageParam[];
    await persist(conversationId, finalMessages.slice(history.length));
  }

  return { stopReason, usage };
}

/** Start a conversation, or verify that a supplied id exists. */
export async function ensureConversation(conversationId?: string): Promise<string> {
  if (conversationId) {
    const [existing] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (existing) return existing.id;
  }

  const [created] = await db.insert(conversations).values({}).returning({ id: conversations.id });
  if (!created) throw new Error("Could not create conversation");
  return created.id;
}
