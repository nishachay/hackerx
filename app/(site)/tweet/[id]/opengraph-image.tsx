import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getCard, getCards } from "../../../lib/site-data";
import { recommendationBadge, topQuote } from "../../../lib/quotes";

export const dynamic = "force-static";

export const alt = "A HackerX pick";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getCards().map((card) => ({ id: card.id }));
}

function markDataUri() {
  const svg = fs.readFileSync(path.join(process.cwd(), "public", "h-mark.svg"));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

export default async function TweetImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = getCard(id);
  const quote = card ? topQuote(card) : null;
  const text = quote ? `“${quote.text}” — HN reader @${quote.author}` : "An idea worth keeping.";
  const short = text.length > 190 ? `${text.slice(0, 187).trimEnd()}…` : text;
  const recommenders = card?.recommenders ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#000000",
          color: "#f2f3f4",
          border: "1px solid #262a2e",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img src={markDataUri()} width={56} height={56} alt="" />
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}>HackerX</div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              borderRadius: 999,
              background: "rgba(255,102,0,0.14)",
              border: "1px solid rgba(255,102,0,0.4)",
              color: "#ff6600",
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            {recommendationBadge(recommenders)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontSize: 50, lineHeight: 1.18, letterSpacing: "-0.025em", maxWidth: 1020 }}>{short}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 27, color: "#a7adb4" }}>
            <div style={{ display: "flex", color: "#f2f3f4", fontWeight: 600 }}>{card ? `@${card.author.handle}` : "Hacker News"}</div>
            {card?.topic ? <div style={{ display: "flex" }}>{card.topic}</div> : null}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 23, color: "#71767b" }}>
          <div style={{ display: "flex" }}>hackerx.nishachay.tech</div>
          <div style={{ display: "flex" }}>Ideas worth keeping</div>
        </div>
      </div>
    ),
    size,
  );
}
