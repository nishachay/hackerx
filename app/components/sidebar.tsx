import Link from "next/link";
import { ArrowUpRight, Compass, Rss, Search } from "lucide-react";
import { getSite } from "../lib/site-data";
import { BrandMark } from "./brand-mark";
import { Credit } from "./credit";
import { formatDate, fullNumber, initials, pluralize } from "../lib/format";

export function Sidebar({ activeTopic }: { activeTopic?: string }) {
  const { meta, cards } = getSite();
  const topTopics = (meta.topics.length > 0 ? meta.topics : [...new Map(cards.map((card) => [card.topic || "Other", 1])).entries()])
    .slice(0, 5);

  return (
    <aside className="side" aria-label="About and discover">
      <form className="search-box" action="/search" method="get" role="search">
        <label className="sr-only" htmlFor="site-search">
          Search HackerX
        </label>
        <Search size={17} strokeWidth={1.75} aria-hidden="true" />
        <input id="site-search" name="q" type="search" placeholder="Search ideas, people, topics" autoComplete="off" />
        <button type="submit" className="search-submit" aria-label="Search">
          <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </form>

      <section className="side-card side-intro">
        <div className="side-card-head">
          <BrandMark size={24} className="mini-mark" />
          <h2>Ideas worth keeping</h2>
        </div>
        <p>HackerX collects posts that Hacker News readers recommend years after they were written. No feed, no outrage, just ideas that age well.</p>
        <Link prefetch={false} className="text-link" href="/how-we-pick">
          See how we pick
          <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </section>

      <section className="side-card">
        <div className="side-card-title">
          <Compass size={15} strokeWidth={1.75} aria-hidden="true" />
          <h2>Explore topics</h2>
        </div>
        <ul className="topic-list">
          {topTopics.map(([topic, count]) => (
            <li key={topic}>
              <Link prefetch={false} href={`/explore?topic=${encodeURIComponent(topic)}`} className={activeTopic === topic ? "is-active" : undefined}>
                <span>{topic || "Other"}</span>
                <span className="topic-count">{fullNumber(count)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link prefetch={false} className="text-link" href="/explore">
          Browse every topic
          <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </section>

      <section className="side-card side-data">
        <div className="side-card-title">
          <Rss size={15} strokeWidth={1.75} aria-hidden="true" />
          <h2>Data &amp; feeds</h2>
        </div>
        {meta.fixture ? (
          <p>
            You’re seeing the preview set while the pipeline runs. The live archive replaces it as soon as <code>data/site/</code> exists.
          </p>
        ) : (
          <p>
            {pluralize(meta.counts.published, "pick")} from {pluralize(meta.counts.scored, "reviewed post")}, updated {formatDate(meta.generated_at)}.
          </p>
        )}
        <div className="side-links">
          <a href="/rss.xml">RSS · top 50</a>
          <Link prefetch={false} href="/accounts">Accounts</Link>
          <Link prefetch={false} href="/about">About the data</Link>
        </div>
      </section>

      <footer className="side-footer">
        <p>
          Built for reading. {pluralize(meta.counts.recommenders, "recommendation")} from {pluralize(meta.counts.accounts, "account")}.
        </p>
        <p>Posts are shown with X’s official embed or linked, never copied. X’s embed may set cookies.</p>
        <Credit />
      </footer>
    </aside>
  );
}

export function AccountMark({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <span className="account-avatar account-avatar-fallback" style={{ width: size, height: size }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
