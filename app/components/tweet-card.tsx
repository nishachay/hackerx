"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Check, ExternalLink, MessageCircle, Quote as QuoteIcon, Share2 } from "lucide-react";
import type { Card } from "../lib/site-data";
import { recommendationBadge, topQuote } from "../lib/quotes";
import { compactNumber, formatDate } from "../lib/format";
import { Avatar } from "./avatar";
import { TweetEmbed } from "./tweet-embed";

function readIds(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* private mode: the toggle still reflects this visit */
  }
}

type Props = {
  card: Card;
  eager?: boolean;
};

export function TweetCard({ card, eager = false }: Props) {
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    setSaved(readIds("hackerx-saved").includes(card.id));
  }, [card.id]);

  const toggleSave = () => {
    const next = !saved;
    const ids = readIds("hackerx-saved");
    writeIds("hackerx-saved", next ? [...new Set([...ids, card.id])] : ids.filter((id) => id !== card.id));
    setSaved(next);
  };

  const share = async () => {
    const url = `${window.location.origin}/tweet/${card.id}`;
    const title = `@${card.author.handle} on HackerX`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setShared(true);
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
      }
    } catch {
      return;
    }
    window.setTimeout(() => setShared(false), 2400);
  };

  const quote = topQuote(card);
  const quoteHref = quote?.story_url || `/tweet/${card.id}`;
  const topic = card.topic || "Ideas";

  return (
    <article className="card tweet-card">
      <div className="tweet-head">
        <span className="tweet-avatar-link">
          <Avatar name={card.author.handle} size={40} />
        </span>
        <div className="tweet-identity">
          <div className="tweet-meta">
            <h2 className="author-heading">
              <Link href={`/accounts/${card.author.handle}`} className="author-link">
                @{card.author.handle}
              </Link>
            </h2>
            <span className="meta-dot" aria-hidden="true">
              ·
            </span>
            <time className="meta-mono" dateTime={card.created_at}>
              {formatDate(card.created_at)}
            </time>
          </div>
          <div className="tweet-submeta">
            <span className="recommended-badge">
              <QuoteIcon size={13} strokeWidth={2} aria-hidden="true" />
              {recommendationBadge(card.recommenders)}
            </span>
            <span className="topic-chip">{topic}</span>
          </div>
        </div>
      </div>

      <TweetEmbed id={card.id} url={card.url} handle={card.author.handle} createdAt={card.created_at} eager={eager} />

      {quote ? (
        <a className="hn-quote" href={quoteHref} target={quote.story_url ? "_blank" : undefined} rel={quote.story_url ? "noreferrer" : undefined}>
          <span className="hn-quote-head">
            <QuoteIcon size={13} strokeWidth={2} aria-hidden="true" />
            <span>From the Hacker News thread</span>
            {quote.story_url ? <ExternalLink size={12} strokeWidth={2} aria-hidden="true" /> : null}
          </span>
          <q>{quote.text}</q>
          <span className="hn-quote-meta">
            <span>@{quote.author}</span>
            {quote.edited_for_display ? <span className="edited-note">edited for display</span> : null}
            {quote.story_title ? <span className="hn-quote-story">{quote.story_title}</span> : null}
            {quote.year ? <span className="meta-mono">{quote.year}</span> : null}
          </span>
        </a>
      ) : null}

      <div className="tweet-actions">
        <Link className="action" href={`/tweet/${card.id}#discussion`} aria-label={`${card.quotes.length} Hacker News comments on this idea`}>
          <MessageCircle size={17} strokeWidth={1.75} aria-hidden="true" />
          <span className="action-count">{compactNumber(card.quotes.length)}</span>
        </Link>
        <button
          type="button"
          className={`action${saved ? " is-saved" : ""}`}
          onClick={toggleSave}
          aria-pressed={saved}
          aria-label={saved ? "Remove bookmark" : "Save this idea"}
        >
          <Bookmark size={17} strokeWidth={1.75} aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          <span className="action-count">{saved ? "Saved" : "Save"}</span>
        </button>
        <button type="button" className="action" onClick={share} aria-label="Copy a link to this idea">
          {shared ? <Check size={17} strokeWidth={1.75} aria-hidden="true" /> : <Share2 size={17} strokeWidth={1.75} aria-hidden="true" />}
          <span className="action-count">{shared ? "Copied" : "Share"}</span>
        </button>
      </div>
      <span className="sr-only" role="status">
        {shared ? "Link copied to clipboard." : ""}
      </span>
    </article>
  );
}
