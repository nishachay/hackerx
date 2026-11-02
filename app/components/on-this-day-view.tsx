"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Card } from "../lib/site-data";
import { TweetCard } from "./tweet-card";

export function OnThisDayView({ cards, buckets, fallbackIds }: { cards: Card[]; buckets: Record<string, string[]>; fallbackIds: string[] }) {
  const [day, setDay] = useState(() => new Date().toISOString().slice(5, 10));

  useEffect(() => {
    setDay(new Date().toISOString().slice(5, 10));
  }, []);

  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const ids = buckets[day] ?? [];
  const matches = ids.map((id) => byId.get(id)).filter((card): card is Card => Boolean(card));
  const fallback = fallbackIds.map((id) => byId.get(id)).filter((card): card is Card => Boolean(card));
  const showFallback = matches.length === 0;

  return (
    <>
      <p className="result-count" role="status">
        {showFallback
          ? `No anniversary saved for ${day} — here are today’s top picks instead.`
          : `${matches.length} ${matches.length === 1 ? "idea" : "ideas"} first recommended on ${day}, across the archive.`}
      </p>
      <div className="feed">
        {(showFallback ? fallback : matches).map((card, index) => (
          <TweetCard key={card.id} card={card} eager={index === 0} />
        ))}
      </div>
      {showFallback ? (
        <p className="feed-footnote">
          Anniversaries follow the UTC date of the Hacker News comment.{" "}
          <Link className="text-link" href="/year">
            Browse by year instead
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}
