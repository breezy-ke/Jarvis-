import "server-only";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Integrity primitives.
 *
 * The register's whole value rests on the difference between "someone typed a
 * name into a form" and "a real voter at a known station said yes". Everything
 * here exists to widen that gap.
 */

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS_PER_HOUR = 5;

/**
 * Registrations allowed from one connection per hour.
 *
 * Set high on purpose. In Turkana one phone hotspot at a baraza may legitimately
 * carry dozens of sign-ups, and a limit that blocks a real rally costs the
 * campaign far more than it saves. This is aimed at a script, which would want
 * thousands, not at a crowd. Crossing it also raises a flag, so staff can tell
 * the two apart instead of the ceiling silently deciding.
 */
const MAX_REGISTRATIONS_PER_IP_PER_HOUR = 30;

/** Six digits, uniformly random from a CSPRNG. Never Math.random for this. */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** The server-side secret every hash here is salted with. Never optional. */
function requirePepper(): string {
  const pepper = process.env.OTP_PEPPER ?? "";
  if (!pepper) {
    throw new Error("OTP_PEPPER is not set. Refusing to hash with an empty pepper.");
  }
  return pepper;
}

/**
 * Codes are stored hashed and salted with a server-side pepper so that read
 * access to the database is not enough to verify a pending registration.
 */
