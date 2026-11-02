"use client";

import { useEffect, useState } from "react";
import { HomeFeed } from "./components/home-feed";
import { tweets } from "./lib/data";
import { TweetCard } from "./components/tweet-card";
import { ExtraPage } from "./components/extra-pages";
import { ExportCard } from "./components/export-card";

const navItems = ["Home", "Explore", "By Year", "Accounts", "Zen", "On this day", "History", "How we pick", "About"];

export default function Home() {
  const [light, setLight] = useState(false);
  const [page, setPage] = useState("Home");
  const [selectedId, setSelectedId] = useState("");
  const [profileHandle, setProfileHandle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const currentTweet = tweets.find((record) => record.id === selectedId);
  const profileTweets = tweets.filter((record) => record.author.handle === profileHandle);
  const searchResults = tweets.filter((record) => `${record.tweet.text} ${record.author.name} ${record.author.handle}`.toLowerCase().includes(searchQuery.toLowerCase()));
  useEffect(() => {
    setLight(localStorage.getItem("hackerx-theme") === "light");
    const linkedTweet = new URLSearchParams(window.location.search).get("tweet");
    if (linkedTweet && tweets.some((record) => record.id === linkedTweet)) { setSelectedId(linkedTweet); setPage("Tweet"); }
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    let goPending = false;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement)) { event.preventDefault(); document.getElementById("site-search")?.focus(); }
      else if (event.key === "Escape") { setPage("Home"); (document.activeElement as HTMLElement | null)?.blur?.(); }
      else if (event.key.toLowerCase() === "g") { goPending = true; window.setTimeout(() => { goPending = false; }, 800); }
      else if (goPending && event.key.toLowerCase() === "h") { setPage("Home"); goPending = false; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const openTweet = (id: string) => {
    setSelectedId(id);
    const previous = JSON.parse(localStorage.getItem("hackerx-history") || "[]") as string[];
    localStorage.setItem("hackerx-history", JSON.stringify([id, ...previous.filter((item) => item !== id)].slice(0, 50)));
    window.history.pushState({}, "", `/?tweet=${encodeURIComponent(id)}`);
    setPage("Tweet");
  };
  const toggleTheme = () => { const next = !light; setLight(next); localStorage.setItem("hackerx-theme", next ? "light" : "dark"); };
  return (
    <main className={light ? "site light" : "site"}>
      <div className="layout">
        <nav className="left-nav">
          <a className="brand-mark" href="#home" aria-label="HackerX home">H</a>
          {navItems.map((item) => <button key={item} className={`nav-link ${page === item ? "active" : ""}`} onClick={() => setPage(item)}><span>{({Home:"⌂",Explore:"⌕","By Year":"▦",Accounts:"♙",History:"◷",About:"ⓘ"} as Record<string,string>)[item]}</span>{item}</button>)}
          <button className="nav-link" onClick={toggleTheme}><span>◐</span>{light ? "Dark theme" : "Light theme"}</button>
          <div className="nav-note"><b>HackerX</b><small>Ideas worth returning to</small></div>
        </nav>
        <section className="center-column">
          <header className="page-heading"><div className="page-title">{page === "Home" ? "Home" : page}</div><p>Timeless ideas, surfaced by Hacker News readers.</p></header>
          {page === "Home" ? <HomeFeed onOpen={openTweet} onProfile={(handle) => { setProfileHandle(handle); setPage("Profile"); }} /> : null}
          {page === "Tweet" && currentTweet ? <section className="detail-view"><button className="back-link" onClick={() => { setPage("Home"); window.history.pushState({}, "", "/"); }}>← <span>Back to Home</span></button><div className="detail-author"><div className="avatar">{currentTweet.author.name.split(/\s+/).map((part) => part[0]).slice(0,2).join("")}</div><div><b>{currentTweet.author.name}</b><small>@{currentTweet.author.handle}</small></div></div><p className="detail-text">{currentTweet.tweet.text}</p><ExportCard record={currentTweet} /><div className="detail-stats">{currentTweet.counts.views.toLocaleString()} views · {currentTweet.counts.likes.toLocaleString()} likes · {currentTweet.counts.bookmarks.toLocaleString()} saves</div><div className="detail-citations"><h2>Recommended on Hacker News</h2><p className="detail-intro">Readers cited this idea in {currentTweet.citations.length} discussions.</p>{currentTweet.citations.map((citation) => <article className="citation-card" key={citation.hn_id}><div className="hn-badge">H</div><div><b>{citation.hn_author}</b><small>{citation.hn_created_at.slice(0,10)} · {citation.hn_story_title}</small><p>{citation.hn_comment_text}</p><a href={citation.hn_story_url} target="_blank" rel="noreferrer">Read discussion on Hacker News ↗</a></div></article>)}</div></section> : null}
          {page === "Profile" ? <section className="profile-view"><div className="profile-banner"/><div className="profile-heading"><div className="avatar profile-avatar">{profileHandle.slice(0,2).toUpperCase()}</div><h1>{profileTweets[0]?.author.name ?? profileHandle}</h1><p>@{profileHandle}</p><span>{profileTweets.length} ideas cited by Hacker News readers</span></div>{profileTweets.map((record) => <TweetCard key={record.id} record={record} onOpen={openTweet} onProfile={setProfileHandle} />)}</section> : null}
          {page === "Search" ? <section className="search-view"><label htmlFor="feed-search">Search timeless ideas</label><input id="feed-search" autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Try a topic, author, or phrase"/><p>{searchResults.length} matching ideas</p>{searchResults.map((record) => <TweetCard key={record.id} record={record} onOpen={openTweet} onProfile={(handle) => { setProfileHandle(handle); setPage("Profile"); }} />)}</section> : null}
          {navItems.includes(page) && page !== "Home" ? <ExtraPage page={page} onOpen={(id) => { setSelectedId(id); setPage("Tweet"); }} onProfile={(handle) => { setProfileHandle(handle); setPage("Profile"); }} /> : null}
        </section>
        <aside className="right-column">
          <form className="search-placeholder" onSubmit={(event) => { event.preventDefault(); setPage("Search"); }}><span>⌕</span><input id="site-search" aria-label="Search HackerX" placeholder="Search HackerX" value={searchQuery} onFocus={() => setPage("Search")} onChange={(event) => setSearchQuery(event.target.value)} /></form>
          <section className="side-card"><h2>About HackerX</h2><p>Evergreen ideas shared and recommended by the Hacker News community.</p><a href="#how-we-pick">How we pick →</a></section>
          <section className="side-card"><h2>Trending topics</h2>{["Programming", "Artificial intelligence", "Startups"].map((topic, i) => <div className="topic-row" key={topic}><small>Topic · Trending</small><b>{topic}</b><small>{84-i*19} saved ideas</small></div>)}</section>
          <footer>About · Data · RSS · GitHub<br/>© 2026 HackerX</footer>
        </aside>
      </div>
      <nav className="mobile-nav">{navItems.slice(0,5).map((item) => <button key={item} onClick={() => setPage(item)} aria-label={item}>{({Home:"⌂",Explore:"⌕","By Year":"▦",Accounts:"♙",History:"◷"} as Record<string,string>)[item]}</button>)}</nav>
    </main>
  );
}
