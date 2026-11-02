import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://hackerx.workers.dev";
  return [{ url: `${origin}/`, changeFrequency: "daily", priority: 1 }];
}
