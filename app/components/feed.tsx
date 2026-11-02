"use client";

import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, Clock3, MessagesSquare } from "lucide-react";
import type { Card } from "../lib/site-data";
import { TweetCard } from "./tweet-card";

const tabs = [
  { id: "top", label: "Top picks", icon: ArrowDownWideNarrow },
  { id: "new", label: "Newest", icon: Clock3 },
  { id: "discussed", label: "Most discussed", icon: MessagesSquare },
] as const;

type TabId = (typeof tabs)[number]["id"];
const PAGE_SIZE = 10;

export function Feed({ cards }: { cards: Card[] }) {
  const [tab, setTab] = useState<TabId>("top");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const ordered = useMemo(() => {
    if (tab === "new") {
      return [...cards].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    }
    if (tab === "discussed") {
      return [...cards].sort((a, b) => b.quotes.length - a.quotes.length || b.recommenders - a.recommenders);
    }
    return cards;
  }, [cards, tab]);

  return (
    <>
      <div className="feed-tabs" role="group" aria-label="Sort ideas">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`feed-tab${active ? " is-active" : ""}`}
              aria-pressed={active}
              onClick={() => {
                setTab(item.id);
                setVisible(PAGE_SIZE);
              }}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      {ordered.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No ideas here yet</p>
          <p>Run the pipeline to publish the first picks, or explore the archive.</p>
        </div>
      ) : (
        <div className="feed">
          {ordered.slice(0, visible).map((card, index) => (
            <TweetCard key={card.id} card={card} eager={index === 0} />
          ))}
        </div>
      )}

      {visible < ordered.length ? (
        <div className="load-more-wrap">
          <button type="button" className="button button-secondary" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, ordered.length - visible)} more ideas
          </button>
          <p className="load-more-note">
            {visible} of {ordered.length} shown
          </p>
        </div>
      ) : (
        <p className="feed-end">You’ve reached the end of this list.</p>
      )}
    </>
  );
}
