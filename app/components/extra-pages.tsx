"use client";

import { useEffect, useState } from "react";
import { tweets, type TweetRecord } from "../lib/data";
import { TweetCard } from "./tweet-card";

type Props = { page: string; onOpen: (id: string) => void; onProfile: (handle: string) => void };
const topics = ["Programming", "AI", "Startups", "Design", "Security", "Open source", "Writing", "Science"];

export function ExtraPage({ page, onOpen, onProfile }: Props) {
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  useEffect(() => {
    if (page === "History") setHistoryIds(JSON.parse(localStorage.getItem("hackerx-history") || "[]"));
  }, [page]);
  const list = (records: TweetRecord[]) => records.map((record) => <TweetCard key={record.id} record={record} onOpen={onOpen} onProfile={onProfile} />);

  if (page === "Explore") return <div className="extra-page"><h2>Explore ideas</h2><p>Browse lasting ideas by topic, surfaced through Hacker News discussions.</p><div className="topic-pills">{topics.map((topic) => <span key={topic}>{topic}</span>)}</div><h3>Popular this week</h3>{list([...tweets].sort((a,b) => b.counts.likes-a.counts.likes).slice(0,8))}</div>;
  if (page === "By Year") {
    const years = [...new Set(tweets.flatMap((record) => record.citations.map((citation) => citation.hn_created_at.slice(0,4))))].sort().reverse();
    return <div className="extra-page"><h2>By year</h2><p>Ideas with Hacker News citations across the years.</p>{years.map((year) => <section className="year-group" key={year}><h3>{year}</h3>{list(tweets.filter((record) => record.citations.some((citation) => citation.hn_created_at.startsWith(year))).slice(0,4))}</section>)}</div>;
  }
  if (page === "Accounts") return <div className="extra-page"><h2>Accounts</h2><p>Authors whose ideas have been recommended by HN readers.</p>{tweets.map((record) => <button className="account-row" key={record.author.handle} onClick={() => onProfile(record.author.handle)}><span className="avatar">{record.author.name.split(/\s+/).map((part) => part[0]).slice(0,2).join("")}</span><span><b>{record.author.name}</b><small>@{record.author.handle} · {record.citations.length} citations</small></span><span>View →</span></button>)}</div>;
  if (page === "Zen") {
    const day = Math.floor(Date.now() / 86400000) % tweets.length;
    return <div className="zen-page"><small>A MOMENT TO THINK</small><blockquote>{tweets[day].tweet.text}</blockquote><span>— {tweets[day].author.name}</span><button onClick={() => onOpen(tweets[day].id)}>Read the HN discussion</button></div>;
  }
  if (page === "On this day") {
    const today = new Date().toISOString().slice(5,10);
    const matches = tweets.filter((record) => record.tweet.created_at.slice(5,10) === today);
    const selected = matches.length ? matches : [tweets[new Date().getUTCDate() % tweets.length]];
    return <div className="extra-page"><h2>On this day</h2><p>Ideas from the archive, revisited today.</p>{list(selected)}</div>;
  }
  if (page === "History") {
    const visited = historyIds.map((id) => tweets.find((record) => record.id === id)).filter((record): record is TweetRecord => Boolean(record));
    return <div className="extra-page"><h2>History</h2><p>Ideas you opened on this device.</p>{visited.length ? list(visited) : <div className="quiet-empty">Your viewed ideas will appear here.</div>}</div>;
  }
  if (page === "About") return <div className="extra-page"><h2>About HackerX</h2><p>HackerX collects lasting ideas linked in Hacker News discussions and highlights the ones readers recommend.</p><p>New entries come from Hacker News citations. The archive is designed for discovery and reading; there are no visitor submissions or votes.</p></div>;
  if (page === "How we pick") return <div className="extra-page"><h2>How we pick</h2><p>We look for ideas that are useful beyond the news cycle, then check whether distinct Hacker News commenters recommend them.</p><ol><li>Find public posts cited in Hacker News.</li><li>Review the post for durable ideas, advice, technical insight, or a useful story.</li><li>Count recommendations from distinct commenters who wrote substantive text.</li><li>Rank qualifying ideas by recommendation strength and citation history.</li></ol><p>Fixture content is shown during development. Final eligibility follows the published pipeline thresholds.</p></div>;
  return <div className="empty-state"><div className="brand-mark large">H</div><h1>Good ideas deserve to last.</h1></div>;
}
