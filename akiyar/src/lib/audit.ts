import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Append-only audit write.
 *
 * Deliberately swallows its own failures: an audit write that throws must not
 * roll back the user-facing action that triggered it. A missing log line is a
 * problem; a supporter who could not register because logging hiccuped is a
 * worse one. Failures are surfaced on the server console instead.
 */
export async function recordAudit(
  supabase: SupabaseClient,
  entry: {
    action: string;
    entity: string;
    entityId?: string | null;
    actorId?: string | null;
    actorLabel?: string | null;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    actor_id: entry.actorId ?? null,
    actor_label: entry.actorLabel ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });

  if (error) {
    console.error(`[audit] failed to record ${entry.action}: ${error.message}`);
  }
}
