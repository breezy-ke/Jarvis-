import type { MetadataRoute } from "next";
import { NAV } from "@/content/campaign";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ekusilore.co.ke";

/*
  The map.

  Every fixed page comes from the same NAV array the header renders, so a page
  added to the site cannot be forgotten here.

  There are no per-post entries any more. /news and /events were removed, so the
  slugs they exposed now 404 — listing them would invite a crawler to index
  missing pages.
*/
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    // The register: the page every other page is trying to send people to.
    { url: `${SITE_URL}/join`, changeFrequency: "weekly", priority: 0.9 },
    ...NAV.map((item) => ({
      url: `${SITE_URL}${item.href}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
