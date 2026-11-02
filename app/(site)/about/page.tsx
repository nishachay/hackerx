import Link from "next/link";
import { ArrowUpRight, Code2, Rss } from "lucide-react";
import { PageHeader } from "../../components/page-header";
import { getSite } from "../../lib/site-data";
import { formatDate, fullNumber } from "../../lib/format";

export const metadata = { title: "About" };

export default function AboutPage() {
  const { meta } = getSite();

  return (
    <>
      <PageHeader
        title="About HackerX"
        eyebrow="The project"
        lede="An independent reading list of ideas that Hacker News keeps recommending, long after the news cycle has moved on."
      />

      <article className="prose">
        <section aria-labelledby="what-title">
          <h2 id="what-title">What HackerX is</h2>
          <p>
            HackerX is a small, static archive of posts that earned a second life in Hacker News comments. Each entry links to the original post, shows the author, and quotes the commenters who recommended it — with their handles and the thread they wrote in. Nothing is paraphrased and nothing is submitted by visitors.
          </p>
          <p>
            The result is closer to a shelf of essays than a social feed. You can browse by topic or year, search the full text and quotes, or sit with one idea at a time in Zen.
          </p>
        </section>

        <section aria-labelledby="data-title">
          <h2 id="data-title">Where the data comes from</h2>
          <ul className="plain-list">
            <li>Hacker News public search and item data, collected in resumable two-week slices.</li>
            <li>Public post embeds for text, author, date, images and link previews.</li>
            <li>HN comment text, author and thread links for every recommendation shown.</li>
          </ul>
          <p>
            The archive currently holds {fullNumber(meta.counts.published)} published ideas from {fullNumber(meta.counts.scored)} reviewed posts, spanning {fullNumber(meta.counts.accounts)} accounts and {fullNumber(meta.counts.years)} citation years.
            {meta.fixture ? " This build is showing the preview set while the live pipeline runs." : ` Last rebuilt ${formatDate(meta.generated_at)}.`}
          </p>
        </section>

        <section aria-labelledby="privacy-title">
          <h2 id="privacy-title">Privacy</h2>
          <p>
            There are no accounts, no comments, no votes and no analytics script. Likes, bookmarks, theme and reading history are stored in your browser’s local storage and never sent anywhere. Clearing site data removes them.
          </p>
        </section>

        <section aria-labelledby="independence-title">
          <h2 id="independence-title">Independence</h2>
          <p>
            HackerX is not affiliated with Hacker News or with the people whose posts appear here. Original posts stay on their platform and are linked, not copied. Quotes are attributed to their Hacker News authors and linked to the thread.
          </p>
        </section>

        <div className="prose-footer">
          <div className="prose-links">
            <Link className="button button-secondary" href="/how-we-pick">
              Read the method
              <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <a className="button button-secondary" href="/rss.xml">
              <Rss size={16} strokeWidth={1.75} aria-hidden="true" />
              RSS feed
            </a>
            <a className="button button-secondary" href="https://github.com/nishachay/hackerx" target="_blank" rel="noreferrer">
              <Code2 size={16} strokeWidth={1.75} aria-hidden="true" />
              Source
            </a>
          </div>
          <p className="prose-signoff">Built as a static site. Typeset in Geist. Icons by Lucide.</p>
        </div>
      </article>
    </>
  );
}
