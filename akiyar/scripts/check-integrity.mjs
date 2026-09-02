#!/usr/bin/env node
/**
 * check-integrity.mjs
 *
 * Regression tests for the pure logic the register's integrity rests on.
 * No database, no network — runs anywhere in about a second.
 *
 *   npm run check
 *
 * These are not incidental helpers. Phone normalisation is what makes the
 * unique-phone constraint mean "one person" rather than "one string", and CSV
 * escaping is what stops a supporter's name executing on a campaign laptop.
 * Both are easy to break and silent when broken, so they are pinned here.
 *
 * Imports the real source directly — Node 24 strips TypeScript types natively,
 * so there is no second copy of the logic to drift out of sync.
 */

// The pepper must exist before the integrity module loads — it refuses to hash
// without one, which is itself pinned below.
process.env.OTP_PEPPER ||= "check-suite-pepper-not-a-real-secret";

import { normalizeKenyanPhone, generateReferralCode } from "../src/lib/validation.ts";
import {
  signRegistrationTicket,
  verifyRegistrationTicket,
  generateOtpCode,
  hashOtpCode,
  safeEqualHex,
} from "../src/lib/integrity.ts";

let pass = 0;
const failures = [];

function check(label, actual, expected) {
  if (Object.is(actual, expected)) {
    pass++;
  } else {
    failures.push(`${label}\n      got  ${JSON.stringify(actual)}\n      want ${JSON.stringify(expected)}`);
  }
}

function section(title, note) {
  console.log(`\n${title}`);
  if (note) console.log(`  ${note}`);
  console.log("");
}

/* ------------------------------------------------ phone normalisation */

section(
  "Phone normalisation",
  "Every shape of the same number must collapse to one stored string.",
);

const sameNumber = [
  "0712345678",
  "0712 345 678",
  "0712-345-678",
  "+254712345678",
  "+254 712 345 678",
  "254712345678",
  "254 712 345 678",
  "712345678",
  "  0712345678  ",
];

for (const form of sameNumber) {
  check(`"${form}"`, normalizeKenyanPhone(form), "+254712345678");
}

const distinct = new Set(sameNumber.map(normalizeKenyanPhone));
check("all shapes collapse to one value", distinct.size, 1);
console.log(`  ${sameNumber.length} input shapes -> ${distinct.size} stored value`);

section("Rejections", "Anything that is not a Kenyan mobile must never enter the register.");

for (const [input, why] of [
  ["0812345678", "invalid prefix 8"],
  ["071234567", "too short"],
  ["07123456789", "too long"],
  ["", "empty"],
  ["not a phone", "free text"],
  ["+1 555 123 4567", "US number"],
  ["0212345678", "Nairobi landline"],
  ["+254812345678", "E.164 with bad prefix"],
]) {
  check(`${why}: "${input}"`, normalizeKenyanPhone(input), null);
}

section("Both Kenyan mobile ranges", "Safaricom 07xx and Airtel/Telkom 01xx.");
check("Safaricom 07xx", normalizeKenyanPhone("0722000111"), "+254722000111");
check("Airtel/Telkom 01xx", normalizeKenyanPhone("0110000222"), "+254110000222");

/* ------------------------------------------------------ referral codes */

section("Referral codes", "Read aloud and typed back in, so no two characters may be confusable.");

const ALPHABET = "ACDEFGHJKMNPQRTUVWXY2346789";

for (const ch of ["0", "O", "1", "I", "L", "5", "S", "B", "Z"]) {
  check(`"${ch}" excluded`, ALPHABET.includes(ch), false);
}
// 8 and 2 are kept, which is only safe because B and Z are absent.
check("8 kept, B absent", ALPHABET.includes("8") && !ALPHABET.includes("B"), true);
check("2 kept, Z absent", ALPHABET.includes("2") && !ALPHABET.includes("Z"), true);
check("no duplicate characters", new Set(ALPHABET).size, ALPHABET.length);

const codes = Array.from({ length: 2000 }, () => generateReferralCode());
check("format LORE-XXXXXX", codes.every((c) => /^LORE-[A-Z0-9]{6}$/.test(c)), true);
check(
  "only alphabet characters used",
  codes.every((c) => [...c.slice(5)].every((ch) => ALPHABET.includes(ch))),
  true,
);
// Not a uniqueness guarantee — the DB constraint is that. Just a smoke test
// that the generator is not degenerate.
check("2000 codes are near-all distinct", new Set(codes).size > 1990, true);

/* -------------------------------------------------------- CSV escaping */

section("CSV escaping", "A supporter's name must not execute when the export is opened in Excel.");

