import type { ReactNode } from "react";
import { shortenUrl, splitQuoteUrls } from "./quote-url";

/** Renders verbatim HN quote text with long URLs shown as short links. */
export function QuoteText({ text, linkify = true }: { text: string; linkify?: boolean }) {
  const parts: ReactNode[] = [];
  splitQuoteUrls(text).forEach((segment, index) => {
    if (segment.kind === "url") {
      const short = shortenUrl(segment.value);
      parts.push(
        linkify ? (
          <a key={index} className="quote-link" href={segment.value} target="_blank" rel="noreferrer">
            {short}
          </a>
        ) : (
          <span key={index} className="quote-link quote-link-plain">
            {short}
          </span>
        ),
      );
    } else {
      parts.push(<span key={index}>{segment.value}</span>);
    }
  });
  return <>{parts}</>;
}
