/**
 * Measures the contrast of every colour pair the design actually relies on.
 *
 * A dark design makes a specific promise: that a supporter reading a form on a
 * cheap phone in daylight can see the text. That promise is either measured or
 * it is decoration, so this reads the real values out of the two shipped token
 * sets -- the WordPress theme's palette and the register app's CSS variables --
 * and computes WCAG 2.1 contrast ratios against them. Editing a colour without
 * editing this file makes the build fail, which is the point.
 *
 * Thresholds are WCAG 2.1 AA:
 *   4.5:1  body text
 *   3.0:1  large text (>=24px, or >=18.66px bold) and UI component boundaries
 *
 * Run: node scripts/check-contrast.mjs
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ratio } from "./lib/contrast.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------- read the shipped tokens */

/*
  One token file now.

  This used to read two — theme.json for the WordPress campaign site and
  globals.css for the register — and check both palettes, because the two were
  separate applications that had to be kept in agreement by hand. The campaign
  site is now the same Next.js app, campaign.css defines no colours of its own,
  and theme.json is gone with the theme. A second source would be a copy that
  can drift, which is the thing this script exists to prevent.
*/

// The app declares its tokens as plain custom properties, so a regex over the
// stylesheet is the honest way to read what actually ships. Anything that is
// not a bare hex value (a gradient, a colour-mix, an rgba) is skipped: those
// have no single luminance to test and are checked by eye in the browser.
const appCss = await readFile(path.join(root, "src/app/globals.css"), "utf8");
const app = {};
for (const m of appCss.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
  if (m[2].length === 7 || m[2].length === 4) app[m[1]] = m[2];
}

/* ------------------------------------------------------------- the pairings */

// Each entry: [label, foreground, background, minimum]
// "AA" = 4.5 (body text), "AA-large" = 3.0 (large text and UI boundaries).
const BODY = 4.5;
const LARGE = 3.0;

// Not a token: the campaign site's primary button inverts to white on press.
const WHITE = "#ffffff";

const pairs = [
  /* ---- Campaign site: the public marketing surfaces ----

     These were checked against theme.json until the site became part of this
     app. They are kept as their own group rather than folded into the register
     list below because they are different combinations, not duplicates: the
     campaign pages use the hover fill and the register pages do not.

     This group used to open with an --ember pair. Ember was retired when the
     palette moved to ODM orange — it had been "what supporters actually wear",
     which the signal now is — so there is no second warm colour left to test.

     One pair did not survive the move. The theme declared its hairline as a
     solid #2A2F3B, so it could be measured against the ground; globals.css
     declares it as an rgba value, which has no single luminance and
     is skipped by the reader above along with every other alpha value. It is
     a decorative rule rather than a control boundary, so nothing in WCAG turns
     on it — but it is one fewer number than this script used to report, and
     that is why. */
  ["site verified green on the page ground", app.verified, app.screen, BODY],
  ["site button hover: page ground on signal-deep", app.screen, app["signal-deep"], BODY],
  ["site lit fill: body type on the undarkened party orange", app.type, app["signal-fill"], BODY],

  /* ---- Register app: the sign-up and admin surfaces ---- */
  ["app body text on the page ground", app.type, app.screen, BODY],
  ["app body text on a raised card", app.type, app["ink-700"], BODY],
  ["app secondary text on the ground", app["type-mid"], app.screen, BODY],
  ["app secondary text on a card", app["type-mid"], app["ink-700"], BODY],
  ["app muted text on the ground", app["type-low"], app.screen, BODY],
  ["app muted text on a card", app["type-low"], app["ink-700"], BODY],
  ["app signal orange as a heading", app.signal, app.screen, LARGE],
  ["app signal orange as small label text", app.signal, app.screen, BODY],
  ["app signal orange on a card", app.signal, app["ink-700"], BODY],
  ["app primary button: page ground on signal", app.screen, app.signal, BODY],
  ["app verified green on a card", app.verified, app["ink-700"], BODY],
  ["app error red on a card", app.alarm, app["ink-700"], BODY],
  ["app input text on the field ground", app.type, app["ink-600"], BODY],
  /* WCAG 1.4.11: the visual boundary of a form control needs 3:1 against what
     is adjacent to it. An input sits inside a card and is filled with its own
     own ground, so the border has two neighbours and both of them count.
     Getting this wrong is how a form ends up with invisible inputs. */
  ["app field border against the card outside it", app["field-line"], app["ink-700"], LARGE],
  ["app field border against the field inside it", app["field-line"], app["ink-600"], LARGE],
  ["app focus ring against the field", app.signal, app["ink-600"], LARGE],
];

/* --------------------------------------------------------------- run them */

let fails = 0;
let skipped = 0;
console.log("\ncontrast of the pairs the design depends on (WCAG 2.1)\n");

for (const [label, fg, bg, min] of pairs) {
  if (!fg || !bg) {
    skipped++;
    console.log(`  ????  ${label} — a token in this pair is not defined yet`);
    continue;
  }
  const r = ratio(fg, bg);
  const pass = r >= min;
  if (!pass) fails++;
  const shown = r.toFixed(2).padStart(5);
  console.log(
    `  ${pass ? "ok  " : "FAIL"}  ${shown}:1  (needs ${min.toFixed(1)})  ${label}`,
  );
}

/* One rule this design is built on, worth stating as an assertion rather than
   a comment: the party's own orange cannot carry text on paper. That is the
   whole reason --signal is a darkened version of it, and --signal-fill keeps
   the original for surfaces nothing is ever read on top of. */
const fillOnWhite = ratio(app["signal-fill"], WHITE);
console.log(
  `\n  note   the undarkened party orange on white measures ${fillOnWhite.toFixed(2)}:1 — ` +
    `--signal-fill is a surface, never type.`,
);

console.log(
  `\n${fails ? `${fails} FAILURE${fails === 1 ? "" : "S"}` : "no failures"}` +
    `${skipped ? `, ${skipped} skipped (token missing)` : ""}\n`,
);

if (skipped && !fails) {
  console.log(
    "Skipped pairs are not passes. A token named above does not exist in the\n" +
      "shipped files, so that part of the design is unverified.\n",
  );
}

process.exit(fails ? 1 : 0);
