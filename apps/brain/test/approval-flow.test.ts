import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import type { ServerEvent } from "@jarvis/shared";
import { eq } from "drizzle-orm";
import { approvals } from "../src/approvals.js";
import { closeDb, db } from "../src/db/index.js";
import { auditLog, tasks } from "../src/db/schema.js";
import { captureTask, getTime } from "../src/tools/builtin.js";
import { toClaudeTool, type ToolContext } from "../src/tools/registry.js";

/**
 * The approval gate is the load-bearing safety property of this whole system:
 * a write must not execute unless a human said yes. These tests drive the
 * registry envelope directly, so they prove it without spending API tokens.
 */

interface Harness {
  ctx: ToolContext;
  events: ServerEvent[];
  /** Resolves once an event of the given type shows up. */
  waitFor: <T extends ServerEvent["type"]>(type: T) => Promise<Extract<ServerEvent, { type: T }>>;
}

function harness(): Harness {
  const events: ServerEvent[] = [];
  const waiters: Array<{ type: string; resolve: (event: ServerEvent) => void }> = [];

  const ctx: ToolContext = {
    turnId: randomUUID(),
    conversationId: randomUUID(),
    emit: (event) => {
      events.push(event);
      for (let i = waiters.length - 1; i >= 0; i--) {
        const waiter = waiters[i]!;
        if (waiter.type === event.type) {
          waiters.splice(i, 1);
          waiter.resolve(event);
        }
      }
    },
  };

  const waitFor = <T extends ServerEvent["type"]>(type: T) =>
    new Promise<Extract<ServerEvent, { type: T }>>((resolve, reject) => {
      const existing = events.find((event) => event.type === type);
      if (existing) return resolve(existing as Extract<ServerEvent, { type: T }>);

      const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${type}"`)), 5000);
      waiters.push({
        type,
        resolve: (event) => {
          clearTimeout(timer);
          resolve(event as Extract<ServerEvent, { type: T }>);
        },
      });
    });

  return { ctx, events, waitFor };
}

/** The tool_use block the runner would normally supply. */
function toolUseContext(id: string, name: string, input: unknown) {
  return { toolUse: { type: "tool_use" as const, id, name, input }, toolUseBlock: { type: "tool_use" as const, id, name, input } };
}

after(async () => {
  await closeDb();
});

describe("read tools", () => {
  it("runs without asking for approval", async () => {
    const { ctx, events } = harness();
    const tool = toClaudeTool(getTime, ctx);

    const result = await tool.run({}, toolUseContext("toolu_read_1", "get_time", {}) as never);

    assert.match(String(result), /Current time in Africa\/Nairobi/);
    assert.ok(
      events.some((event) => event.type === "tool_started"),
      "should announce it started",
    );
    assert.ok(
      !events.some((event) => event.type === "approval_required"),
      "a read must never ask for approval",
    );

    const [entry] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.toolUseId, "toolu_read_1"));
    assert.equal(entry?.decision, "auto");
    assert.equal(entry?.ok, true);
  });
});

describe("write tools", () => {
  it("waits for approval, then executes", async () => {
    const { ctx, events, waitFor } = harness();
    const tool = toClaudeTool(captureTask, ctx);
    const title = `Approved task ${randomUUID().slice(0, 8)}`;

    const running = tool.run(
      { title },
      toolUseContext("toolu_write_ok", "capture_task", { title }) as never,
    );

    // Nothing may exist until a decision is made.
    const pending = await waitFor("approval_required");
    assert.equal(pending.preview.risk, "write");
    assert.match(pending.preview.summary, /Save task/);

    const beforeApproval = await db.select().from(tasks).where(eq(tasks.title, title));
    assert.equal(beforeApproval.length, 0, "must not write before approval");

    assert.ok(
      approvals.resolve({
        turnId: ctx.turnId,
        toolUseId: "toolu_write_ok",
        decision: "approve",
      }),
      "approval should be delivered",
    );

    const result = await running;
    assert.match(String(result), /Task saved/);

    const created = await db.select().from(tasks).where(eq(tasks.title, title));
    assert.equal(created.length, 1, "task should exist after approval");

    assert.ok(events.some((event) => event.type === "approval_resolved"));

    const [entry] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.toolUseId, "toolu_write_ok"));
    assert.equal(entry?.decision, "approved");
    assert.equal(entry?.ok, true);
  });

  it("does nothing when denied", async () => {
    const { ctx, waitFor } = harness();
    const tool = toClaudeTool(captureTask, ctx);
    const title = `Denied task ${randomUUID().slice(0, 8)}`;

    const running = tool.run(
      { title },
      toolUseContext("toolu_write_no", "capture_task", { title }) as never,
    );

    await waitFor("approval_required");
    approvals.resolve({
      turnId: ctx.turnId,
      toolUseId: "toolu_write_no",
      decision: "deny",
      note: "not now",
    });

    const result = await running;
    assert.match(String(result), /Not executed/);
    assert.match(String(result), /declined/);

    const rows = await db.select().from(tasks).where(eq(tasks.title, title));
    assert.equal(rows.length, 0, "a denied write must leave no trace");

    const [entry] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.toolUseId, "toolu_write_no"));
    assert.equal(entry?.decision, "denied");
  });

  it("rejects an approval from a different turn", async () => {
    const { ctx, waitFor } = harness();
    const tool = toClaudeTool(captureTask, ctx);
    const title = `Cross-turn task ${randomUUID().slice(0, 8)}`;

    const running = tool.run(
      { title },
      toolUseContext("toolu_write_xturn", "capture_task", { title }) as never,
    );
    await waitFor("approval_required");

    // A stale client replaying an old card must not be able to approve this.
    assert.equal(
      approvals.resolve({
        turnId: randomUUID(),
        toolUseId: "toolu_write_xturn",
        decision: "approve",
      }),
      false,
      "an approval from another turn must be refused",
    );

    const rows = await db.select().from(tasks).where(eq(tasks.title, title));
    assert.equal(rows.length, 0, "still must not have executed");

    // Clean up the parked promise.
    approvals.cancelTurn(ctx.turnId);
    await running;
  });

  it("denies everything pending when the client disconnects", async () => {
    const { ctx, waitFor } = harness();
    const tool = toClaudeTool(captureTask, ctx);
    const title = `Abandoned task ${randomUUID().slice(0, 8)}`;

    const running = tool.run(
      { title },
      toolUseContext("toolu_write_drop", "capture_task", { title }) as never,
    );
    await waitFor("approval_required");

    approvals.cancelTurn(ctx.turnId);

    const result = await running;
    assert.match(String(result), /Not executed/);

    const rows = await db.select().from(tasks).where(eq(tasks.title, title));
    assert.equal(rows.length, 0, "a dropped connection must not execute the write");
  });
});
