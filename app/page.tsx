"use client";

import { useState } from "react";

const navItems = ["Home", "Explore", "By Year", "Accounts", "History", "About"];

export default function Home() {
  const [light, setLight] = useState(false);
  const [page, setPage] = useState("Home");
  return (
    <main className={light ? "site light" : "site"}>
      <div className="layout">
        <nav className="left-nav">
          <a className="brand-mark" href="#home" aria-label="HackerX home">H</a>
          {navItems.map((item) => <button key={item} className={`nav-link ${page === item ? "active" : ""}`} onClick={() => setPage(item)}><span>{({Home:"⌂",Explore:"⌕","By Year":"▦",Accounts:"♙",History:"◷",About:"ⓘ"} as Record<string,string>)[item]}</span>{item}</button>)}
          <button className="nav-link" onClick={() => setLight(!light)}><span>◐</span>{light ? "Dark theme" : "Light theme"}</button>
          <div className="nav-note"><b>HackerX</b><small>Ideas worth returning to</small></div>
        </nav>
        <section className="center-column">
          <header className="page-heading"><div className="page-title">{page}</div><p>Timeless ideas, surfaced by Hacker News readers.</p></header>
          <div className="empty-state"><div className="brand-mark large">H</div><h1>Good ideas deserve to last.</h1><p>The HackerX feed is ready for its first fixture stories.</p></div>
        </section>
        <aside className="right-column">
          <div className="search-placeholder">⌕ <span>Search HackerX</span></div>
          <section className="side-card"><h2>About HackerX</h2><p>Evergreen ideas shared and recommended by the Hacker News community.</p><a href="#how-we-pick">How we pick →</a></section>
          <section className="side-card"><h2>Trending topics</h2>{["Programming", "Artificial intelligence", "Startups"].map((topic, i) => <div className="topic-row" key={topic}><small>Topic · Trending</small><b>{topic}</b><small>{84-i*19} saved ideas</small></div>)}</section>
          <footer>About · Data · RSS · GitHub<br/>© 2026 HackerX</footer>
        </aside>
      </div>
      <nav className="mobile-nav">{navItems.slice(0,5).map((item) => <button key={item} onClick={() => setPage(item)} aria-label={item}>{({Home:"⌂",Explore:"⌕","By Year":"▦",Accounts:"♙",History:"◷"} as Record<string,string>)[item]}</button>)}</nav>
    </main>
  );
}
