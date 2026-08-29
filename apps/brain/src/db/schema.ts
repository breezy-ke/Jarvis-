import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ─── Enums ────────────────────────────────────────────────────────────── */

export const riskLevelEnum = pgEnum("risk_level", ["read", "write", "destructive"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const approvalDecisionEnum = pgEnum("approval_decision", [
  "auto",
  "approved",
  "denied",
  "timed_out",
]);
export const platformEnum = pgEnum("platform", ["android", "ios", "web", "cli"]);
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "paused",
  "done",
  "abandoned",
]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "doing", "blocked", "done"]);

/* ─── Devices ──────────────────────────────────────────────────────────── */

/**
 * Every client that may talk to the brain. Revoking a row is the kill switch:
 * it severs that device's access to every connected account immediately.
 */
export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    platform: platformEnum("platform").notNull(),
    /** SHA-256 of the token. The raw token is shown once, at registration. */
    tokenHash: text("token_hash").notNull(),
    /** Expo push token, set once the app registers for notifications. */
    pushToken: text("push_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("devices_token_hash_idx").on(table.tokenHash),
  }),
);

/* ─── Conversations ────────────────────────────────────────────────────── */

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One message per row.
 *
 * `content` holds the *full* Anthropic content-block array, not flattened text.
 * Tool calls, tool results, and thinking blocks all have to replay verbatim on
 * the next turn — collapsing them to a string silently breaks the conversation
 * a few turns later, in ways that are miserable to debug.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(table.conversationId, table.createdAt),
  }),
);

/* ─── Memory ───────────────────────────────────────────────────────────── */

/**
 * Backing store for Claude's `memory` tool, which presents as a small
 * filesystem. Claude curates this itself — durable facts about Brian, his
 * projects, his preferences, decisions already taken.
 */
export const memoryFiles = pgTable("memory_files", {
  path: text("path").primaryKey(),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── Connected accounts ───────────────────────────────────────────────── */

/**
 * OAuth credentials, encrypted at rest with ENCRYPTION_KEY.
 *
 * Keyed by provider *and* account, so a work account can be added alongside
 * the personal one later without a migration.
 */
export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    accountEmail: text("account_email").notNull(),
    /** Granted scopes, so we can detect when a new tool needs re-consent. */
    scopes: text("scopes")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerAccountIdx: uniqueIndex("oauth_provider_account_idx").on(
      table.provider,
      table.accountEmail,
    ),
  }),
);

/* ─── Projects and tasks ───────────────────────────────────────────────── */

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  goal: text("goal"),
  status: projectStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    detail: text("detail"),
    status: taskStatusEnum("status").notNull().default("todo"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index("tasks_project_idx").on(table.projectId),
    statusIdx: index("tasks_status_idx").on(table.status),
  }),
);

/* ─── Audit ────────────────────────────────────────────────────────────── */

/**
 * Every tool call Jarvis makes, whether auto-run, approved, or denied.
 *
 * This is what makes "it has access to all my accounts" a reasonable thing to
 * agree to: there is always an answer to "what did it actually do".
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    turnId: uuid("turn_id").notNull(),
    conversationId: uuid("conversation_id"),
    toolUseId: text("tool_use_id").notNull(),
    toolName: text("tool_name").notNull(),
    risk: riskLevelEnum("risk").notNull(),
    /** Arguments as Claude supplied them. */
    input: jsonb("input").notNull(),
    decision: approvalDecisionEnum("decision").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    ok: boolean("ok"),
    /** Short human-readable outcome. Never the full payload. */
    resultSummary: text("result_summary"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
    turnIdx: index("audit_turn_idx").on(table.turnId),
  }),
);

/* ─── Relations ────────────────────────────────────────────────────────── */

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
}));

export type Device = typeof devices.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MemoryFile = typeof memoryFiles.$inferSelect;
export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
