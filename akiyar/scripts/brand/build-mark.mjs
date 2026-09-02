/**
 * Prepares the campaign mark for the web from the designer's artwork.
 *
 * The source is `updated Images/Ekusi Logo.jpeg`: a deep green plate, a pale
 * sage diamond, white lettering, "EKUSI / SENATOR 2027".
 *
 * NOTE ON RE-RUNNING THIS: you probably cannot, on a fresh clone. Two reasons.
 * `updated Images/` is gitignored (it is 239MB of raw photography), so the
 * source artwork is not in the repo — keep it backed up on a drive. And `sharp`
 * is not a declared dependency of this project; it resolves today only because
 * Next pulls it in as an optional transitive one. Install it explicitly before
 * running this. The PNGs it produces are committed, which is what the app uses.
 *
 * WHAT THIS DOES NOT DO: recolour it. An earlier pass rebuilt the mark in ODM
 * orange, and it is kept in git history, but the mark is the candidate's own
 * identity rather than the party's and it stays as it was drawn.
 *
 * Two outputs, because they have different jobs:
 *
 *   ekusi-mark*.png   the mark alone, no ground, for placing on the page.
 *   ekusi-plate*.png  the artwork untouched, for the favicon, the app icon and
 *                     social previews, where it needs a ground of its own.
 *
 * ---------------------------------------------------------------- the knockout
 *
 * Measured from the artwork rather than guessed. By distance from the plate
 * green, the image is: 80% plate, 8.6% white lettering (362 away), 5.7% sage
 * diamond (273 away), and 3.1% a *darker* green — around rgb(2,40,25) — which
 * is the drop shadow the designer set under the lettering.
 *
 * That shadow is why the first version of this script produced a mark with a
 * grey-green halo. Scaling alpha by distance-from-plate cannot tell a shadow
 * from an edge: a shadow is the plate colour darkened, so it sits close to the
 * plate and came out at roughly half alpha — a translucent smear that read as
 * dirt around every letter on a light surface.
 *
 * So the discriminator is direction, not distance. Every pixel is tested as a
 * blend of the plate with one of the two foreground colours actually in the
 * artwork:
 *
 *     observed = coverage x foreground + (1 - coverage) x plate
 *
 * Coverage is the projection of (observed - plate) onto (foreground - plate),
 * and the hypothesis with the smaller residual wins. This gives three things
 * the threshold could not:
 *
 *   - The shadow points *away* from both foreground colours, so its projection
 *     is negative and it resolves to zero coverage. It leaves with the plate.
 *   - Edge pixels get their true fractional coverage rather than a saturated
 *     one, so the arc keeps a soft rim.
 *   - The colour is decontaminated: solving the blend back out as
 *     (observed - (1 - coverage) x plate) / coverage removes the plate's
 *     contribution from every partial pixel. Without this an edge pixel keeps
 *     the green it was mixed with and the mark carries a green fringe onto
 *     whatever it is placed on.
 *
 * THE SHADOW IS DELIBERATELY DROPPED, and that is a change to the artwork. It
 * existed to lift white letters off a green plate; with the plate gone it has
 * nothing to lift from, and a shadow drawn for one ground is wrong on every
 * other. The plated outputs are the untouched JPEG and still have it.
 *
 * Run: node scripts/brand/build-mark.mjs
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(root, "updated Images/Ekusi Logo.jpeg");
const OUT = path.join(root, "public/brand");

/* Sampled from the artwork, not guessed. */
const PLATE = [2, 88, 53];
const FOREGROUNDS = [
  [240, 240, 240], // lettering
  [214, 218, 167], // diamond
];

/* A pixel this far from the plate is inside a shape, not on its rim. Set at the
   sage diamond's distance (273) — the nearer of the two foregrounds — so every
   interior pixel is fully opaque, including where white lettering crosses the
   diamond and neither hypothesis explains the blend on its own. */
const INTERIOR = 273;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.sqrt(dot(a, a));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* Precomputed per foreground: the vector from the plate, and its squared
   length, which is the denominator of the projection. */
const HYPOTHESES = FOREGROUNDS.map((f) => {
  const u = sub(f, PLATE);
  return { u, uu: dot(u, u) };
});

