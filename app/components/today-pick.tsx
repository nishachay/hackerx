import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Card } from "../lib/site-data";
import { formatDate } from "../lib/format";
import { Avatar } from "./avatar";

export function TodayPick({ card }: { card: Card }) {
  return (
    <section className="today-pick" aria-labelledby="today-pick-title">
      <div className="today-pick-head">
        <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
        <h2 id="today-pick-title">Today’s pick</h2>
        <span className="meta-mono">{formatDate(card.created_at)}</span>
      </div>
      <Link href={`/tweet/${card.id}`} className="today-pick-text">
        {card.text}
      </Link>
      <div className="today-pick-foot">
        <Avatar name={card.author.name} src={card.author.avatar} size={28} />
        <span className="today-pick-author">{card.author.name}</span>
        <span className="meta-mono">@{card.author.handle}</span>
        <span className="today-pick-count">
          {card.recommenders} HN {card.recommenders === 1 ? "recommendation" : "recommendations"}
        </span>
        <Link href={`/tweet/${card.id}`} className="text-link today-pick-link">
          Read the idea
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
