import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/page-header";
import { getSite } from "../../lib/site-data";
import { fullNumber } from "../../lib/format";

export const metadata = {
  title: "By year",
  description: "Follow HackerX picks across the years and see which ideas kept their value.",
};

export default function YearIndexPage() {
  const { years } = getSite();
  const max = Math.max(1, ...years.map((group) => group.tweet_count));

  return (
    <>
      <PageHeader
        title="By year"
        eyebrow="Archive"
        lede="Ideas keep their value across decades. Follow the years Hacker News readers kept returning to."
        meta={<span>{years.length} years with citations</span>}
      />
      {years.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No dated citations yet</p>
          <p>The archive will fill in once the pipeline imports Hacker News discussions.</p>
        </div>
      ) : (
        <>
          <ul className="year-rows">
            {years.map((group) => (
              <li key={group.year}>
                <Link className="year-row" href={`/year/${group.year}`}>
                  <span className="year-row-year">{group.year}</span>
                  <span className="year-row-bar" aria-hidden="true">
                    <span style={{ inlineSize: `${Math.max(4, (group.tweet_count / max) * 100)}%` }} />
                  </span>
                  <span className="year-row-stat">
                    <b>{fullNumber(group.tweet_count)}</b> {group.tweet_count === 1 ? "idea" : "ideas"}
                  </span>
                  <span className="year-row-stat year-row-stat-wide">
                    <b>{fullNumber(group.recommenders)}</b> recommendations
                  </span>
                  <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="year-row-chevron" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="feed-footnote">
            A year counts every Hacker News comment that recommended an idea that year. Open a year to read the full set.
          </p>
        </>
      )}
    </>
  );
}
