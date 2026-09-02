import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { isDemoMode } from "@/lib/demo-flag";
import { REVEAL_BOOTSTRAP, REVEAL_NOSCRIPT } from "@/components/site/reveal-bootstrap";

/*
  One typeface, two axes.

  Archivo is variable in weight (400-900) AND width (62-125%), and this design
  gets its whole typographic range out of that second axis: condensed caps for
  labels, expanded heavy for the moment a supporter is confirmed, one 90KB file
  for all of it. Two faces would cost more bytes and say less.

  It is the same file the campaign site serves from ekusilore.co.ke, copied here
  rather than linked because the two properties are separate hosts. That shared
  face is most of the reason a supporter crossing between them cannot tell they
  changed application.

  Self-hosted, so there is no request to a font CDN to fail on a weak link.
  `display: swap` paints text immediately in the fallback, so nobody in Turkana
  ever waits on a typeface to read the form.

  The font-stretch declaration is required: without it the browser clamps the
  width axis to 100% and every condensed label silently renders at normal width.
*/
const archivo = localFont({
  src: "./fonts/archivo.woff2",
  variable: "--font-archivo",
  weight: "400 900",
  style: "normal",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

/*
  metadataBase is the campaign's live domain. Every relative image and canonical
  URL below is resolved against it, so this is the one line to change if the
  domain ever moves. The env override lets a Vercel preview deploy point at its
  own URL without shipping a wrong link to production.

  The Open Graph block is not decoration. This campaign spreads by supporters
  pasting the link into WhatsApp groups, and a link with no preview card is a
  link nobody taps. The card carries his face, his name and the ask.
*/
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ekusilore.co.ke";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Hon. Ekusi Lore for Turkana Senate",
    template: "%s | Ekusi Lore for Turkana Senate",
  },
  description:
    "Hon. Ekusi Lore, candidate for the Turkana County senate seat in 2027. A senate seat is an oversight seat, and this campaign publishes what it can and cannot do with it.",
  applicationName: "Ekusi Lore for Turkana Senate",
  keywords: [
    "Ekusi Lore",
    "Turkana Senate",
    "Turkana County",
    "ODM",
    "Orange Democratic Movement",
    "supporter register",
    "Kazi ni Kazi",
  ],
  authors: [{ name: "Ekusi Lore Campaign" }],
  openGraph: {
    type: "website",
    siteName: "Ekusi Lore for Turkana Senate",
    title: "Stand up and be counted for Turkana",
    description:
      "Add your name to Hon. Ekusi Lore's supporter register. Verified by SMS, tied to your polling station, in every one of Turkana's thirty wards.",
    url: SITE_URL,
    locale: "en_KE",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stand up and be counted for Turkana",
    description:
      "Add your name to Hon. Ekusi Lore's supporter register. Verified by SMS, tied to your polling station.",
  },
  /*
    No `robots` key, deliberately.

    A page with no robots meta tag is indexable — that is the default, and
    saying so explicitly bought nothing. What it cost was a conflict: Next
    injects `<meta name="robots" content="noindex">` on any response where
    `notFound()` was reached, and because those responses stream, the HTTP
    status stays 200 and that tag is the only thing keeping the URL out of an
    index. Declaring `index, follow` here put a second, contradictory tag on
    every one of them. Crawlers resolve a conflict to the most restrictive
    directive, so `noindex` did still win — but the page was arguing with
    itself, and the register's own draft news slugs are the URLs it was
    arguing about.
  */
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
      `js-reveal` is rendered here, by the server, rather than added by a script
      in the head. It is what arms the section reveal: the hidden state in
      campaign.css exists only under this class, so the animation is on from the
      first byte and content is never seen and then hidden.

      Rendering it server-side is also what keeps hydration clean. Adding it
      from a script means the class list React finds is not the one it sent, and
      it reports a mismatch on every page load. Reduced motion is handled in CSS
      for the same reason — see src/components/site/reveal-bootstrap.ts.
    */
    <html lang="en" className={`${archivo.variable} js-reveal h-full antialiased`}>
      <head>
        {/*
          Two failsafes for an animation that would otherwise be able to hide a
          page permanently: the script releases the reveal if the React side
          never mounts, and the noscript rule covers scripting being off
          altogether.

          Both release by injecting CSS rather than by editing the class above,
          so neither can disagree with what React hydrates. See
          reveal-bootstrap.ts for why that distinction is the whole design.
        */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOTSTRAP }} />
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: REVEAL_NOSCRIPT }} />
        </noscript>
      </head>
      <body className="flex min-h-full flex-col">
        {isDemoMode() && (
          <div className="border-b border-line bg-ink-700 px-4 py-1.5 text-center text-[12.5px] font-semibold text-muted">
            Demo mode · sample data, not real supporters · no database or SMS connected
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
