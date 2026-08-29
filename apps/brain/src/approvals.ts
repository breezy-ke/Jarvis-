import type { ApprovalDecision } from "@jarvis/shared";

/**
 * The human-in-the-loop gate.
 *
 * When Claude calls a tool that writes something, the tool's `run()` parks here
 * on a promise. The brain streams an `approval_required` event to the phone,
 * the phone POSTs a decision, and this resolves — the agent loop picks up
 * exactly where it left off, with no resumption logic anywhere.
 *
 * That is the whole reason the brain is a persistent process rather than a
 * serverless function: the HTTP turn stays open while a human thinks.
 */

export const DEFAULT_APPROVAL_TIMEOUT_MS = 3 * 60 * 1000;

export interface Resolution {
  decision: ApprovalDecision;
  note?: string;
  /** True when nobody answered and the timeout auto-denied it. */
  timedOut: boolean;
}

interface Pending {
  turnId: string;
  toolName: string;
  resolve: (resolution: Resolution) => void;
  timer: NodeJS.Timeout;
}

export class ApprovalBus {
  private readonly pending = new Map<string, Pending>();

  /**
   * Park until a decision arrives. Resolves rather than rejects on timeout —
   * a silent denial is a normal outcome, not an exceptional one.
   */
  request(args: {
    turnId: string;
    toolUseId: string;
    toolName: string;
    timeoutMs?: number;
  }): Promise<Resolution> {
    const { turnId, toolUseId, toolName, timeoutMs = DEFAULT_APPROVAL_TIMEOUT_MS } = args;

    return new Promise<Resolution>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(toolUseId);
        resolve({ decision: "deny", timedOut: true });
      }, timeoutMs);

      // Don't hold the process open purely for a pending approval.
      timer.unref?.();

      this.pending.set(toolUseId, { turnId, toolName, resolve, timer });
    });
  }

  /**
   * Deliver a decision. Returns false if the id is unknown or belongs to a
   * different turn — a stale phone retrying an old card must not resolve a
   * live approval.
   */
  resolve(args: {
    turnId: string;
    toolUseId: string;
    decision: ApprovalDecision;
    note?: string;
  }): boolean {
    const entry = this.pending.get(args.toolUseId);
    if (!entry || entry.turnId !== args.turnId) return false;

    clearTimeout(entry.timer);
    this.pending.delete(args.toolUseId);
    entry.resolve({ decision: args.decision, note: args.note, timedOut: false });
    return true;
  }

  /** What is currently waiting on a given turn — used to re-emit cards on reconnect. */
  pendingForTurn(turnId: string): Array<{ toolUseId: string; toolName: string }> {
    const result: Array<{ toolUseId: string; toolName: string }> = [];
    for (const [toolUseId, entry] of this.pending) {
      if (entry.turnId === turnId) result.push({ toolUseId, toolName: entry.toolName });
    }
    return result;
  }

  /**
   * Deny everything outstanding for a turn. Called when the client disconnects
   * mid-approval — better to abandon the write than to execute it with nobody
   * watching.
   */
  cancelTurn(turnId: string): void {
    for (const [toolUseId, entry] of this.pending) {
      if (entry.turnId !== turnId) continue;
      clearTimeout(entry.timer);
      this.pending.delete(toolUseId);
      entry.resolve({ decision: "deny", timedOut: true });
    }
  }
}

/** Process-wide bus. Single user, single process — no need for anything shared. */
export const approvals = new ApprovalBus();
