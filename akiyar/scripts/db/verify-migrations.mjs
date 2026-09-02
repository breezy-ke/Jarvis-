/**
 * Runs every migration, in order, against a real Postgres — before they are
 * ever pointed at the campaign's actual database.
 *
 * WHY THIS EXISTS. Migrations 0001-0010 were written over months and had never
 * been executed. Not once, against anything. This machine has no Docker, no
 * psql and no Supabase CLI, so "run the SQL and see" was not available, and the
 * plan was to discover whether a year of schema work was correct by running it
 * against the live project on the day it mattered. A migration that fails
 * halfway leaves a database in neither the old shape nor the new one.
 *
 * PGlite is Postgres itself compiled to WebAssembly — the real parser, the real
 * planner, the real constraint machinery — running in this Node process with
 * nothing to install. If the SQL is wrong, it is wrong here too.
 *
 * WHAT THIS PROVES: that the DDL parses, that objects are created in a workable
 * order, that constraints and views build, and that the geography seed loads
 * and still matches the IEBC totals it claims.
 *
 * WHAT IT CANNOT PROVE: that RLS denies what it should. Policies are created,
 * but PGlite runs everything as a single superuser, so a policy's effect is
 * never exercised. That has to be tested against a real project with real anon
 * and authenticated keys — the run says so at the end rather than letting a
 * green screen imply otherwise.
 *
 * Run: npm run db:verify
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIGRATIONS = path.join(root, "supabase/migrations");
const SEED = path.join(root, "supabase/seed");

/*
  The Supabase shim.

  Supabase supplies an `auth` schema, an `auth.uid()` that reads the request's
  JWT, and the three roles its API layer connects as. None of that is part of
  Postgres, so a bare instance has to be given them or every policy in 0006
  fails to parse. These are deliberately the thinnest possible stand-ins: the
  job is to compile the real migrations, not to reimplement Supabase.
*/
const SHIM = [
  "create schema if not exists auth;",
  "create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text unique);",
  // Supabase reads the subject claim from the request JWT. Here it reads a
  // session setting, so a test can impersonate a staff member if it needs to.
  "create or replace function auth.uid() returns uuid language sql stable as $shim$",
  "  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid",
  "$shim$;",
  "do $shim$ begin create role anon; exception when duplicate_object then null; end $shim$;",
  "do $shim$ begin create role authenticated; exception when duplicate_object then null; end $shim$;",
  "do $shim$ begin create role service_role; exception when duplicate_object then null; end $shim$;",
].join("\n");

const ok = (s) => `\x1b[32m${s}\x1b[0m`;
const bad = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

async function runAll(db, dir, label) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await readFile(path.join(dir, file), "utf8");
    const started = Date.now();
    try {
      await db.exec(sql);
      console.log(`${ok("ok")}   ${label}${file} ${dim(`${Date.now() - started}ms`)}`);
    } catch (error) {
      console.log(`${bad("FAIL")} ${label}${file}`);
      for (const line of String(error.message).split("\n").slice(0, 4)) {
        console.log(`       ${bad(line)}`);
      }
      /* Stop at the first failure. Everything after it fails for reasons this
         one caused, and a screen of cascading noise hides the actual cause. */
      console.log(`\n${bad("stopped at the first failure")} — nothing after it was attempted.\n`);
      process.exit(1);
    }
  }
}

/** What actually landed. Counts, not vibes. */
async function report(db) {
  const q = async (sql) => (await db.query(sql)).rows;

  const [o] = await q(`
    select
      (select count(*) from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE') as tables,
      (select count(*) from information_schema.views
        where table_schema = 'public') as views,
      (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public') as functions,
      (select count(*) from pg_policies where schemaname = 'public') as policies,
      (select count(*) from pg_class
        where relrowsecurity and relnamespace = 'public'::regnamespace) as rls_tables
  `);
  console.log(
    `\n${dim("built: ")} ${o.tables} tables, ${o.views} views, ${o.functions} functions, ` +
      `${o.policies} policies across ${o.rls_tables} RLS-enabled tables`,
  );

  /* The seed's own claim, checked. The README states the ward totals sum to the
     official IEBC county figure; if a row was mistyped, this is where it shows. */
  const [g] = await q(`
    select
      (select count(*) from constituencies) as constituencies,
      (select count(*) from wards) as wards,
      (select count(*) from polling_stations) as stations,
      (select coalesce(sum(registered_voters), 0) from wards) as ward_voters
  `);
  const EXPECTED_VOTERS = 238528;
  const voters = Number(g.ward_voters);
  console.log(
    `${dim("seeded:")} ${g.constituencies} constituencies, ${g.wards} wards, ${g.stations} polling stations`,
  );
  console.log(
    `${dim("voters:")} ${voters.toLocaleString()} ` +
      (voters === EXPECTED_VOTERS
        ? ok("= the official IEBC county total")
        : bad(`!= expected ${EXPECTED_VOTERS.toLocaleString()} — the seed has drifted`)),
  );

  /* A view reading an empty supporters table should return a row per ward with
     zeroes, not no rows at all. Getting that wrong makes a fresh dashboard look
     broken rather than empty. */
  const [sat] = await q(`select count(*) as n from ward_saturation`);
  console.log(
    `${dim("views: ")} ward_saturation returns ${sat.n} rows on an empty register ` +
      (Number(sat.n) === Number(g.wards)
        ? ok("(one per ward, correct)")
        : bad(`(expected ${g.wards}, one per ward)`)),
  );
}

async function main() {
  const db = await PGlite.create({ extensions: { pgcrypto, pg_trgm, citext } });

  const [v] = (await db.query("select version()")).rows;
  console.log(`\n${dim(v.version.split(",")[0])}\n`);

  await db.exec(SHIM);
  console.log(`${ok("ok")}   supabase shim — auth schema, auth.uid(), three roles\n`);

  await runAll(db, MIGRATIONS, "");
  console.log();
  await runAll(db, SEED, "seed/");

  await report(db);
  console.log(`\n${ok("every migration and seed applied")}\n`);
  console.log(
    dim(
      "RLS is created here but never exercised: PGlite runs as one superuser, so\n" +
        "this says the policies compile, not that they deny. Prove that against a\n" +
        "real project with real anon and authenticated keys.\n",
    ),
  );
}

main().catch((error) => {
  console.error(`\n${bad("harness error")}\n`, error);
  process.exit(1);
});
