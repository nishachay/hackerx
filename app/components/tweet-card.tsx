"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Check, ChevronDown, ExternalLink, MessageCircle, Quote as QuoteIcon, Share2 } from "lucide-react";
import type { Card } from "../lib/site-data";
import { recommendationBadge, topQuote } from "../lib/quotes";
import { compactNumber, formatDate } from "../lib/format";
import { readSavedIds, toggleSaved } from "../lib/saved-list";
import { QuoteText } from "../lib/quote-text";
import { Avatar } from "./avatar";
import { TweetEmbed } from "./tweet-embed";

type Props = {
  card: Card;
  eager?: boolean;
};

export function TweetCard({ card, eager = false }: Props) {
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const quoteRef = useRef<HTMLQuoteElement>(null);

  useEffect(() => {
    setSaved(readSavedIds().includes(card.id));
  }, [card.id]);

  useEffect(() => {
    const node = quoteRef.current;
    if (!node) return;
    const check = () => setClamped(node.scrollHeight > node.clientHeight + 1);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const toggleSave = () => {
    setSaved(toggleSaved(card.id));
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
  const topic = card.topic || "Ideas";

  return (
    <article className="card tweet-card" data-card-id={card.id} data-card-url={card.url}>
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
          <div className="tweet-meta-tags">
            <span className="topic-chip">{topic}</span>
            {card.thread ? (
              <a className="thread-chip" href={card.url} target="_blank" rel="noreferrer">
                Thread · Read the full thread on X
                <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <TweetEmbed id={card.id} url={card.url} handle={card.author.handle} createdAt={card.created_at} eager={eager} />

      <div className="tweet-submeta">
        <span className="recommended-badge">
          <QuoteIcon size={13} strokeWidth={2} aria-hidden="true" />
          {recommendationBadge(card.recommenders)}
        </span>
      </div>

      {quote ? (
        <div className={`hn-quote${expanded ? " is-expanded" : ""}`}>
          {quote.story_url ? (
            <a className="hn-quote-head" href={quote.story_url} target="_blank" rel="noreferrer">
              <QuoteIcon size={13} strokeWidth={2} aria-hidden="true" />
              <span>From the Hacker News thread</span>
              <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
            </a>
          ) : (
            <span className="hn-quote-head">
              <QuoteIcon size={13} strokeWidth={2} aria-hidden="true" />
              <span>From the Hacker News thread</span>
            </span>
          )}
          <q className="hn-quote-text" ref={quoteRef}>
            <QuoteText text={quote.text} />
          </q>
          {clamped || expanded ? (
            <button type="button" className="hn-quote-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
              <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
          <span className="hn-quote-meta">
            <span>@{quote.author}</span>
            {quote.story_title ? <span className="hn-quote-story">{quote.story_title}</span> : null}
            {quote.year ? <span className="meta-mono">{quote.year}</span> : null}
          </span>
        </div>
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
