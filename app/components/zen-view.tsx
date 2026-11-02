"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Quote as QuoteIcon, RefreshCw } from "lucide-react";
import type { Card } from "../lib/site-data";
import { Avatar } from "./avatar";

export function ZenView({ cards }: { cards: Card[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const day = Math.floor(Date.now() / 86_400_000);
    setIndex(day % Math.max(cards.length, 1));
  }, [cards.length]);

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-title">Nothing to sit with yet</p>
        <p>The archive needs at least one published idea.</p>
      </div>
    );
  }

  const card = cards[index % cards.length];

  return (
    <div className="zen">
      <p className="zen-kicker">
        <QuoteIcon size={14} strokeWidth={2} aria-hidden="true" /> One idea, no feed
      </p>
      <blockquote className="zen-quote" key={card.id}>
        {card.text}
      </blockquote>
      <div className="zen-author">
        <Avatar name={card.author.name} src={card.author.avatar} size={32} />
        <div>
          <p>{card.author.name}</p>
          <p className="meta-mono">
            @{card.author.handle}
            {card.years.length > 0 ? ` · recommended since ${card.years[0]}` : ""}
          </p>
        </div>
      </div>
      <div className="zen-actions">
        <button type="button" className="button button-secondary" onClick={() => setIndex((value) => (value + 1) % cards.length)}>
          <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
          Another idea
        </button>
        <Link className="button button-primary" href={`/tweet/${card.id}`}>
          Read the thread
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <p className="zen-meta">
        {card.recommenders} Hacker News {card.recommenders === 1 ? "recommendation" : "recommendations"} · {card.quotes.length}{" "}
        {card.quotes.length === 1 ? "comment" : "comments"}
      </p>
    </div>
  );
}
