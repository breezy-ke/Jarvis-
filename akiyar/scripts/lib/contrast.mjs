/**
 * WCAG 2.1 contrast maths.
 *
 * Shared by `check-contrast.mjs`, which fails the build on a bad pair, and by
 * the brand-spec generator, which prints the same numbers into the document the
 * WordPress developer builds against. One implementation, so the spec cannot
 * quote a ratio the check does not agree with.
 */

/** #RGB or #RRGGBB -> [r,g,b] in 0..255 */
export function parseHex(hex) {
  const h = hex.trim().replace(/^#/, "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

/**
 * Relative luminance, WCAG 2.1 definition. The 0.03928 threshold and the 2.4
 * exponent are from the spec -- this is not a perceptual model, it is the exact
 * formula the success criterion is written against.
 */
export function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** True when a colour is light enough that black type sits on it, not white. */
export function prefersDarkInk(hex) {
  return luminance(hex) > 0.35;
}