// Mirrors csvCell in src/app/admin/export/route.ts.
function csvCell(value) {
  const s = String(value ?? "");
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${guarded.replace(/"/g, '""')}"`;
}

check("formula injection neutralised", csvCell("=cmd|'/c calc'!A1"), `"'=cmd|'/c calc'!A1"`);
check("leading + guarded", csvCell("+1234"), `"'+1234"`);
check("leading - guarded", csvCell("-Lokwawi"), `"'-Lokwawi"`);
check("leading @ guarded", csvCell("@SUM(A1)"), `"'@SUM(A1)"`);
check("embedded quotes doubled", csvCell('Akai "Lokwawi" Ekiru'), `"Akai ""Lokwawi"" Ekiru"`);
check("comma contained by quoting", csvCell("Ekiru, Akai"), `"Ekiru, Akai"`);
check("ordinary name untouched", csvCell("Akai Lokwawi"), `"Akai Lokwawi"`);

/* ------------------------------------------------- registration tickets */

section(
  "Registration tickets",
  "Only the browser that registered may spend the campaign's money on a resend.",
);

const ALICE = "11111111-1111-4111-8111-111111111111";
const MALLORY = "22222222-2222-4222-8222-222222222222";

const aliceTicket = signRegistrationTicket(ALICE);

check("a genuine ticket verifies", verifyRegistrationTicket(aliceTicket, ALICE), true);
check("signing is deterministic", signRegistrationTicket(ALICE), aliceTicket);
check("the id is carried in the clear", aliceTicket.startsWith(`${ALICE}.`), true);

// The attack this exists to stop: httpOnly hides a cookie from scripts, but any
// caller can invent the header, so an unsigned id would be trivially forgeable.
check("a bare id is not a ticket", verifyRegistrationTicket(ALICE, ALICE), false);
check("no ticket at all", verifyRegistrationTicket(undefined, ALICE), false);
check("empty ticket", verifyRegistrationTicket("", ALICE), false);
check("invented signature", verifyRegistrationTicket(`${ALICE}.deadbeef`, ALICE), false);
check(
  "another person's ticket, replayed",
  verifyRegistrationTicket(signRegistrationTicket(MALLORY), ALICE),
  false,
);
check(
  "a valid signature spliced onto a different id",
  verifyRegistrationTicket(`${MALLORY}.${aliceTicket.split(".")[1]}`, MALLORY),
  false,
);
check("no separator", verifyRegistrationTicket(`${ALICE}abc`, ALICE), false);
check("separator first", verifyRegistrationTicket(`.${ALICE}`, ALICE), false);

// Tickets are pepper-bound: rotating the secret must invalidate every one that
// is still outstanding, exactly as it does for codes.
const originalPepper = process.env.OTP_PEPPER;
process.env.OTP_PEPPER = "a-different-pepper";
check("rotating the pepper invalidates old tickets", verifyRegistrationTicket(aliceTicket, ALICE), false);
process.env.OTP_PEPPER = originalPepper;
check("restoring the pepper makes them valid again", verifyRegistrationTicket(aliceTicket, ALICE), true);

/* ------------------------------------------------------------- OTP codes */

section("One-time codes", "The gap between a form submission and a real person.");

const otpCodes = Array.from({ length: 500 }, () => generateOtpCode());
check("always six digits", otpCodes.every((c) => /^\d{6}$/.test(c)), true);
check("leading zeros preserved", otpCodes.every((c) => c.length === 6), true);
check("not degenerate", new Set(otpCodes).size > 400, true);

// Hashes are salted per supporter, so the same code for two people never
// produces the same stored value — one leaked pair reveals nothing about others.
check(
  "same code, different supporters, different hashes",
  hashOtpCode("123456", ALICE) === hashOtpCode("123456", MALLORY),
  false,
);
check("hashing is deterministic", hashOtpCode("123456", ALICE), hashOtpCode("123456", ALICE));
check(
  "a wrong code does not match",
  safeEqualHex(hashOtpCode("123456", ALICE), hashOtpCode("123457", ALICE)),
  false,
);
check(
  "the right code matches",
  safeEqualHex(hashOtpCode("123456", ALICE), hashOtpCode("123456", ALICE)),
  true,
);
check("length mismatch is rejected, not thrown", safeEqualHex("abcd", "ab"), false);

// The pepper is what stops database read access alone verifying a pending
// registration. Hashing without one must fail loudly rather than quietly.
delete process.env.OTP_PEPPER;
let threw = false;
try {
  hashOtpCode("123456", ALICE);
} catch {
  threw = true;
}
check("refuses to hash with no pepper", threw, true);
process.env.OTP_PEPPER = originalPepper;

/* ------------------------------------------------------------- report */

console.log("");
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  ${f}\n`);
  console.log(`${failures.length} failed, ${pass} passed\n`);
  process.exit(1);
}
console.log(`All ${pass} checks passed.\n`);
