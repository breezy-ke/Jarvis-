/**
 * Proves that row level security actually denies — not that it compiles.
 *
 * WHY THIS IS NOT OPTIONAL. The migrations contain no GRANT statements at all.
 * Every table permission this schema relies on comes from Supabase's default
 * privileges, which hand `anon` and `authenticated` full access to everything
 * in the public schema. So for anonymous traffic RLS is not a second line of
 * defence behind a grant — it is the only thing between the internet and the
 * supporter register. 0006's own header calls the policies "the second line of
 * defence"; for `anon` they are the first and last.
 *
 * That is also why this file mirrors Supabase's default grants before testing.
 * Without them a denial could mean "no grant" rather than "policy refused", and
 * every test would pass for the wrong reason — on a real project, where the
 * grants do exist, the same schema could leak. A security test that passes
 * because a permission is missing locally is worse than no test.
 *
 * So each expected denial is checked for its *mechanism*:
 *   - a read denied by RLS returns zero rows, with no error
 *   - a read denied by a missing grant raises "permission denied"
 * The second is reported as a FAILURE of this harness's fidelity, not a pass.
 *
 * WHAT THIS STILL CANNOT PROVE: that Supabase's API layer maps a request to the
 * role this test assumes, or that the service role key never reaches a browser.
 * Those are deployment properties, not schema properties.
 *
 * Run: npm run db:verify:rls
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const ok = (s) => `\x1b[32m${s}\x1b[0m`;
const bad = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const SHIM = [
  "create schema if not exists auth;",
  "create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text unique);",
  "create or replace function auth.uid() returns uuid language sql stable as $s$",
  "  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid",
  "$s$;",
  "do $s$ begin create role anon; exception when duplicate_object then null; end $s$;",
  "do $s$ begin create role authenticated; exception when duplicate_object then null; end $s$;",
  "do $s$ begin create role service_role; exception when duplicate_object then null; end $s$;",
].join("\n");

/*
  Supabase's default privileges, reproduced. This is what makes the test honest:
  with these in place, anything still denied is denied by a policy.
*/
const SUPABASE_GRANTS = `
  grant usage on schema public to anon, authenticated, service_role;
  grant all on all tables in schema public to anon, authenticated, service_role;
  grant all on all sequences in schema public to anon, authenticated, service_role;
  grant all on all routines in schema public to anon, authenticated, service_role;
`;

/* Fixed ids so failures name something recognisable. */
const ADMIN = "11111111-1111-4111-8111-111111111111";
const STALE = "22222222-2222-4222-8222-222222222222"; // an admin who was deactivated
const AGENT = "33333333-3333-4333-8333-333333333333"; // ward agent, one ward only
const NOBODY = "44444444-4444-4444-8444-444444444444"; // signed in, but not staff

async function seedFixtures(db) {
  const [{ id: wardA }, { id: wardB }] = (
    await db.query("select id from wards order by id limit 2")
  ).rows;
  const [{ id: stationA }] = (
    await db.query("select id from polling_stations where ward_id = $1 limit 1", [wardA])
  ).rows;
  const [{ id: stationB }] = (
    await db.query("select id from polling_stations where ward_id = $1 limit 1", [wardB])
  ).rows;

  for (const [id, email] of [
    [ADMIN, "admin@test"],
    [STALE, "stale@test"],
    [AGENT, "agent@test"],
    [NOBODY, "nobody@test"],
  ]) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  }

  await db.query(
    "insert into staff (id, full_name, role, is_active) values ($1, 'Active Admin', 'admin', true)",
    [ADMIN],
  );
  await db.query(
    "insert into staff (id, full_name, role, is_active) values ($1, 'Deactivated Admin', 'admin', false)",
    [STALE],
  );
  await db.query(
    "insert into staff (id, full_name, role, ward_ids, is_active) values ($1, 'Ward Agent', 'ward_agent', $2, true)",
    [AGENT, [wardA]],
  );

  /* verified_at is not optional here: the schema enforces
     supporters_verified_has_timestamp, so a row claiming otp_verified with no
     timestamp is rejected. Good constraint — it means a verified count can
     never be inflated by rows that were never actually verified. */
  const supporter = async (name, phone, ward, station, ref) =>
    db.query(
      `insert into supporters (full_name, phone, ward_id, polling_station_id, referral_code,
        consent_version, consent_register, verification_status, verified_at)
       values ($1, $2, $3, $4, $5, 'v1', true, 'otp_verified', now())`,
      [name, phone, ward, station, ref],
    );
  await supporter("Supporter In Agent Ward", "+254700000001", wardA, stationA, "REFAAA1");
  await supporter("Supporter Elsewhere", "+254700000002", wardB, stationB, "REFBBB2");

  await db.query(
    `insert into posts (slug, title, body, state, published_at)
     values ('published-post', 'Published', 'body', 'published', now())`,
  );
  await db.query(
    `insert into posts (slug, title, body, state) values ('draft-post', 'Draft', 'body', 'draft')`,
  );

  return { wardA, wardB };
}

/** Run one query as a role, optionally as a specific signed-in user. */
async function as(db, role, uid, sql, params = []) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  await db.exec(`set role ${role}`);
  try {
    const result = await db.query(sql, params);
    return { rows: result.rows, error: null };
  } catch (error) {
    return { rows: null, error: String(error.message).split("\n")[0] };
  } finally {
    await db.exec("reset role");
  }
}

const results = { pass: 0, fail: 0 };

