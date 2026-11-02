"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Card } from "../lib/site-data";
import { TweetCard } from "./tweet-card";

type Lists = { saved: string[]; liked: string[]; history: string[] };

function read(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function HistoryView({ cards }: { cards: Card[] }) {
  const [lists, setLists] = useState<Lists>({ saved: [], liked: [], history: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLists({ saved: read("hackerx-saved"), liked: read("hackerx-liked"), history: read("hackerx-history") });
    setReady(true);
  }, []);

  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((card): card is Card => Boolean(card));
  const saved = pick(lists.saved);
  const liked = pick(lists.liked);
  const viewed = pick(lists.history);
  const empty = ready && saved.length === 0 && liked.length === 0 && viewed.length === 0;

  if (!ready) {
    return <p className="result-count" role="status">
        Loading your history…
      </p>;
  }

  if (empty) {
    return (
      <div className="empty-state">
        <p className="empty-title">Your history is empty</p>
        <p>Bookmark an idea or open one, and it will wait for you here. Everything stays on this device.</p>
        <div className="empty-actions">
          <Link className="button button-primary" href="/">
            Browse the picks
          </Link>
          <Link className="button button-secondary" href="/explore">
            Explore by topic
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="history">
      {saved.length > 0 ? (
        <section className="history-section" aria-labelledby="history-saved">
          <h2 id="history-saved">Saved</h2>
          <div className="feed">
            {saved.map((card) => (
              <TweetCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}
      {liked.length > 0 ? (
        <section className="history-section" aria-labelledby="history-liked">
          <h2 id="history-liked">Liked</h2>
          <div className="feed">
            {liked.map((card) => (
              <TweetCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}
      {viewed.length > 0 ? (
        <section className="history-section" aria-labelledby="history-viewed">
          <h2 id="history-viewed">Recently viewed</h2>
          <div className="feed">
            {viewed.map((card) => (
              <TweetCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
