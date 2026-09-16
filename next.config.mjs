/** @type {import('next').NextConfig} */

// CF_PAGES=1 is set by scripts/build-cloudflare.mjs. It switches the build to a
// fully static export for Cloudflare Pages direct upload. Without it (Vercel,
// `npm run dev`, `npm run build`) this stays a normal server build so that
// app/api/chat/route.js runs as a real Next.js route handler.
const isStaticExport = process.env.CF_PAGES === "1";

const nextConfig = isStaticExport
  ? {
      output: "export",
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
