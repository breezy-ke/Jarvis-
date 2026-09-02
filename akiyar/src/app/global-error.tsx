"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for an error thrown in the root layout itself, where the
 * normal error.tsx cannot render because the layout it lives inside is the thing
 * that failed. It has to bring its own <html> and <body>, and it cannot lean on
 * the design system, so the styles here are deliberately inline and minimal.
 *
 * THE INLINE STYLES ARE LOAD-BEARING, AND THEY ARE ALSO A TRAP. No stylesheet
 * is loaded on this page, so every colour is a literal that no token can reach.
 * That is why this file sat in the pre-ODM palette long after the rest of the
 * site was repainted: nothing that scans CSS custom properties can see it, and
 * check:contrast cannot either. Repaint it by hand or it will drift again. The
 * literals below are --screen, --type, --type-mid, --signal and --hairline as
 * of this commit.
 *
 * Do not import EkusiMark or Rule to fix that. EkusiMark goes through
 * next/image and Rule needs a class from a stylesheet that is not here — both
 * add a dependency to the one page whose whole job is to render when the
 * dependencies have already failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
          background: "#fbfaf8",
          color: "#14181f",
        }}
      >
        {/*
          The site's own device — a hairline lit at one end and faded out, so an
          edge reads as a light source rather than a stripe. It replaces a
          three-colour party ribbon in UDA yellow, green and navy, which could
          not be recoloured into anything true: he stands on an ODM ticket, ODM
          has one colour, and there is no party ribbon to translate it into.
          Inventing one would be inventing party identity on an error page.
        */}
        <div
          aria-hidden="true"
          style={{
            height: 1,
            flexShrink: 0,
            background:
              "linear-gradient(90deg,#9f5015 0%,rgba(244,123,32,0.55) 22%,rgba(20,24,31,0.09) 55%,transparent 100%)",
          }}
        />
        <main
          style={{
            flex: 1,
            display: "grid",
            placeItems: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "34rem" }}>
            <h1 style={{ fontSize: "1.9rem", margin: "0 0 12px" }}>Something went wrong</h1>
            <p style={{ color: "#4a5260", lineHeight: 1.6, margin: "0 0 24px" }}>
              The site hit an unexpected problem. Please try again in a moment.
            </p>
            <button
              onClick={reset}
              style={{
                /* --signal, not the undarkened party orange. #f47b20 carries a
                   light label at 2.73:1; this pair measures 5.54:1, and it is
                   the same bg-signal / text-screen button the rest of the site
                   uses, so the recovery action looks like itself here. */
                background: "#9f5015",
                color: "#fbfaf8",
                border: 0,
                borderRadius: 12,
                padding: "14px 24px",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
