import "server-only";
import demoData from "./demoData.json";
import {
  normalizeKenyanPhone,
  formatPhoneForDisplay,
  generateReferralCode,
} from "@/lib/validation";

/**
 * In-memory demo engine.
 *
 * Holds the real Turkana geography (6 constituencies, 30 wards with real
 * registered voters, 559 real stations) plus a store of sample supporters, so
 * every screen in the app is fully interactive without a database. A sign-up
 * done in the browser is added to the store and shows up on the dashboard.
 *
 * This is sample data for demonstration. Nothing here is a real supporter.
 */

type Con = { id: number; name: string };
type Ward = { id: number; name: string; constituency_id: number; registered_voters: number };
type Sta = { id: number; name: string; iebc_code: string; ward_id: number };

const data = demoData as { constituencies: Con[]; wards: Ward[]; stations: Sta[] };

const wardById = new Map(data.wards.map((w) => [w.id, w]));
const conById = new Map(data.constituencies.map((c) => [c.id, c]));
const stationById = new Map(data.stations.map((s) => [s.id, s]));
const stationsByWard = new Map<number, Sta[]>();
for (const s of data.stations) {
  const arr = stationsByWard.get(s.ward_id) ?? [];
  arr.push(s);
  stationsByWard.set(s.ward_id, arr);
}

type Supporter = {
  id: string;
  full_name: string;
  phone: string;
  ward_id: number;
  polling_station_id: number;
  village: string | null;
  top_issue: string | null;
  second_issue: string | null;
  pledge: string | null;
  heard_via: string | null;
  verification_status: "unverified" | "otp_verified";
  referral_code: string;
  referred_by: string | null;
  created_at: string;
};

// The store, and a live OTP code per pending supporter.
const supporters: Supporter[] = [];
const pendingCodes = new Map<string, string>();

/* ------------------------------------------------------- deterministic seed */

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Akai", "Ekiru", "Nakiru", "Lokwang", "Apua", "Esuguru", "Akiru", "Lokaale",
  "Nawoi", "Ngasike", "Emuria", "Lomongin", "Ateyo", "Lopeyok", "Ekaale",
  "Nakol", "Lokaal", "Ikai", "Amuria", "Lochoro", "Napeyok", "Eregae",
];
const LAST = [
  "Lokwawi", "Ekiru", "Lomeri", "Ewoi", "Lokol", "Nakwawi", "Emathe", "Lopeyok",
  "Ngikadeli", "Aramproi", "Etabo", "Lorot", "Ekidor", "Lokeris", "Nyang'a",
];
const ISSUES = ["jobs", "water", "education", "livestock", "health", "security", "oversight"];
const ISSUE_WEIGHT = [26, 24, 16, 12, 9, 8, 5]; // jobs + water lead
const PLEDGES = ["vote_only", "spread_word", "attend_events", "volunteer"];
const PLEDGE_WEIGHT = [46, 28, 16, 10];
const SOURCES = ["friend_family", "baraza", "whatsapp", "social_media", "radio", "agent"];
const SOURCE_WEIGHT = [34, 22, 18, 14, 7, 5];

function weighted(rng: () => number, items: string[], weights: number[]): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Seed each ward with a plausible, varied number of verified supporters so the
// saturation map has cold, warm and strong wards to read.
function seed() {
  if (supporters.length) return;
  const rng = mulberry32(4242);
  let idn = 1;
  const now = Date.now();

  for (const w of data.wards) {
    const wardStations = stationsByWard.get(w.id) ?? [];
    if (!wardStations.length) continue;
    // Saturation 0.2%–5.5%, uneven across wards.
    const pct = Math.pow(rng(), 1.7) * 5.5 + 0.2;
    const count = Math.max(2, Math.round((pct / 100) * w.registered_voters));
    for (let i = 0; i < count; i++) {
      const st = wardStations[Math.floor(rng() * wardStations.length)];
      const issue = weighted(rng, ISSUES, ISSUE_WEIGHT);
      supporters.push({
        id: "demo-" + idn++,
        full_name: FIRST[Math.floor(rng() * FIRST.length)] + " " + LAST[Math.floor(rng() * LAST.length)],
        phone: "+2547" + String(10000000 + Math.floor(rng() * 89999999)),
        ward_id: w.id,
        polling_station_id: st.id,
        village: null,
        top_issue: issue,
        second_issue: rng() < 0.4 ? weighted(rng, ISSUES, ISSUE_WEIGHT) : null,
        pledge: weighted(rng, PLEDGES, PLEDGE_WEIGHT),
        heard_via: weighted(rng, SOURCES, SOURCE_WEIGHT),
        verification_status: "otp_verified",
        referral_code: generateReferralCode(rng),
        // The seeded base predates the referral loop, so none of them were
        // recruited by anyone. Live sign-ups are what fill this in.
        referred_by: null,
        // spread across the last ~40 days
        created_at: new Date(now - Math.floor(rng() * 40 * 864e5)).toISOString(),
      });
    }
  }
}
seed();

