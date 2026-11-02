/**
 * Long URLs inside a verbatim HN quote: the visible text is the domain
 * plus a shortened path (about 40 characters with an ellipsis); the full
 * URL stays in the href. The quote's words are never changed.
 */

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
const TRAILING = /[).,;:!?"'”’\]]+$/;
const MAX_VISIBLE = 40;

export function shortenUrl(raw: string, max = MAX_VISIBLE): string {
  const visible = raw.replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (visible.length <= max) return visible;
  return `${visible.slice(0, Math.max(1, max - 1)).replace(/[/?=&._-]+$/, "")}…`;
}

export type QuoteSegment = { kind: "text" | "url"; value: string };

export function splitQuoteUrls(text: string): QuoteSegment[] {
  const segments: QuoteSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    let url = match[0];
    const start = match.index ?? 0;
    // Keep sentence punctuation that follows the URL as plain text.
    const trailing = url.match(TRAILING);
    let tail = "";
    if (trailing) {
      tail = trailing[0];
      url = url.slice(0, -tail.length);
      // A balanced "(...)" inside the URL keeps its closing paren.
      const opens = (url.match(/\(/g) || []).length;
      const closes = (url.match(/\)/g) || []).length;
      if (tail.startsWith(")") && opens > closes) {
        url = `${url})`;
        tail = tail.slice(1);
      }
    }
    if (start > last) segments.push({ kind: "text", value: text.slice(last, start) });
    if (url) segments.push({ kind: "url", value: url });
    // Trailing punctuation stays part of the surrounding plain text.
    last = start + url.length;
  }
  if (last < text.length) segments.push({ kind: "text", value: text.slice(last) });
  return segments;
}
