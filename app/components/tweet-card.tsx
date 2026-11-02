"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Check,
  ExternalLink,
  Heart,
  MessageCircle,
  Quote as QuoteIcon,
  Repeat2,
  Share2,
} from "lucide-react";
import type { Card } from "../lib/site-data";
import { compactNumber, formatDate } from "../lib/format";
import { Avatar } from "./avatar";

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
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    setLiked(readIds("hackerx-liked").includes(card.id));
    setSaved(readIds("hackerx-saved").includes(card.id));
  }, [card.id]);

  const toggle = (key: string, value: boolean, update: (next: boolean) => void) => {
    const ids = readIds(key);
    writeIds(key, value ? [...new Set([...ids, card.id])] : ids.filter((id) => id !== card.id));
    update(value);
  };

  const share = async () => {
    const url = `${window.location.origin}/tweet/${card.id}`;
    const title = `${card.author.name} on HackerX`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: card.text.slice(0, 200), url });
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

  const quote = card.quotes.find((item) => item.stance === "recommends") ?? card.quotes[0];
  const quoteHref = quote?.story_url || `/tweet/${card.id}`;
  const topic = card.topic || "Ideas";
  const recommenders = card.recommenders;

  return (
    <article className="card tweet-card">
      <div className="tweet-head">
        <span className="tweet-avatar-link">
          <Avatar name={card.author.name} src={card.author.avatar} size={40} />
        </span>
        <div className="tweet-identity">
          <div className="tweet-meta">
            <h2 className="author-heading">
              <Link href={`/accounts/${card.author.handle}`} className="author-link">
                {card.author.name || card.author.handle}
              </Link>
            </h2>
            <span className="meta-mono">@{card.author.handle}</span>
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
              Recommended by {recommenders} HN {recommenders === 1 ? "user" : "users"}
            </span>
            <span className="topic-chip">{topic}</span>
          </div>
        </div>
      </div>

      <Link href={`/tweet/${card.id}`} className="tweet-text">
        {card.text}
      </Link>

      {card.quoted_tweet ? (
        <div className="quoted-tweet">
          <p className="quoted-tweet-meta">
            {card.quoted_tweet.name} <span>@{card.quoted_tweet.handle}</span>
          </p>
          <p>{card.quoted_tweet.text}</p>
        </div>
      ) : null}

      {card.media.length > 0 ? (
        <Link href={`/tweet/${card.id}`} className="tweet-media" aria-label={`Open idea with ${card.media.length} attached image${card.media.length === 1 ? "" : "s"}`}>
          <img src={card.media[0].url} alt={card.media[0].alt || ""} loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" />
          {card.media.length > 1 ? <span className="media-count">+{card.media.length - 1}</span> : null}
        </Link>
      ) : null}

      {card.link_card ? (
        <Link href={`/tweet/${card.id}`} className="link-card">
          {card.link_card.image ? (
            <img className="link-card-image" src={card.link_card.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          ) : null}
          <span className="link-card-copy">
            <span className="link-card-domain">{card.link_card.domain || "Link"}</span>
            <span className="link-card-title">{card.link_card.title || card.link_card.description}</span>
            {card.link_card.description ? <span className="link-card-description">{card.link_card.description}</span> : null}
          </span>
        </Link>
      ) : null}

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
        <a className="action" href={card.url} target="_blank" rel="noreferrer" aria-label="Open the original post">
          <Repeat2 size={17} strokeWidth={1.75} aria-hidden="true" />
          <span className="action-count">{compactNumber(card.stats.reposts)}</span>
        </a>
        <button
          type="button"
          className={`action${liked ? " is-liked" : ""}`}
          onClick={() => toggle("hackerx-liked", !liked, setLiked)}
          aria-pressed={liked}
          aria-label={liked ? "Remove from liked ideas" : "Save to liked ideas"}
        >
          <Heart size={17} strokeWidth={1.75} aria-hidden="true" fill={liked ? "currentColor" : "none"} />
          <span className="action-count">{compactNumber(card.stats.likes + (liked ? 1 : 0))}</span>
        </button>
        <button
          type="button"
          className={`action${saved ? " is-saved" : ""}`}
          onClick={() => toggle("hackerx-saved", !saved, setSaved)}
          aria-pressed={saved}
          aria-label={saved ? "Remove bookmark" : "Bookmark this idea"}
        >
          <Bookmark size={17} strokeWidth={1.75} aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          <span className="action-count">{compactNumber(card.stats.bookmarks + (saved ? 1 : 0))}</span>
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
