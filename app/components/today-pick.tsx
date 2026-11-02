import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Card } from "../lib/site-data";
import { recommendationBadge, topQuote } from "../lib/quotes";
import { formatDate } from "../lib/format";
import { Avatar } from "./avatar";

export function TodayPick({ card }: { card: Card }) {
  const quote = topQuote(card);
  return (
    <section className="today-pick" aria-labelledby="today-pick-title">
      <div className="today-pick-head">
        <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
        <h2 id="today-pick-title">Today’s pick</h2>
        <span className="meta-mono">{formatDate(card.created_at)}</span>
      </div>
      <Link href={`/tweet/${card.id}`} className="today-pick-text">
        {quote ? `“${quote.text}”` : `@${card.author.handle}`}
      </Link>
      {quote ? (
        <span className="today-pick-src">
          From the Hacker News thread · {quote.author}
        </span>
      ) : null}
      <div className="today-pick-foot">
        <Avatar name={card.author.handle} size={28} />
        <span className="today-pick-author">@{card.author.handle}</span>
        <span className="today-pick-count">{recommendationBadge(card.recommenders)}</span>
        <Link href={`/tweet/${card.id}`} className="text-link today-pick-link">
          Read the idea
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
