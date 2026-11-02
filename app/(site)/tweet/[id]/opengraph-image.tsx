import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getCard, getCards } from "../../../lib/site-data";
import { recommendationBadge } from "../../../lib/quotes";

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

/** Per-post card image: handle, topic, year and the recommendation badge.
 * Never the post text — only our own metadata. */
export default async function TweetImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = getCard(id);
  const year = card?.created_at ? card.created_at.slice(0, 4) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#000000",
          color: "#f2f3f4",
          border: "1px solid #262a2e",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img src={markDataUri()} width={72} height={72} alt="" />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>HackerX</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.05 }}>
            {card ? `@${card.author.handle}` : "HackerX"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34, color: "#a7adb4" }}>
            {card?.topic ? <div style={{ display: "flex" }}>{card.topic}</div> : null}
            {card?.topic && year ? <div style={{ display: "flex", color: "#71767b" }}>·</div> : null}
            {year ? <div style={{ display: "flex" }}>{year}</div> : null}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              padding: "14px 28px",
              borderRadius: 999,
              background: "rgba(255,102,0,0.14)",
              border: "1px solid rgba(255,102,0,0.4)",
              color: "#ff6600",
              fontSize: 32,
              fontWeight: 600,
            }}
          >
            {recommendationBadge(card?.recommenders ?? 0)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, color: "#71767b" }}>
          <div style={{ display: "flex" }}>hackerx.nishachay.tech</div>
          <div style={{ display: "flex" }}>Posts Hacker News kept coming back to</div>
        </div>
      </div>
    ),
    size,
  );
}
