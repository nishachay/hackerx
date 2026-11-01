"use client";

import { useState } from "react";
import type { TweetRecord } from "../lib/data";

type Props = { record: TweetRecord; onOpen: (id: string) => void; onProfile: (handle: string) => void };

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function count(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function TweetCard({ record, onOpen, onProfile }: Props) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const author = record.author;
  const preview = record.citations.find((citation) => citation.hn_kind === "comment" && citation.hn_comment_text);
  return (
    <article className="tweet-card">
      <div className="avatar">{record.avatar ? <img src={record.avatar} alt="" /> : initials(author.name)}</div>
      <div className="tweet-main">
        <div className="tweet-meta">
          <button className="author-name" onClick={() => onProfile(author.handle)}>{author.name}</button>
          <span className="handle">@{author.handle} · {record.tweet.created_at.slice(0, 4)}</span>
          <span className="hn-badge" title="Cited on Hacker News">H</span>
        </div>
        <button className="tweet-text" onClick={() => onOpen(record.id)}>{record.tweet.text}</button>
        {record.media && <button className="media-placeholder" onClick={() => onOpen(record.id)} aria-label="Open attached media"><span>▧</span> Fixture media preview</button>}
        {record.link_card && <button className="link-card" onClick={() => onOpen(record.id)}><span className="link-card-image">H</span><span className="link-card-copy"><b>{record.link_card.title}</b><small>{record.link_card.description}</small><small>{record.link_card.url}</small></span></button>}
        {preview && <button className="hn-quote" onClick={() => onOpen(record.id)}><span>HN RECOMMENDATION</span><q>{preview.hn_comment_text}</q><small>{record.citations.length} Hacker News citations</small></button>}
        <div className="tweet-actions">
          <button onClick={() => onOpen(record.id)} aria-label="View Hacker News citations"><span>◯</span>{count(record.counts.replies)}</button>
          <button onClick={() => onOpen(record.id)} aria-label="View citations"><span>↗</span>{count(record.counts.reposts)}</button>
          <button className={liked ? "liked" : ""} onClick={() => setLiked(!liked)} aria-pressed={liked}><span>{liked ? "♥" : "♡"}</span>{count(record.counts.likes + Number(liked))}</button>
          <button className={saved ? "saved" : ""} onClick={() => setSaved(!saved)} aria-pressed={saved}><span>{saved ? "▣" : "▢"}</span>{count(record.counts.bookmarks + Number(saved))}</button>
          <button onClick={() => onOpen(record.id)} aria-label="Open tweet details"><span>↗</span></button>
        </div>
      </div>
    </article>
  );
}
