import { randomUUID } from "node:crypto";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { requiresApproval, type RiskLevel, type ServerEvent } from "@jarvis/shared";
import type { z } from "zod";
import { approvals, DEFAULT_APPROVAL_TIMEOUT_MS } from "../approvals.js";
import { db } from "../db/index.js";
import { auditLog } from "../db/schema.js";

/**
 * The tool registry.
 *
 * Every tool declares what it is allowed to do without asking. The registry
 * wraps each one in an envelope that enforces that declaration, streams
 * progress to the client, and records what happened — so an individual tool
 * only ever has to implement its own job.
 */

export interface ToolContext {
  turnId: string;
  conversationId: string;
  /** Push an event down the open SSE stream. */
  emit: (event: ServerEvent) => void;
}

export interface ToolResult {
  /** One line for the HUD and the audit log: "3 events found". */
  summary: string;
  /** What Claude actually receives back as the tool result. */
  content: string;
}

export interface ToolPreviewParts {
  /** One line, imperative: "Draft a reply to Amina Otieno". */
  summary: string;
  /** Full text to read before approving — an email body, an event description. */
  detail?: string;
}

type Shape = z.ZodObject<z.ZodRawShape>;

export interface ToolDefinition<TSchema extends Shape = Shape> {
  name: string;
  /** Written for Claude. Say when to use it, and when not to. */
  description: string;
  risk: RiskLevel;
  inputSchema: TSchema;
  /** Rendered before execution — this is what the human approves. */
  preview: (input: z.infer<TSchema>) => ToolPreviewParts;
  execute: (input: z.infer<TSchema>, ctx: ToolContext) => Promise<ToolResult>;
}

/**
 * Identity function that preserves per-tool input typing at the definition
 * site, then widens it so tools of differing shapes can live in one array.
 */
export function defineTool<TSchema extends Shape>(def: ToolDefinition<TSchema>): ToolDefinition {
  return def as unknown as ToolDefinition;
}

/* ─── Audit ────────────────────────────────────────────────────────────── */

type Decision = "auto" | "approved" | "denied" | "timed_out";

async function record(entry: {
  ctx: ToolContext;
  toolUseId: string;
  def: ToolDefinition;
  input: unknown;
  decision: Decision;
  ok: boolean | null;
  resultSummary?: string;
  error?: string;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      turnId: entry.ctx.turnId,
      conversationId: entry.ctx.conversationId,
      toolUseId: entry.toolUseId,
      toolName: entry.def.name,
      risk: entry.def.risk,
      input: entry.input as object,
      decision: entry.decision,
      decidedAt: new Date(),
      ok: entry.ok,
      resultSummary: entry.resultSummary ?? null,
      error: entry.error ?? null,
    });
  } catch (error) {
    // A failed audit write must not take down a turn that otherwise worked,
    // but it should be loud — this is the record we rely on for trust.
    console.error("[audit] failed to record tool call", {
      tool: entry.def.name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/* ─── Preview ──────────────────────────────────────────────────────────── */

function safePreview(def: ToolDefinition, input: z.infer<Shape>): ToolPreviewParts {
  try {
    return def.preview(input);
  } catch {
    // A broken preview must never be the reason a write slips through
    // unreviewed, so fall back to something honest rather than skipping.
    return { summary: `Run ${def.name}`, detail: JSON.stringify(input, null, 2) };
  }
}

/* ─── The envelope ─────────────────────────────────────────────────────── */

/**
 * Wrap a tool definition for the Claude tool runner.
 *
 * Reads run straight through. Writes stop and wait for a human. Everything is
 * recorded either way, and errors come back to Claude as text so it can adapt
 * rather than the whole turn collapsing.
 */
export function toClaudeTool(def: ToolDefinition, ctx: ToolContext) {
  return betaZodTool({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
    run: async (input, context) => {
      // The runner hands us the real tool_use block, so the id in the audit log
      // and on the approval card is the same one Claude used.
      const toolUseId = context?.toolUse.id ?? randomUUID();
      const preview = safePreview(def, input);

      const previewPayload = {
        toolUseId,
        name: def.name,
        risk: def.risk,
        summary: preview.summary,
        ...(preview.detail !== undefined ? { detail: preview.detail } : {}),
      };

      /* Gate ------------------------------------------------------------- */

      let decision: Decision = "auto";

      if (requiresApproval(def.risk)) {
        ctx.emit({
          type: "approval_required",
          preview: previewPayload,
          expiresAt: new Date(Date.now() + DEFAULT_APPROVAL_TIMEOUT_MS).toISOString(),
        });

        const resolution = await approvals.request({
          turnId: ctx.turnId,
          toolUseId,
          toolName: def.name,
        });

        ctx.emit({
          type: "approval_resolved",
          toolUseId,
          decision: resolution.decision,
          timedOut: resolution.timedOut,
        });

        if (resolution.decision === "deny") {
          decision = resolution.timedOut ? "timed_out" : "denied";
          await record({ ctx, toolUseId, def, input, decision, ok: null });

          // Phrased so Claude treats this as a deliberate instruction and
          // reports back, rather than looking for a way around it.
          return resolution.timedOut
            ? `Not executed: the approval request timed out with no response. Do not retry automatically — tell Brian it is waiting on him.`
            : `Not executed: Brian declined this action${
                resolution.note ? ` — "${resolution.note}"` : ""
              }. Acknowledge the decision and continue without it.`;
        }

        decision = "approved";
      } else {
        ctx.emit({ type: "tool_started", preview: previewPayload });
      }

      /* Execute ---------------------------------------------------------- */

      try {
        const result = await def.execute(input, ctx);

        ctx.emit({
          type: "tool_finished",
          toolUseId,
          name: def.name,
          ok: true,
          summary: result.summary,
        });

        await record({
          ctx,
          toolUseId,
          def,
          input,
          decision,
          ok: true,
          resultSummary: result.summary,
        });

        return result.content;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        ctx.emit({
          type: "tool_finished",
          toolUseId,
          name: def.name,
          ok: false,
          summary: `Failed: ${message}`,
        });

        await record({ ctx, toolUseId, def, input, decision, ok: false, error: message });

        // Returned, not thrown: Claude can then try a different approach or
        // explain the problem. Throwing here would abort the whole turn.
        return `Tool error: ${message}`;
      }
    },
  });
}
