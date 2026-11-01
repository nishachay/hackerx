"use client";

import { useState } from "react";
import { tweets } from "../lib/data";
import { TweetCard } from "./tweet-card";

type Props = { onOpen: (id: string) => void; onProfile: (handle: string) => void };

export function HomeFeed({ onOpen, onProfile }: Props) {
  const [tab, setTab] = useState("For you");
  const [visible, setVisible] = useState(8);
  const ordered = tab === "Top" ? [...tweets].sort((a, b) => b.counts.likes - a.counts.likes) : tab === "Rising" ? [...tweets].sort((a, b) => b.citations.length - a.citations.length) : tweets;
  return <>
    <div className="feed-tabs">{["For you", "Top", "Rising"].map((name) => <button key={name} className={tab === name ? "selected" : ""} onClick={() => setTab(name)}>{name}</button>)}</div>
    <div className="day-pick"><small>TWEET OF THE DAY</small><p>{tweets[0].tweet.text}</p><span>A HackerX pick · {tweets[0].citations.length} HN citations</span></div>
    {ordered.slice(0, visible).map((record) => <TweetCard key={record.id} record={record} onOpen={onOpen} onProfile={onProfile} />)}
    {visible < ordered.length && <button className="show-more" onClick={() => setVisible((value) => value + 8)}>Show more</button>}
    <div className="fixture-note">Fixture content for UI development</div>
  </>;
}
