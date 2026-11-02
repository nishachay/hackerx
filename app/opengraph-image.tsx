import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getSite } from "./lib/site-data";
import { fullNumber } from "./lib/format";

export const dynamic = "force-static";

export const alt = "HackerX — posts Hacker News kept coming back to";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function markDataUri() {
  const svg = fs.readFileSync(path.join(process.cwd(), "public", "h-mark.svg"));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

export default function OpengraphImage() {
  const { meta } = getSite();
  const count = fullNumber(meta.counts.published);
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
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <img src={markDataUri()} width={96} height={96} alt="" />
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, letterSpacing: "-0.03em" }}>HackerX</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.035em", maxWidth: 980 }}>
            Posts Hacker News kept coming back to.
          </div>
          <div style={{ display: "flex", fontSize: 34, lineHeight: 1.35, color: "#a7adb4", maxWidth: 860 }}>
            {count} ideas, each recommended by Hacker News readers years after it was written.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26, color: "#71767b" }}>
          <div style={{ display: "flex" }}>hackerx.nishachay.tech</div>
          <div style={{ display: "flex", color: "#ff6600" }}>{count} ideas</div>
        </div>
      </div>
    ),
    size,
  );
}
