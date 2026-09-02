import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/demo-flag";
import { isFullyConfigured } from "@/lib/supabase/config";
import { demoEvents, demoPost, demoPosts } from "@/lib/demoContent";

/*
  News and the diary — the campaign site's editable content.

  These are the only two things on the public site that campaign staff change
  themselves, and the whole reason the site used to be a separate WordPress
  install. They read from Supabase and are edited at /admin/content.

  READ POSTURE

  Public pages read through the service-role client rather than the anon client,
  because these pages are statically rendered at build time and revalidated on a
  timer — there is no visitor session to attach RLS to. The RLS policies in
  migration 0010 still hold the line for any client that does connect directly.

  FAILURE POSTURE

  Every read returns an empty list rather than throwing. A campaign site whose
  front page 500s because the news table is unreachable is worse than one whose
  news section is briefly empty: the manifesto, the gallery and the register
  link are all still doing their job.
*/

export type ContentState = "draft" | "published" | "archived";

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: string | null;
  state: ContentState;
  published_at: string | null;
  author_label?: string | null;
};

export type EventEntry = {
  id: string;
  title: string;
  when_text: string;
  where_text: string;
  summary: string | null;
  state: ContentState;
  starts_on: string;
};

const POST_COLUMNS = "id, slug, title, excerpt, body, category, state, published_at, author_label";
const EVENT_COLUMNS = "id, title, when_text, where_text, summary, state, starts_on";

/** True when there is a database to talk to at all. */
function live(): boolean {
  return !isDemoMode() && isFullyConfigured();
}

/**
 * Published posts, newest first.
 *
 * `limit` 0 means all of them — the news index — while the front page takes a
 * slice.
 */
export async function getPosts(limit = 0): Promise<Post[]> {
  if (isDemoMode()) {
    const all = demoPosts();
    return limit > 0 ? all.slice(0, limit) : all;
  }
  if (!live()) return [];

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from("posts")
      .select(POST_COLUMNS)
      .eq("state", "published")
      // A post dated in the future is scheduled, not live. Staff use this to
      // write a statement the night before and let it appear on the morning.
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false });

    if (limit > 0) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Post[];
  } catch (err) {
    console.error(`[content] posts unavailable: ${(err as Error).message}`);
    return [];
  }
}

/** One published post, or null. Null becomes a 404 at the page. */
export async function getPost(slug: string): Promise<Post | null> {
  if (isDemoMode()) return demoPost(slug);
  if (!live()) return null;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("posts")
      .select(POST_COLUMNS)
      .eq("slug", slug)
      .eq("state", "published")
      .lte("published_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    return (data as Post) ?? null;
  } catch (err) {
    console.error(`[content] post "${slug}" unavailable: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Upcoming diary entries.
 *
 * Past stops are filtered out here rather than left to staff to delete. A page
 * of dates that have already passed reads as an abandoned campaign, and that is
 * too easy a failure to leave to someone remembering.
 */
export async function getEvents(): Promise<EventEntry[]> {
  const today = new Date().toISOString().slice(0, 10);

  if (isDemoMode()) return demoEvents().filter((e) => e.starts_on >= today);
  if (!live()) return [];

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("state", "published")
      .gte("starts_on", today)
      .order("starts_on", { ascending: true });
    if (error) throw error;
    return (data ?? []) as EventEntry[];
  } catch (err) {
    console.error(`[content] events unavailable: ${(err as Error).message}`);
    return [];
  }
}

/* ------------------------------------------------------------ staff reads */

/** Everything, drafts included, for the editor. */
export async function getAllPosts(): Promise<Post[]> {
  if (isDemoMode()) return demoPosts(true);
  if (!live()) return [];

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("posts")
      .select(POST_COLUMNS)
      .order("published_at", { ascending: false, nullsFirst: true })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as Post[];
  } catch (err) {
    console.error(`[content] post list unavailable: ${(err as Error).message}`);
    return [];
  }
}

export async function getAllEvents(): Promise<EventEntry[]> {
  if (isDemoMode()) return demoEvents(true);
  if (!live()) return [];

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .order("starts_on", { ascending: true })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as EventEntry[];
  } catch (err) {
    console.error(`[content] event list unavailable: ${(err as Error).message}`);
    return [];
  }
}

/* ---------------------------------------------------------------- helpers */

/**
 * A URL-safe slug from a title.
 *
 * Staff never type one. A slug typed by hand on a phone is where an accidental
 * space, a capital letter or a stray apostrophe turns into a broken link that
 * nobody notices until it has been shared.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    // Drop the combining marks NFKD just split off, so "Turkana Nordé" becomes
    // "turkana-norde" rather than "turkana-nord-e".
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Post bodies are plain text, split on blank lines.
 *
 * Deliberately not HTML and deliberately not Markdown. The body is typed by a
 * campaign volunteer on a phone; rendering it as markup would mean either
 * trusting that input or shipping a sanitiser, and neither is worth it for
 * copy that is paragraphs and nothing else.
 */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** The date as the log prints it: "14 Mar 2027". */
export function formatDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(d);
}