/* --------------------------------------------------------------- geography */

export function demoConstituencies() {
  return data.constituencies.map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
}
export function demoWards(constituencyId: number) {
  return data.wards
    .filter((w) => w.constituency_id === constituencyId)
    .map((w) => ({ id: w.id, name: w.name, constituency_id: w.constituency_id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function demoStations(wardId: number) {
  return (stationsByWard.get(wardId) ?? [])
    .map((s) => ({ id: s.id, name: s.name, iebc_code: s.iebc_code, registered_voters: null as number | null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------------------------------------------------------------- sign-up */

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string; fieldErrors?: Record<string, string> };

export function demoSubmit(input: {
  fullName: string;
  phone: string;
  wardId: unknown;
  pollingStationId: unknown;
  village?: string;
  topIssue?: string;
  secondIssue?: string;
  pledge?: string;
  heardVia?: string;
  referralCode?: string;
}): Ok<{ supporterId: string; phoneDisplay: string; devCode?: string }> | Err {
  const phone = normalizeKenyanPhone(input.phone);
  if (!input.fullName || input.fullName.trim().split(/\s+/).length < 2) {
    return { ok: false, error: "Some details need fixing.", fieldErrors: { fullName: "Include a first and last name." } };
  }
  if (!phone) {
    return { ok: false, error: "Some details need fixing.", fieldErrors: { phone: "Enter a Kenyan mobile number." } };
  }
  const wardId = Number(input.wardId);
  const stationId = Number(input.pollingStationId);
  if (!wardById.has(wardId)) return { ok: false, error: "Choose your ward." };
  if (!stationById.has(stationId)) return { ok: false, error: "Choose your polling station." };

  if (supporters.some((s) => s.phone === phone && s.verification_status !== "unverified")) {
    return { ok: false, error: "This number is already on the register. One person, one number." };
  }

  // Mirrors resolve_referral_code: verified owners only, so a code cannot be
  // spent before its owner has proved their own number and nobody can refer
  // themselves. An unknown code is ignored rather than blocking the sign-up.
  const enteredReferral = input.referralCode?.trim().toUpperCase();
  const referredBy = enteredReferral
    ? (supporters.find(
        (s) => s.referral_code === enteredReferral && s.verification_status === "otp_verified",
      )?.id ?? null)
    : null;

  const id = "demo-live-" + (supporters.length + 1) + "-" + Date.now();
  supporters.push({
    id,
    full_name: input.fullName.trim(),
    phone,
    ward_id: wardId,
    polling_station_id: stationId,
    village: input.village?.trim() || null,
    top_issue: input.topIssue || null,
    second_issue: input.secondIssue || null,
    pledge: input.pledge || null,
    heard_via: input.heardVia || null,
    verification_status: "unverified",
    referral_code: generateReferralCode(),
    referred_by: referredBy,
    created_at: new Date().toISOString(),
  });

  const code = String(Math.floor(100000 + Math.random() * 899999));
  pendingCodes.set(id, code);
  // devCode is surfaced on screen, standing in for the SMS.
  return { ok: true, data: { supporterId: id, phoneDisplay: formatPhoneForDisplay(phone), devCode: code } };
}

export function demoVerify(
  supporterId: string,
  code: string,
): Ok<{ fullName: string; referralCode: string; wardName: string; stationName: string }> | Err {
  const expected = pendingCodes.get(supporterId);
  if (!expected) return { ok: false, error: "That code has expired. Ask for a new one." };
  if (code !== expected) return { ok: false, error: "That code is not right. Check your SMS." };

  const s = supporters.find((x) => x.id === supporterId);
  if (!s) return { ok: false, error: "We could not find that registration." };
  s.verification_status = "otp_verified";
  pendingCodes.delete(supporterId);

  return {
    ok: true,
    data: {
      fullName: s.full_name,
      referralCode: s.referral_code,
      wardName: wardById.get(s.ward_id)?.name ?? "",
      stationName: stationById.get(s.polling_station_id)?.name ?? "",
    },
  };
}

export function demoResend(supporterId: string): Ok<{ devCode?: string }> | Err {
  const s = supporters.find((x) => x.id === supporterId);
  if (!s) return { ok: false, error: "We could not find that registration." };
  const code = String(Math.floor(100000 + Math.random() * 899999));
  pendingCodes.set(supporterId, code);
  return { ok: true, data: { devCode: code } };
}

/* --------------------------------------------------------------- dashboard */

const verified = () => supporters.filter((s) => s.verification_status === "otp_verified");

export function demoVerifiedCount() {
  return verified().length;
}

export function demoCountySummary() {
  const v = verified();
  const totalReg = data.wards.reduce((a, w) => a + w.registered_voters, 0);
  const wardSat = demoWardSaturation();
  const weekAgo = Date.now() - 7 * 864e5;
  return {
    verified_supporters: v.length,
    awaiting_verification: supporters.filter((s) => s.verification_status === "unverified").length,
    registered_voters: totalReg,
    saturation_pct: totalReg ? Math.round((10000 * v.length) / totalReg) / 100 : 0,
    cold_wards: wardSat.filter((w) => w.status === "cold").length,
    open_flags: 0,
    verified_last_7d: v.filter((s) => new Date(s.created_at).getTime() > weekAgo).length,
  };
}

export function demoWardSaturation() {
  const v = verified();
  const byWard = new Map<number, number>();
  const pendByWard = new Map<number, number>();
  for (const s of v) byWard.set(s.ward_id, (byWard.get(s.ward_id) ?? 0) + 1);
  for (const s of supporters.filter((x) => x.verification_status === "unverified"))
    pendByWard.set(s.ward_id, (pendByWard.get(s.ward_id) ?? 0) + 1);

  return data.wards.map((w) => {
    const ver = byWard.get(w.id) ?? 0;
    const pct = w.registered_voters ? Math.round((10000 * ver) / w.registered_voters) / 100 : null;
    const status =
      pct == null ? "unknown" : pct < 3 ? "cold" : pct < 8 ? "needs_work" : pct < 15 ? "holding" : "strong";
    return {
      ward_id: w.id,
      ward_name: w.name,
      constituency_name: conById.get(w.constituency_id)?.name ?? "",
      registered_voters: w.registered_voters as number | null,
      verified_supporters: ver,
      pending_supporters: pendByWard.get(w.id) ?? 0,
      saturation_pct: pct,
      status: status as "cold" | "needs_work" | "holding" | "strong" | "unknown",
      exceeds_denominator: false,
    };
  });
}

export function demoRecent() {
  return [...supporters]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 12)
    .map((s) => ({
      id: s.id,
      full_name: s.full_name,
      verification_status: s.verification_status,
      created_at: s.created_at,
      wards: { name: wardById.get(s.ward_id)?.name ?? "—" },
      polling_stations: { name: stationById.get(s.polling_station_id)?.name ?? "—" },
    }));
}

function distribution(field: "top_issue" | "pledge" | "heard_via") {
  const v = verified().filter((s) => s[field]);
  const counts = new Map<string, number>();
  for (const s of v) counts.set(s[field]!, (counts.get(s[field]!) ?? 0) + 1);
  const total = v.length || 1;
  return [...counts.entries()]
    .map(([label, supportersN]) => ({
      label,
      supporters: supportersN,
      share_pct: Math.round((1000 * supportersN) / total) / 10,
    }))
    .sort((a, b) => b.supporters - a.supporters);
}
export const demoIssues = () => distribution("top_issue");
export const demoPledges = () => distribution("pledge");
export const demoSources = () => distribution("heard_via");

export function demoExportRows() {
  return verified().map((s) => ({
    full_name: s.full_name,
    phone: s.phone,
    ward: wardById.get(s.ward_id)?.name ?? "",
    station: stationById.get(s.polling_station_id)?.name ?? "",
    village: s.village ?? "",
    status: s.verification_status,
    referral_code: s.referral_code,
    created_at: s.created_at,
  }));
}

export function demoReferralReach() {
  const v = verified();
  const recruited = v.filter((s) => s.referred_by).length;
  return {
    recruited,
    share_pct: v.length ? Math.round((recruited / v.length) * 1000) / 10 : null,
  };
}

export function demoGroundTeam() {
  const v = verified().filter((s) => s.pledge && s.pledge !== "vote_only");
  const byWard = new Map<number, { volunteers: number; event_goers: number; sharers: number; total: number }>();
  for (const s of v) {
    const row = byWard.get(s.ward_id) ?? { volunteers: 0, event_goers: 0, sharers: 0, total: 0 };
    if (s.pledge === "volunteer") row.volunteers++;
    else if (s.pledge === "attend_events") row.event_goers++;
    else if (s.pledge === "spread_word") row.sharers++;
    row.total++;
    byWard.set(s.ward_id, row);
  }
  return [...byWard.entries()]
    .map(([wid, r]) => ({
      ward_name: wardById.get(wid)?.name ?? "—",
      volunteers: r.volunteers,
      event_goers: r.event_goers,
      sharers: r.sharers,
      total_willing: r.total,
    }))
    .sort((a, b) => b.total_willing - a.total_willing);
}