/** Coverage and true colour for one pixel, or null if it belongs to the plate. */
function unmix(observed) {
  const v = sub(observed, PLATE);

  let best = null;
  for (const { u, uu } of HYPOTHESES) {
    const coverage = clamp(dot(v, u) / uu, 0, 1);
    if (coverage <= 0) continue;
    const residual = len(sub(v, [u[0] * coverage, u[1] * coverage, u[2] * coverage]));
    if (!best || residual < best.residual) best = { coverage, residual };
  }
  if (!best) return null; // the shadow and the plate both land here

  // Interior pixels are opaque even when a two-colour blend fits them poorly.
  const coverage = Math.max(best.coverage, clamp(len(v) / INTERIOR, 0, 1));

  // Solve the blend back out, so no plate green survives in a partial pixel.
  const recover = (channel, plate) =>
    clamp(Math.round((channel - (1 - coverage) * plate) / coverage), 0, 255);

  return {
    alpha: Math.round(coverage * 255),
    rgb: [
      recover(observed[0], PLATE[0]),
      recover(observed[1], PLATE[1]),
      recover(observed[2], PLATE[2]),
    ],
  };
}

async function build() {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const n = width * height;

  const knocked = Buffer.alloc(n * 4);
  let kept = 0;
  for (let i = 0; i < n; i++) {
    const o = i * channels;
    const q = i * 4;
    const pixel = unmix([data[o], data[o + 1], data[o + 2]]);
    if (!pixel) continue; // Buffer.alloc already zeroed it: transparent black
    knocked[q] = pixel.rgb[0];
    knocked[q + 1] = pixel.rgb[1];
    knocked[q + 2] = pixel.rgb[2];
    knocked[q + 3] = pixel.alpha;
    if (pixel.alpha > 8) kept++;
  }

  await mkdir(OUT, { recursive: true });

  const transparent = () => sharp(knocked, { raw: { width, height, channels: 4 } }).png();

  /* The artwork is 1280x1170, and an app icon must be square or the browser
     squashes it — the favicon this replaces was 274x364 and did exactly that.
     Padding with the plate's own colour is the one way to square it that
     neither crops the mark nor distorts it: the plate is a flat field, so the
     added strip is indistinguishable from the artwork's own ground. */
  const side = Math.max(width, height);
  const squared = await sharp(SRC)
    .extend({
      top: Math.floor((side - height) / 2),
      bottom: Math.ceil((side - height) / 2),
      left: Math.floor((side - width) / 2),
      right: Math.ceil((side - width) / 2),
      background: { r: PLATE[0], g: PLATE[1], b: PLATE[2], alpha: 1 },
    })
    .png()
    .toBuffer();

  /* Squaring is a separate pass on purpose. sharp runs extend *after* resize
     whatever order the calls are written in, so padding and scaling in one
     chain pads the thumbnail rather than the artwork — a 32px icon came out
     32x142. Resizing a buffer that is already square cannot do that. */
  const plated = () => sharp(squared);

  // The mark as the UI uses it: no rectangle, sits on any surface.
  await transparent().resize(768).toFile(path.join(OUT, "ekusi-mark.png"));
  await transparent().resize(256).toFile(path.join(OUT, "ekusi-mark-256.png"));

  // With its own plate, for the favicon, the app icon and social previews.
  // Sized exactly, because 180 is the size `apple-icon.png` is asked for.
  for (const size of [32, 180, 512, 1024]) {
    await plated()
      .resize(size, size, { fit: "fill" })
      .toFile(path.join(OUT, `ekusi-plate-${size}.png`));
  }

  const stats = {
    source: "updated Images/Ekusi Logo.jpeg",
    sourceSize: `${width}x${height}`,
    colours: { plate: "#025835", diamond: "#d6daa7", lettering: "#f0f0f0" },
    inkCoverage: `${((100 * kept) / n).toFixed(1)}%`,
    change:
      "plate knocked out and its drop shadow with it; edge pixels decontaminated of plate green; no colour altered",
  };
  await writeFile(path.join(OUT, "mark.json"), `${JSON.stringify(stats, null, 2)}\n`);
  console.log("built:", stats);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
