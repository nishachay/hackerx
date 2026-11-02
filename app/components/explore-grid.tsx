"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Card } from "../lib/site-data";
import { fullNumber } from "../lib/format";
import { TweetCard } from "./tweet-card";

type Topic = [string, number];

export function ExploreGrid({ cards, topics }: { cards: Card[]; topics: Topic[] }) {
  const [topic, setTopic] = useState("All");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("topic");
    if (fromUrl) setTopic(fromUrl);
  }, []);

  const options = useMemo<Topic[]>(() => [["All", cards.length], ...topics], [cards.length, topics]);
  const filtered = useMemo(() => (topic === "All" ? cards : cards.filter((card) => card.topic === topic)), [cards, topic]);

  return (
    <>
      <div className="chip-row" role="group" aria-label="Filter ideas by topic">
        {options.map(([name, count]) => {
          const active = topic === name;
          return (
            <button key={name} type="button" className={`chip${active ? " is-active" : ""}`} aria-pressed={active} onClick={() => setTopic(name)}>
              {name || "Other"}
              <span className="chip-count">{fullNumber(count)}</span>
            </button>
          );
        })}
      </div>

      <div className="result-bar">
        <p className="result-count" role="status">
          {topic === "All"
            ? `All ${fullNumber(filtered.length)} ideas`
            : `${fullNumber(filtered.length)} ${filtered.length === 1 ? "idea" : "ideas"} in ${topic}`}
        </p>
        {topic !== "All" ? (
          <button type="button" className="clear-filter" onClick={() => setTopic("All")}>
            <X size={14} strokeWidth={2} aria-hidden="true" />
            Clear topic
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No ideas in {topic} yet</p>
          <p>Try another topic, or clear the filter to see the full archive.</p>
          <button type="button" className="button button-secondary" onClick={() => setTopic("All")}>
            Show all topics
          </button>
        </div>
      ) : (
        <div className="feed">
          {filtered.map((card, index) => (
            <TweetCard key={card.id} card={card} eager={index === 0} />
          ))}
        </div>
      )}
    </>
  );
}
