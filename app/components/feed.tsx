"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function isTab(value: string | null): value is TabId {
  return value === "top" || value === "new" || value === "discussed";
}

export function Feed({ cards }: { cards: Card[] }) {
  const [tab, setTab] = useState<TabId>("top");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [ready, setReady] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("tab");
    if (isTab(fromUrl)) setTab(fromUrl);
    const count = Number.parseInt(params.get("count") ?? "", 10);
    if (Number.isFinite(count)) {
      setVisible(Math.min(Math.max(count, PAGE_SIZE), Math.max(cards.length, PAGE_SIZE)));
    }
    setReady(true);
  }, [cards.length]);

  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (tab === "top") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    if (visible === PAGE_SIZE) url.searchParams.delete("count");
    else url.searchParams.set("count", String(visible));
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [tab, visible, ready]);

  const ordered = useMemo(() => {
    if (tab === "new") {
      return [...cards].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    }
    if (tab === "discussed") {
      return [...cards].sort((a, b) => b.quotes.length - a.quotes.length || b.recommenders - a.recommenders);
    }
    return cards;
  }, [cards, tab]);

  const selectTab = (next: TabId) => {
    if (next === tab) return;
    setTab(next);
    setVisible(PAGE_SIZE);

    const tabsEl = tabsRef.current;
    if (!tabsEl) return;
    const head = document.querySelector<HTMLElement>(".page-head");
    const headSticky = head && window.getComputedStyle(head).position === "sticky";
    const topBar = document.querySelector<HTMLElement>(".mobile-top");
    const offset = headSticky ? (head?.getBoundingClientRect().height ?? 0) : (topBar?.getBoundingClientRect().height ?? 0);
    const top = tabsEl.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(top, 0), behavior: "instant" });
  };

  return (
    <>
      <div className="feed-tabs" role="group" aria-label="Sort ideas" ref={tabsRef}>
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`feed-tab${active ? " is-active" : ""}`}
              aria-pressed={active}
              onClick={() => selectTab(item.id)}
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
