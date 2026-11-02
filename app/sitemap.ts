import type { MetadataRoute } from "next";
import { getSite } from "./lib/site-data";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const { cards, accounts, years, meta } = getSite();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || meta.siteUrl;
  const pages = ["", "/explore", "/year", "/accounts", "/zen", "/on-this-day", "/history", "/how-we-pick", "/about", "/privacy", "/search"];
  return [
    ...pages.map((page) => ({
      url: `${origin}${page || "/"}`,
      changeFrequency: page === "" ? ("daily" as const) : ("weekly" as const),
      priority: page === "" ? 1 : 0.6,
    })),
    ...cards.map((card) => ({
      url: `${origin}/tweet/${card.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...accounts.map((account) => ({
      url: `${origin}/accounts/${account.handle}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...years.map((group) => ({
      url: `${origin}/year/${group.year}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
