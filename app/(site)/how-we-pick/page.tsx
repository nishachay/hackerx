import Link from "next/link";
import { ArrowUpRight, Rss } from "lucide-react";
import { PageHeader } from "../../components/page-header";
import { getSite } from "../../lib/site-data";
import { fullNumber } from "../../lib/format";

export const metadata = {
  title: "How we pick",
  description: "The Hacker News signals, thresholds and ranking that decide which ideas HackerX publishes.",
};

export default function HowWePickPage() {
  const { meta } = getSite();

  return (
    <>
      <PageHeader
        title="How we pick"
        eyebrow="Method"
        lede="A small, opinionated archive. Ideas earn a place by being useful years later, and by being recommended by different people for different reasons."
      />

      <article className="prose">
        <section aria-labelledby="steps-title">
          <h2 id="steps-title">The short version</h2>
          <ol className="steps">
            <li>
              <span className="step-number meta-mono" aria-hidden="true">
                01
              </span>
              <div>
                <h3>Find the links</h3>
                <p>We read public Hacker News stories and comments and keep links to individual public posts. A post needs at least three distinct HN authors citing it before it enters the pool.</p>
              </div>
            </li>
            <li>
              <span className="step-number meta-mono" aria-hidden="true">
                02
              </span>
              <div>
                <h3>Read the post itself</h3>
                <p>The post text, author, date and media are archived from public embed data. Deleted posts and posts we cannot fetch are dropped, with the reason recorded.</p>
              </div>
            </li>
            <li>
              <span className="step-number meta-mono" aria-hidden="true">
                03
              </span>
              <div>
                <h3>Ask what will last</h3>
                <p>Three evergreen questions score each post from 0 to 1. Posts scoring below 60% average, or that are news, drama, promotion, launches or jokes, are left out.</p>
              </div>
            </li>
            <li>
              <span className="step-number meta-mono" aria-hidden="true">
                04
              </span>
              <div>
                <h3>Count independent recommendations</h3>
                <p>Every substantive HN comment on a surviving post is read for stance. Only posts recommended by at least two distinct commenters are published, and each comment is shown with its author.</p>
              </div>
            </li>
            <li>
              <span className="step-number meta-mono" aria-hidden="true">
                05
              </span>
              <div>
                <h3>Rank, then get out of the way</h3>
                <p>Distinct recommenders come first. Ties break on the configured formula: other citing authors, discussion size, recency, and how many different years the idea kept coming back.</p>
              </div>
            </li>
          </ol>
        </section>

        <section aria-labelledby="thresholds-title">
          <h2 id="thresholds-title">Thresholds</h2>
          <dl className="criteria-grid">
            <div>
              <dt>Evergreen score</dt>
              <dd>60%</dd>
              <p>Average of three model questions about lasting value.</p>
            </div>
            <div>
              <dt>Distinct recommenders</dt>
              <dd>2+</dd>
              <p>Different HN accounts whose comment recommends the post.</p>
            </div>
            <div>
              <dt>Citing authors</dt>
              <dd>3+</dd>
              <p>Different HN accounts linking to the post, before scoring.</p>
            </div>
          </dl>
        </section>

        <section aria-labelledby="ai-title">
          <h2 id="ai-title">About the AI step</h2>
          <p>
            Evergreen and stance labels come from Amos, a decision model reached through a public API. It never decides what is true or important on its own: it answers fixed, narrow questions, and a post still needs independent human recommendations to be published. Public post text and HN comment text are sent to that API, which states that submitted requests may be retained to improve its models.
          </p>
        </section>

        <section aria-labelledby="not-title">
          <h2 id="not-title">What this is not</h2>
          <ul className="plain-list">
            <li>No submissions, posting, replies or votes. The archive is read-only.</li>
            <li>No engagement ranking. Engagement counts are shown, never used to qualify a post.</li>
            <li>No outrage feed. Negative and neutral citations are visible on detail pages but do not add recommendations.</li>
            <li>No accounts and no tracking scripts. Saved ideas live in your browser.</li>
          </ul>
        </section>

        <div className="prose-footer">
          <p>
            {fullNumber(meta.counts.published)} ideas from {fullNumber(meta.counts.scored)} scored posts, with {fullNumber(meta.counts.quotes)} archived comments.
          </p>
          <div className="prose-links">
            <a className="button button-secondary" href="/rss.xml">
              <Rss size={16} strokeWidth={1.75} aria-hidden="true" />
              Follow the top 50 by RSS
            </a>
            <Link className="text-link" href="/about">
              About the project and the data
              <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