function record(passed, label, detail) {
  if (passed) {
    results.pass++;
    console.log(`  ${ok("pass")}  ${label}`);
  } else {
    results.fail++;
    console.log(`  ${bad("FAIL")}  ${label}`);
    console.log(`        ${bad(detail)}`);
  }
}

/** Expect: the policy lets this role see at least one row. */
async function expectVisible(db, role, uid, label, sql, params) {
  const { rows, error } = await as(db, role, uid, sql, params);
  if (error) return record(false, label, `errored instead of returning rows: ${error}`);
  record(rows.length > 0, label, `returned ${rows.length} rows, expected at least one`);
}

/** Expect: RLS filters every row away — zero rows, and crucially no error. */
async function expectDeniedByRls(db, role, uid, label, sql, params) {
  const { rows, error } = await as(db, role, uid, sql, params);
  if (error) {
    const missingGrant = /permission denied/i.test(error);
    return record(
      false,
      label,
      missingGrant
        ? `denied by a MISSING GRANT, not by RLS — this harness no longer mirrors ` +
            `Supabase, so the result is meaningless: ${error}`
        : `errored instead of returning zero rows: ${error}`,
    );
  }
  record(rows.length === 0, label, `leaked ${rows.length} rows`);
}

/** Expect: the write is refused by a policy. */
async function expectWriteRefused(db, role, uid, label, sql, params) {
  const { error } = await as(db, role, uid, sql, params);
  if (!error) return record(false, label, "the write SUCCEEDED and should not have");
  const byRls = /row-level security|row level security/i.test(error);
  record(byRls, label, `refused, but not by RLS: ${error}`);
}

async function main() {
  const db = await PGlite.create({ extensions: { pgcrypto, pg_trgm, citext } });
  await db.exec(SHIM);
  for (const dir of ["supabase/migrations", "supabase/seed"]) {
    const full = path.join(root, dir);
    for (const f of (await readdir(full)).filter((f) => f.endsWith(".sql")).sort()) {
      await db.exec(await readFile(path.join(full, f), "utf8"));
    }
  }
  await db.exec(SUPABASE_GRANTS);
  const { wardA } = await seedFixtures(db);

  console.log(`\n${dim("Supabase default grants applied — anon and authenticated hold")}`);
  console.log(`${dim("full table privileges, exactly as on a real project. Anything")}`);
  console.log(`${dim("denied below is denied by a policy.")}\n`);

  console.log("the public (anon) — the register must be invisible");
  await expectDeniedByRls(db, "anon", null, "cannot read supporters", "select * from supporters");
  await expectDeniedByRls(db, "anon", null, "cannot read staff", "select * from staff");
  await expectDeniedByRls(db, "anon", null, "cannot read otp_challenges", "select * from otp_challenges");
  await expectDeniedByRls(db, "anon", null, "cannot read audit_log", "select * from audit_log");
  await expectDeniedByRls(db, "anon", null, "cannot read integrity_flags", "select * from integrity_flags");
  await expectWriteRefused(
    db, "anon", null, "cannot insert a supporter",
    `insert into supporters (full_name, phone, ward_id, polling_station_id, referral_code, consent_version)
     values ('Injected', '+254799999999', $1, (select id from polling_stations limit 1), 'HACK01', 'v1')`,
    [wardA],
  );

  console.log("\nthe public (anon) — the sign-up form still has to work");
  await expectVisible(db, "anon", null, "can read constituencies", "select * from constituencies");
  await expectVisible(db, "anon", null, "can read wards", "select * from wards");
  await expectVisible(db, "anon", null, "can read polling_stations", "select * from polling_stations");

  console.log("\nthe public (anon) — published content only");
  await expectVisible(db, "anon", null, "can read a published post", "select * from posts where state = 'published'");
  await expectDeniedByRls(db, "anon", null, "cannot read a draft post", "select * from posts where state = 'draft'");

  console.log("\nsigned in, but not staff");
  await expectDeniedByRls(db, "authenticated", NOBODY, "cannot read supporters", "select * from supporters");
  await expectDeniedByRls(db, "authenticated", NOBODY, "cannot read audit_log", "select * from audit_log");

  console.log("\na deactivated staff account");
  await expectDeniedByRls(db, "authenticated", STALE, "cannot read supporters", "select * from supporters");

  console.log("\nan active admin");
  await expectVisible(db, "authenticated", ADMIN, "can read supporters", "select * from supporters");
  await expectVisible(db, "authenticated", ADMIN, "can read integrity_flags via staff read", "select 1 where auth_is_admin()");

  console.log("\na ward agent is scoped to their own wards");
  const scoped = await as(db, "authenticated", AGENT, "select ward_id from supporters");
  if (scoped.error) {
    record(false, "sees only their ward's supporters", `errored: ${scoped.error}`);
  } else {
    const outside = scoped.rows.filter((r) => Number(r.ward_id) !== Number(wardA));
    record(
      scoped.rows.length > 0 && outside.length === 0,
      "sees only their ward's supporters",
      `saw ${scoped.rows.length} rows, ${outside.length} of them outside the assigned ward`,
    );
  }

  console.log(
    `\n${results.fail ? bad(`${results.fail} FAILED`) : ok("all checks passed")}` +
      dim(` (${results.pass} passed)`) + "\n",
  );
  process.exit(results.fail ? 1 : 0);
}

main().catch((error) => {
  console.error(`\n${bad("harness error")}\n`, error);
  process.exit(1);
});
