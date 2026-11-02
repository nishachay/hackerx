export const dynamic = "force-static";

import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

function markDataUri() {
  const svg = fs.readFileSync(path.join(process.cwd(), "public", "h-mark.svg"));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}>
        <img src={markDataUri()} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
