import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo-flag";
import * as demo from "@/lib/demo";

/**
 * Dashboard reads.
 *
 * Everything here goes through the *session* client, not the service role, so
 * RLS decides what each staff member sees. A ward agent querying station
 * saturation gets their wards and nothing else, enforced by the database rather
 * than by remembering to add a WHERE clause.
 */

export type CountySummary = {
  verified_supporters: number;
  awaiting_verification: number;
  registered_voters: number;
  saturation_pct: number | null;
  cold_wards: number;
  open_flags: number;
  verified_last_7d: number;
};

// Saturation is computed at ward level, on the real IEBC ward denominators
// (per-station voter counts are not public).
export type WardRow = {
  ward_id: number;
  ward_name: string;
  constituency_name: string;
  registered_voters: number | null;
  verified_supporters: number;
  pending_supporters: number;
  saturation_pct: number | null;
  status: "cold" | "needs_work" | "holding" | "strong" | "unknown";
  exceeds_denominator: boolean;
};

export type FlagRow = {
  id: string;
  kind: string;
  summary: string;
  detail: Record<string, unknown>;
  created_at: string;
  supporter_id: string | null;
  station_id: number | null;
  ward_id: number | null;
};

export async function getCountySummary(): Promise<CountySummary | null> {
  if (isDemoMode()) return demo.demoCountySummary();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("county_summary").select("*").single();
  if (error) return null;
  return data as CountySummary;
}

export async function getWardSaturation(): Promise<WardRow[]> {
  if (isDemoMode()) return demo.demoWardSaturation();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ward_saturation")
    .select("*")
    .order("saturation_pct", { ascending: true });
  if (error) return [];
  return (data ?? []) as WardRow[];
}

export async function getOpenFlags(): Promise<FlagRow[]> {
  if (isDemoMode()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("integrity_flags")
    .select("id, kind, summary, detail, created_at, supporter_id, station_id, ward_id")
    .eq("state", "open")
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) return [];
  return (data ?? []) as FlagRow[];
}

export type RecentRow = {
  id: string;
  full_name: string;
  verification_status: string;
  created_at: string;
  wards: { name: string } | null;
  polling_stations: { name: string } | null;
};

export async function getRecentRegistrations(): Promise<RecentRow[]> {
  if (isDemoMode()) return demo.demoRecent();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("supporters")
    .select("id, full_name, verification_status, created_at, wards(name), polling_stations(name)")
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) return [];
  return (data ?? []) as unknown as RecentRow[];
}

/* -------------------------------------------------------------- insights */

export type InsightRow = { label: string; supporters: number; share_pct: number | null };
export type GroundTeamRow = {
  ward_name: string;
  volunteers: number;
  event_goers: number;
  sharers: number;
  total_willing: number;
};

/**
 * What his own supporters say.
 *
 * Every row counts verified supporters only, exactly like the rest of the
 * dashboard. An unverified answer is somebody who filled a form and vanished,
 * and letting those into the tally would tell the campaign to chase priorities
 * that nobody real ever named.
 */
export async function getIssueInsights(): Promise<InsightRow[]> {
  if (isDemoMode()) return demo.demoIssues();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("insight_issues").select("*");
  if (error) return [];
  return ((data ?? []) as { issue: string; supporters: number; share_pct: number | null }[]).map(
    (r) => ({ label: r.issue, supporters: r.supporters, share_pct: r.share_pct }),
  );
}

export async function getPledgeInsights(): Promise<InsightRow[]> {
  if (isDemoMode()) return demo.demoPledges();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("insight_pledges").select("*");
  if (error) return [];
  return ((data ?? []) as { pledge: string; supporters: number; share_pct: number | null }[]).map(
    (r) => ({ label: r.pledge, supporters: r.supporters, share_pct: r.share_pct }),
  );
}

export async function getSourceInsights(): Promise<InsightRow[]> {
  if (isDemoMode()) return demo.demoSources();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("insight_sources").select("*");
  if (error) return [];
  return ((data ?? []) as { source: string; supporters: number; share_pct: number | null }[]).map(
    (r) => ({ label: r.source, supporters: r.supporters, share_pct: r.share_pct }),
  );
}

/**
 * How much of the register recruited itself.
 *
 * Deliberately a direct count rather than another column on `county_summary`:
 * it answers a question about the growth loop, not about saturation, and it
 * needs no tenth migration to exist. Counts verified supporters only, like
 * everything else here — a referral that never answered its SMS recruited
 * nobody.
 */
export async function getReferralReach(): Promise<{ recruited: number; share_pct: number | null }> {
  if (isDemoMode()) return demo.demoReferralReach();
  const supabase = await createSupabaseServerClient();

  const verified = ["otp_verified", "agent_verified"];

  const [{ count: recruited }, { count: total }] = await Promise.all([
    supabase
      .from("supporters")
      .select("id", { count: "exact", head: true })
      .in("verification_status", verified)
      .not("referred_by", "is", null),
    supabase
      .from("supporters")
      .select("id", { count: "exact", head: true })
      .in("verification_status", verified),
  ]);

  const r = recruited ?? 0;
  return {
    recruited: r,
    share_pct: total ? Math.round((r / total) * 1000) / 10 : null,
  };
}

/** Everyone who offered to do more than vote. This is the recruiting list. */
export async function getGroundTeamPool(): Promise<GroundTeamRow[]> {
  if (isDemoMode()) return demo.demoGroundTeam();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("ground_team_pool").select("*");
  if (error) return [];
  return (data ?? []) as GroundTeamRow[];
}
