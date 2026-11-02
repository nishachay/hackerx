"use client";

import type { TweetRecord } from "../lib/data";

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function ExportCard({ record }: { record: TweetRecord }) {
  const download = () => {
    const words = record.tweet.text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      if (`${line} ${word}`.trim().length > 42) { lines.push(line); line = word; }
      else line = `${line} ${word}`.trim();
    }
    if (line) lines.push(line);
    const text = lines.map((value, index) => `<text x="72" y="${170 + index * 48}" fill="#E7E9EA" font-size="30" font-family="Arial, sans-serif">${escapeXml(value)}</text>`).join("");
    const height = Math.max(420, 250 + lines.length * 48);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><rect width="100%" height="100%" rx="36" fill="#000000"/><text x="72" y="82" fill="#FF6600" font-size="44" font-weight="700" font-family="Arial, sans-serif">H</text>${text}<text x="72" y="${height - 86}" fill="#E7E9EA" font-size="22" font-weight="700" font-family="Arial, sans-serif">${escapeXml(record.author.name)} · @${escapeXml(record.author.handle)}</text><text x="72" y="${height - 46}" fill="#71767B" font-size="18" font-family="Arial, sans-serif">HackerX · cited by Hacker News readers</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hackerx-${record.id}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return <button className="export-button" onClick={download}>↓ Export image</button>;
}
