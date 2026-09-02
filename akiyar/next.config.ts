import type { NextConfig } from "next";

/*
  Security headers.

  This site collects names, phone numbers and political affiliation, so the
  browser-level protections are worth having even though RLS and server actions
  do the real work. These headers are cheap, they break nothing, and their
  absence is the first thing a security review flags.

  Deliberately NOT setting a strict Content-Security-Policy here: Next.js injects
  inline styles and scripts, and a hand-written CSP that forgets one of them
  silently breaks the page. A proper nonce-based CSP is a follow-up worth doing
  once the app is stable, not a launch blocker done in a hurry.
*/
const securityHeaders = [
  // Stop the site being framed by anyone else (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Do not let browsers second-guess declared content types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Leak as little referrer information as possible to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This app needs none of these device capabilities; deny them all.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Force HTTPS for two years, including subdomains. Safe once the domain is
  // served over TLS, which Vercel does by default.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  /*
    Every quality the app actually asks for has to be declared, or Next 16
    refuses it and silently serves 75 instead — while logging a warning per
    image, which is how this was found.

    That fallback mattered here rather than being cosmetic. The gallery asks
    for 62 deliberately: this audience is on 3G Android phones in Turkana, and
    forty-five photographs served 20% heavier than intended is exactly the kind
    of regression nobody sees on a development machine. 72 is the hero, 80 the
    portraits, 75 stays because it is Next's default for anything unmarked.
  */
  images: {
    qualities: [62, 72, 75, 80],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
