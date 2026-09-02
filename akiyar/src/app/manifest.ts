import type { MetadataRoute } from "next";

/**
 * Web app manifest. This is a mobile-first campaign, and many supporters will
 * open it from a home-screen shortcut once an agent adds it for them. The
 * manifest makes that shortcut carry the campaign's own mark and open cleanly.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ekusi Lore for Turkana Senate",
    short_name: "Ekusi Lore",
    description:
      "Add your name to Hon. Ekusi Lore's supporter register for the Turkana senate seat.",
    start_url: "/",
    display: "standalone",
    /* The splash ground while the app opens, and it has now been wrong in both
       directions. It must be the ground the app actually has — body paints
       var(--bg), which is var(--screen), and globals.css is explicit that only
       --screen is ever a page background.

       It was #FFFDF5 (cream) while the site was dark, so a home-screen launch
       flashed cream and then loaded a black site. That was corrected to the
       near-black #05060a — and then the site went light on 2026-08-26 and the
       same bug came back reversed: a launch flashed black before loading paper.

       This is a literal in a .ts file, so no token can reach it and no palette
       check walks it. Same trap as the inline styles in global-error.tsx. When
       --screen moves, come here by hand. */
    background_color: "#fbfaf8",
    theme_color: "#f47b20",
    lang: "en",
    /* Declared at their real sizes rather than "any". The icons these
       replaced were 274x364 — a squashed party logo — and "any" told the
       browser to trust that shape. Both are square now. */
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
