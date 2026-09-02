/**
 * Demo mode.
 *
 * When NEXT_PUBLIC_DEMO_MODE is "1" the app runs entirely on in-memory sample
 * data — no Supabase, no SMS gateway. It lets the campaign click through a fully
 * working app (and show the candidate) before any database or shortcode exists.
 *
 * Deliberately its own tiny module with no `server-only` guard so the flag can
 * be read from client components, the proxy, and server code alike. The actual
 * demo data and logic live in `demo.ts`, which is server-only.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}
