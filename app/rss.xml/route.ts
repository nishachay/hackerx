import { tweets } from "../../app/lib/data";

export const dynamic = "force-static";

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function GET() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://hackerx.workers.dev";
  const items = tweets.map((record) => `<item><title>${xml(record.author.name)}: ${xml(record.tweet.text.slice(0, 100))}</title><description>${xml(record.tweet.text)}</description><link>${origin}/?tweet=${xml(record.id)}</link><guid isPermaLink="false">${xml(record.id)}</guid><pubDate>${new Date(record.tweet.created_at).toUTCString()}</pubDate></item>`).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>HackerX</title><link>${origin}</link><description>Timeless ideas recommended by Hacker News readers.</description>${items}</channel></rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
