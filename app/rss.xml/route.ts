import fs from "node:fs";
import path from "node:path";
import { getCards, getSite } from "../../app/lib/site-data";
import { recommendationBadge, topQuote } from "../../app/lib/quotes";

export const dynamic = "force-static";

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function buildFeed() {
  const { meta } = getSite();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || meta.siteUrl;
  const generated = path.join(process.cwd(), "data", "site", "rss.xml");
  try {
    const prebuilt = fs.readFileSync(generated, "utf8");
    if (prebuilt.includes("<rss")) return prebuilt.replaceAll("https://hackerx.nishachay.tech", origin);
  } catch {
    /* no pipeline feed yet: build one from the cards below */
  }

  const items = getCards()
    .slice(0, 50)
    .map((card) => {
      const link = `${origin}/tweet/${card.id}`;
      const date = card.created_at ? new Date(card.created_at) : new Date();
      const badge = recommendationBadge(card.recommenders);
      const title = `@${card.author.handle}, ${badge.charAt(0).toLowerCase()}${badge.slice(1)}`;
      const quote = topQuote(card);
      const description = `${quote ? `“${quote.text}” — HN reader @${quote.author}. ` : ""}View on X: ${card.url}`;
      return `<item><title>${xml(title)}</title><description>${xml(description)}</description><link>${xml(link)}</link><guid isPermaLink="false">${xml(card.id)}</guid><pubDate>${date.toUTCString()}</pubDate><category>${xml(card.topic || "Ideas")}</category><comments>${xml(link)}</comments></item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>HackerX — ideas worth keeping</title><link>${origin}</link><description>Timeless ideas recommended by Hacker News readers.</description><language>en</language><atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}

export function GET() {
  return new Response(buildFeed(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
