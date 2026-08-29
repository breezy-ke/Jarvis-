import { z } from "zod";

/**
 * The wire contract between the brain and its clients.
 *
 * Both ends validate against these schemas, so a change here breaks the build
 * rather than surfacing as a mystery at runtime on someone's phone.
 */

/* ─── Risk ─────────────────────────────────────────────────────────────── */

/**
 * What a tool is allowed to do without asking.
 *
 *   read        runs silently
 *   write       previewed and approved before it executes
 *   destructive same, and the preview is mandatory rather than best-effort
 */
export const riskLevelSchema = z.enum(["read", "write", "destructive"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

/** Whether a given risk level needs a human in the loop. */
export function requiresApproval(risk: RiskLevel): boolean {
  return risk !== "read";
}

/* ─── Client → brain ───────────────────────────────────────────────────── */

export const registerDeviceRequestSchema = z.object({
  /** The one-time DEVICE_BOOTSTRAP_SECRET, proving this device is invited. */
  bootstrapSecret: z.string().min(1),
  /** Human-readable, shown when listing or revoking devices. */
  name: z.string().min(1).max(80),
  platform: z.enum(["android", "ios", "web", "cli"]),
});
export type RegisterDeviceRequest = z.infer<typeof registerDeviceRequestSchema>;

export const registerDeviceResponseSchema = z.object({
  deviceId: z.string().uuid(),
  /** Shown exactly once. Only a hash is kept server-side. */
  token: z.string(),
});
export type RegisterDeviceResponse = z.infer<typeof registerDeviceResponseSchema>;

export const turnRequestSchema = z.object({
  text: z.string().min(1).max(8000),
  /** Omit to start a new conversation. */
  conversationId: z.string().uuid().optional(),
  /**
   * Voice turns get terser, speech-shaped answers — no markdown, no bullets,
   * short sentences. Text turns may use structure.
   */
  mode: z.enum(["voice", "text"]).default("text"),
});
export type TurnRequest = z.infer<typeof turnRequestSchema>;

export const approvalDecisionSchema = z.enum(["approve", "deny"]);
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;

export const approvalRequestSchema = z.object({
  toolUseId: z.string().min(1),
  decision: approvalDecisionSchema,
  /** Optional reason, passed back to Claude so a denial can be reasoned about. */
  note: z.string().max(500).optional(),
});
export type ApprovalRequest = z.infer<typeof approvalRequestSchema>;

/* ─── Brain → client (SSE) ─────────────────────────────────────────────── */

/**
 * A tool call rendered for a human: what it is about to do, in plain language.
 * `detail` carries the full body (an email draft, an event description) for
 * anything the user should read before approving.
 */
export const toolPreviewSchema = z.object({
  toolUseId: z.string(),
  name: z.string(),
  risk: riskLevelSchema,
  /** One line: "Draft a reply to Amina Otieno". */
  summary: z.string(),
  /** Full text to review before approving, when there is one. */
  detail: z.string().optional(),
});
export type ToolPreview = z.infer<typeof toolPreviewSchema>;

export const serverEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("turn_started"),
    turnId: z.string().uuid(),
    conversationId: z.string().uuid(),
  }),

  /** Incremental assistant text. Clients speak this sentence by sentence. */
  z.object({
    type: z.literal("text"),
    delta: z.string(),
  }),

  /** A read tool running on its own — surfaced for the HUD, not for approval. */
  z.object({
    type: z.literal("tool_started"),
    preview: toolPreviewSchema,
  }),

  /** Everything stops here until the client answers. */
  z.object({
    type: z.literal("approval_required"),
    preview: toolPreviewSchema,
    /** ISO timestamp. Past this, the brain auto-denies and moves on. */
    expiresAt: z.string().datetime(),
  }),

  z.object({
    type: z.literal("approval_resolved"),
    toolUseId: z.string(),
    decision: approvalDecisionSchema,
    /** True when nobody answered in time. */
    timedOut: z.boolean().default(false),
  }),

  z.object({
    type: z.literal("tool_finished"),
    toolUseId: z.string(),
    name: z.string(),
    ok: z.boolean(),
    /** Short result line for the HUD: "3 events found". */
    summary: z.string(),
  }),

  z.object({
    type: z.literal("turn_finished"),
    turnId: z.string().uuid(),
    stopReason: z.string().nullable(),
    /** Whole-turn token usage, for keeping an eye on spend. */
    usage: z
      .object({
        inputTokens: z.number(),
        outputTokens: z.number(),
        cacheReadTokens: z.number(),
        cacheCreationTokens: z.number(),
      })
      .optional(),
  }),

  z.object({
    type: z.literal("error"),
    message: z.string(),
    /** Present when the failure is worth handling specially client-side. */
    code: z.enum(["rate_limited", "unauthorized", "upstream", "internal"]).optional(),
  }),
]);
export type ServerEvent = z.infer<typeof serverEventSchema>;

/** Narrow a ServerEvent to one variant: `isEvent(e, "text")`. */
export function isEvent<T extends ServerEvent["type"]>(
  event: ServerEvent,
  type: T,
): event is Extract<ServerEvent, { type: T }> {
  return event.type === type;
}

/* ─── SSE framing ──────────────────────────────────────────────────────── */

/** Serialize an event as an SSE frame. */
export function encodeSSE(event: ServerEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Parse one SSE `data:` payload back into a validated event.
 * Returns null for anything unrecognized so a client can skip it rather than
 * crash on an event type added by a newer brain.
 */
export function decodeSSE(data: string): ServerEvent | null {
  try {
    const parsed = serverEventSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
