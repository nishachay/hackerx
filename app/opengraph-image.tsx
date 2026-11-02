import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const alt = "HackerX — timeless ideas recommended by Hacker News readers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function markDataUri() {
  const svg = fs.readFileSync(path.join(process.cwd(), "public", "h-mark.svg"));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

export default function OpengraphImage() {
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
          <img src={markDataUri()} width={88} height={88} alt="" />
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em" }}>HackerX</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 66, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.035em", maxWidth: 900 }}>
            Ideas worth keeping.
          </div>
          <div style={{ display: "flex", fontSize: 32, lineHeight: 1.35, color: "#a7adb4", maxWidth: 860 }}>
            Timeless posts the Hacker News community keeps recommending, with the comments that recommend them.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24, color: "#71767b" }}>
          <div style={{ display: "flex" }}>hackerx.nishachay.tech</div>
          <div style={{ display: "flex", color: "#ff6600" }}>Recommended by HN readers</div>
        </div>
      </div>
    ),
    size,
  );
}
