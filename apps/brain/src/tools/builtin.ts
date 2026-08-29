import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { tasks } from "../db/schema.js";
import { defineTool } from "./registry.js";

/**
 * Tools that need no connected account.
 *
 * These exist so the whole machine — the agent loop, the SSE stream, the
 * approval round-trip, the audit log — is provable before a single OAuth
 * screen has been clicked. They are also genuinely useful, so none of this is
 * scaffolding to be thrown away later.
 */

/* ─── get_time ─────────────────────────────────────────────────────────── */

export const getTime = defineTool({
  name: "get_time",
  description:
    "Get the current date and time. Use when the answer depends on knowing " +
    "'now' precisely, or when Brian asks about a different timezone.",
  risk: "read",
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe(`IANA timezone, e.g. "Europe/London". Defaults to ${config.TIMEZONE}.`),
  }),
  preview: (input) => ({
    summary: `Check the time${input.timezone ? ` in ${input.timezone}` : ""}`,
  }),
  execute: async (input) => {
    const timezone = input.timezone ?? config.TIMEZONE;

    let formatted: string;
    try {
      formatted = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date());
    } catch {
      throw new Error(`"${timezone}" is not a recognised IANA timezone`);
    }

    return {
      summary: formatted,
      content: `Current time in ${timezone}: ${formatted}`,
    };
  },
});

/* ─── capture_task ─────────────────────────────────────────────────────── */

export const captureTask = defineTool({
  name: "capture_task",
  description:
    "Save something Brian needs to do. Use when he says he needs to remember, " +
    "follow up, or handle something later — do not wait to be asked explicitly. " +
    "One task per call; call it several times for several items.",
  risk: "write",
  inputSchema: z.object({
    title: z.string().min(1).max(200).describe("Short imperative title: 'Send Amina the proposal'"),
    detail: z.string().max(2000).optional().describe("Context worth keeping. Omit if the title says it all."),
    dueAt: z
      .string()
      .datetime()
      .optional()
      .describe("ISO 8601 deadline. Only set this when a real deadline was stated."),
  }),
  preview: (input) => ({
    summary: `Save task: ${input.title}`,
    detail: [
      input.detail,
      input.dueAt ? `Due: ${new Date(input.dueAt).toLocaleString("en-GB")}` : undefined,
    ]
      .filter(Boolean)
      .join("\n\n") || undefined,
  }),
  execute: async (input) => {
    const [created] = await db
      .insert(tasks)
      .values({
        title: input.title,
        detail: input.detail ?? null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
      })
      .returning({ id: tasks.id });

    if (!created) throw new Error("Task was not saved");

    return {
      summary: `Saved: ${input.title}`,
      content: `Task saved (id ${created.id}): "${input.title}"`,
    };
  },
});

/* ─── list_tasks ───────────────────────────────────────────────────────── */

export const listTasks = defineTool({
  name: "list_tasks",
  description:
    "List Brian's saved tasks. Use before answering anything about what he owes " +
    "people, what is outstanding, or what he should do next — never guess at this.",
  risk: "read",
  inputSchema: z.object({
    status: z
      .enum(["todo", "doing", "blocked", "done"])
      .optional()
      .describe("Filter by status. Omit for everything still open."),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  execute: async (input) => {
    const rows = await db
      .select()
      .from(tasks)
      .where(input.status ? eq(tasks.status, input.status) : undefined)
      .orderBy(desc(tasks.createdAt))
      .limit(input.limit);

    const open = input.status ? rows : rows.filter((row) => row.status !== "done");

    if (open.length === 0) {
      return { summary: "No tasks", content: "No tasks match." };
    }

    const lines = open.map((row) => {
      const due = row.dueAt ? ` (due ${row.dueAt.toISOString().slice(0, 10)})` : "";
      return `- [${row.status}] ${row.title}${due}${row.detail ? `\n    ${row.detail}` : ""}`;
    });

    return {
      summary: `${open.length} task${open.length === 1 ? "" : "s"}`,
      content: lines.join("\n"),
    };
  },
  preview: (input) => ({
    summary: `List ${input.status ?? "open"} tasks`,
  }),
});

/* ─── complete_task ────────────────────────────────────────────────────── */

export const completeTask = defineTool({
  name: "complete_task",
  description:
    "Mark a task done. Call list_tasks first to get the id — never guess one.",
  risk: "write",
  inputSchema: z.object({
    id: z.string().uuid().describe("Task id from list_tasks"),
  }),
  preview: (input) => ({ summary: `Mark task ${input.id.slice(0, 8)} as done` }),
  execute: async (input) => {
    const [updated] = await db
      .update(tasks)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(tasks.id, input.id))
      .returning({ title: tasks.title });

    if (!updated) throw new Error(`No task with id ${input.id}`);

    return {
      summary: `Done: ${updated.title}`,
      content: `Marked "${updated.title}" as done.`,
    };
  },
});

export const builtinTools = [getTime, captureTask, listTasks, completeTask];
