"use client";

import { Download } from "lucide-react";
import type { Card } from "../lib/site-data";
import { formatDate } from "../lib/format";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (`${line} ${word}`.trim().length > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 14);
}

export function ExportCard({ card }: { card: Card }) {
  const download = () => {
    const lines = wrap(card.text, 38);
    const height = Math.max(460, 300 + lines.length * 52);
    const body = lines
      .map((line, index) => `<text x="72" y="${210 + index * 52}" fill="#F2F3F4" font-size="34" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>`)
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">
<rect width="100%" height="100%" rx="0" fill="#000000"/>
<rect x="72" y="72" width="56" height="56" rx="12" fill="#FF6600"/>
<text x="100" y="112" text-anchor="middle" fill="#000000" font-size="34" font-weight="700" font-family="Arial, Helvetica, sans-serif">H</text>
<text x="145" y="111" fill="#F2F3F4" font-size="26" font-weight="700" font-family="Arial, Helvetica, sans-serif">HackerX</text>
${body}
<text x="72" y="${height - 110}" fill="#F2F3F4" font-size="24" font-weight="700" font-family="Arial, Helvetica, sans-serif">${escapeXml(card.author.name)} · @${escapeXml(card.author.handle)}</text>
<text x="72" y="${height - 72}" fill="#FF6600" font-size="20" font-family="Arial, Helvetica, sans-serif">Recommended by ${card.recommenders} Hacker News ${card.recommenders === 1 ? "reader" : "readers"} · ${escapeXml(formatDate(card.created_at))}</text>
</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hackerx-${card.id}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button type="button" className="button button-secondary" onClick={download}>
      <Download size={16} strokeWidth={1.75} aria-hidden="true" />
      Save quote card
    </button>
  );
}