export function hashOtpCode(code: string, supporterId: string): string {
  return createHash("sha256").update(`${supporterId}:${code}:${requirePepper()}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * One-way hash for provenance values we want to compare but never read back.
 *
 * Peppered for the same reason the codes are: an IP address or user-agent string
 * has a small enough space that an unsalted SHA-256 is reversible by brute force
 * in seconds, which would turn these columns into the plain identifiers they
 * exist to avoid storing. This used to fall back to an empty pepper silently —
 * hashes that looked fine and protected nothing.
 */
export function hashOpaque(value: string): string {
  return createHash("sha256").update(`${value}:${requirePepper()}`).digest("hex").slice(0, 32);
}

export const otpPolicy = {
  ttlMinutes: OTP_TTL_MINUTES,
  maxAttempts: OTP_MAX_ATTEMPTS,
  maxSendsPerHour: OTP_MAX_SENDS_PER_HOUR,
  maxRegistrationsPerIpPerHour: MAX_REGISTRATIONS_PER_IP_PER_HOUR,
};

/* --------------------------------------------------- registration tickets */

/**
 * Proof that this browser is the one that created a given registration.
 *
 * Resending a code costs the campaign real money and sends a real SMS to a real
 * person. Without this, the supporter id alone was enough to trigger one, so
 * anyone who obtained or guessed an id could make somebody's phone buzz on
 * repeat at the campaign's expense.
 *
 * The id travels in an httpOnly cookie, so it must be signed: httpOnly stops a
 * script *reading* the cookie, but nothing stops a caller inventing the header
 * outright. The HMAC is what makes the value unforgeable; the cookie is only
 * how it gets carried.
 */
export function signRegistrationTicket(supporterId: string): string {
  const mac = createHmac("sha256", requirePepper()).update(supporterId).digest("hex");
  return `${supporterId}.${mac}`;
}

export function verifyRegistrationTicket(ticket: string | undefined, supporterId: string): boolean {
  if (!ticket) return false;
  const separator = ticket.lastIndexOf(".");
  if (separator < 1) return false;

  const claimedId = ticket.slice(0, separator);
  if (claimedId !== supporterId) return false;

  const expected = createHmac("sha256", requirePepper()).update(claimedId).digest("hex");
  return safeEqualHex(ticket.slice(separator + 1), expected);
}

/* ------------------------------------------------------ volume throttling */

/**
 * How many registrations this connection has already produced this hour.
 *
 * Counts rows actually written rather than attempts, because a rejected
 * submission costs nothing — the expensive outcomes are the SMS and the polluted
 * ward count, and both only happen once a row exists.
 */
export async function registrationsFromIpLastHour(
  supabase: SupabaseClient,
  ipHash: string,
): Promise<number> {
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count, error } = await supabase
    .from("supporters")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gt("created_at", since);

  if (error) {
    // Fail open. A counting failure must not stop genuine people registering;
    // the per-phone OTP ceiling still applies underneath.
    console.error(`[integrity] ip rate check failed: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

/**
 * Records that a connection hit the ceiling, so a human can judge it.
 *
 * Flagged against the ward being registered into: "unusual volume in Kalokol"
 * is something a coordinator can go and check, and it satisfies the constraint
 * that every flag must point at something. Deliberately does not store the raw
 * address — only the hash the register already holds.
 */
export async function flagVolumeAnomaly(
  supabase: SupabaseClient,
  { ipHash, wardId, count }: { ipHash: string; wardId: number; count: number },
): Promise<void> {
  const { data: existing } = await supabase
    .from("integrity_flags")
    .select("id")
    .eq("ward_id", wardId)
    .eq("kind", "volume_anomaly")
    .eq("state", "open")
    .limit(1);

  if (existing?.length) return;

  const { error } = await supabase.from("integrity_flags").insert({
    kind: "volume_anomaly",
    ward_id: wardId,
    summary: `One connection produced ${count} registrations in this ward within an hour. Further sign-ups from it are being held.`,
    detail: { ip_hash: ipHash, registrations_last_hour: count },
  });

  if (error) console.error(`[integrity] volume flag failed: ${error.message}`);
}

/* ------------------------------------------------------------- detection */

/**
 * Near-duplicate check.
 *
 * The unique-phone constraint catches the same person registering twice with
 * the same number. It does nothing about the same person registering twice with
 * two numbers, which in a county where phones are shared is common and not
 * necessarily fraud. So this looks for a similar name in the same ward and
 * raises it for a human rather than blocking the registration.
 */
export async function flagPossibleDuplicate(
  supabase: SupabaseClient,
  supporter: { id: string; full_name: string; ward_id: number },
): Promise<void> {
  const { data, error } = await supabase.rpc("find_similar_supporters", {
    p_supporter_id: supporter.id,
    p_full_name: supporter.full_name,
    p_ward_id: supporter.ward_id,
    p_threshold: 0.55,
  });

  if (error) {
    console.error(`[integrity] duplicate scan failed: ${error.message}`);
    return;
  }

  const matches = (data ?? []) as Array<{ id: string; full_name: string; similarity: number }>;
  if (!matches.length) return;

  await supabase.from("integrity_flags").insert({
    kind: "possible_duplicate",
    supporter_id: supporter.id,
    summary: `"${supporter.full_name}" closely matches ${matches.length} existing record${
      matches.length === 1 ? "" : "s"
    } in the same ward.`,
    detail: { matches },
  });
}

/**
 * Denominator tripwire.
 *
 * Verified supporters in a ward can never legitimately exceed the number of
 * people registered to vote there. If they do, either the mapping is wrong or
 * the registrations are not real — both are worth stopping for. (Checked at ward
 * level because per-station registered-voter counts are not public.)
 */
export async function checkWardPlausibility(
  supabase: SupabaseClient,
  wardId: number,
): Promise<void> {
  const { data, error } = await supabase
    .from("ward_saturation")
    .select("ward_id, ward_name, registered_voters, verified_supporters, exceeds_denominator")
    .eq("ward_id", wardId)
    .single();

  if (error || !data) return;
  if (!data.exceeds_denominator) return;

  // Don't pile up identical flags for the same ward.
  const { data: existing } = await supabase
    .from("integrity_flags")
    .select("id")
    .eq("ward_id", wardId)
    .eq("kind", "exceeds_denominator")
    .eq("state", "open")
    .limit(1);

  if (existing?.length) return;

  await supabase.from("integrity_flags").insert({
    kind: "exceeds_denominator",
    ward_id: wardId,
    summary: `${data.ward_name} ward has ${data.verified_supporters} verified supporters against ${data.registered_voters} registered voters.`,
    detail: {
      registered_voters: data.registered_voters,
      verified_supporters: data.verified_supporters,
    },
  });
}
