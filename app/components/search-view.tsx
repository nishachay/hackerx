"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { Card } from "../lib/site-data";
import { fullNumber } from "../lib/format";
import { TweetCard } from "./tweet-card";

function matches(card: Card, query: string) {
  const haystack = [
    card.text,
    card.author.name,
    card.author.handle,
    card.topic,
    card.kind,
    ...card.quotes.map((quote) => `${quote.text} ${quote.author}`),
  ]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function SearchView({ cards }: { cards: Card[] }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("q") ?? "";
    setQuery(fromUrl);
  }, []);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return cards.filter((card) => matches(card, trimmed));
  }, [cards, query]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set("q", query.trim());
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
  };

  return (
    <>
      <form className="search-page-form" role="search" onSubmit={submit}>
        <label htmlFor="search-page-input">Search the archive</label>
        <div className="search-page-field">
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          <input
            id="search-page-input"
            name="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “databases”, “career”, or a name"
            autoComplete="off"
            autoFocus
          />
          {query ? (
            <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </form>

      <p className="result-count search-count" role="status">
        {query.trim()
          ? `${fullNumber(results.length)} ${results.length === 1 ? "match" : "matches"} for “${query.trim()}”`
          : "Search titles, authors, topics and the Hacker News quotes."}
      </p>

      {query.trim() && results.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No matches for “{query.trim()}”</p>
          <p>Try a shorter phrase, an author handle, or a topic like “startups”.</p>
          <button type="button" className="button button-secondary" onClick={() => setQuery("")}>
            Clear search
          </button>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="feed">
          {results.map((card, index) => (
            <TweetCard key={card.id} card={card} eager={index === 0} />
          ))}
        </div>
      ) : null}

      {!query.trim() ? (
        <div className="empty-state empty-state-quiet">
          <p className="empty-title">Start with a topic</p>
          <p>
            Or <Link className="text-link" href="/explore">browse everything by topic</Link>.
          </p>
        </div>
      ) : null}
    </>
  );
}
