import Link from "next/link";
import { ArrowUpRight, Code2, Rss } from "lucide-react";
import { PageHeader } from "../../components/page-header";
import { EmbedSetting } from "../../components/embed-setting";
import { getSite } from "../../lib/site-data";
import { formatDate, fullNumber } from "../../lib/format";
import { og } from "../../lib/og";

export const metadata = {
  title: "About",
  description: "What HackerX is, where its data comes from, and what it deliberately leaves out.",
  ...og("About", "What HackerX is, where its data comes from, and what it deliberately leaves out."),
};

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
            <li>Posts themselves stay on X and are shown with X’s official embed, or as plain links — never copied.</li>
            <li>HN comment text, author and thread links for every recommendation shown.</li>
          </ul>
          <p>
            The archive currently holds {fullNumber(meta.counts.published)} published ideas from {fullNumber(meta.counts.scored)} reviewed posts, spanning {fullNumber(meta.counts.accounts)} accounts and {fullNumber(meta.counts.years)} citation years.
            {meta.fixture ? " This build is showing the preview set while the live pipeline runs." : ` Last rebuilt ${formatDate(meta.generated_at)}.`}
          </p>
        </section>

        <section aria-labelledby="display-title">
          <h2 id="display-title">How posts are shown</h2>
          <p>
            Posts render through X’s official embed, and only after you allow it. Your choice is saved in this browser and you can change it any time.
          </p>
          <EmbedSetting />
        </section>

        <section aria-labelledby="privacy-title">
          <h2 id="privacy-title">Privacy</h2>
          <p>
            There are no accounts, no comments and no votes. Theme, saves, reading history and your embed choice are stored in your browser’s
            local storage and never sent anywhere. Posts load through X’s official embed only after you allow it, and the site may use
            Cloudflare Web Analytics, which is cookieless and aggregate. Details on the{" "}
            <Link className="text-link" href="/privacy">privacy page</Link>.
          </p>
          <p>
            Something of yours in the archive?{" "}
            <a className="text-link" href="https://github.com/nishachay/hackerx/issues/new?template=removal.yml" target="_blank" rel="noreferrer">
              Request removal
            </a>{" "}
            — we aim to act within 24 hours.
          </p>
        </section>

        <section aria-labelledby="independence-title">
          <h2 id="independence-title">Independence</h2>
          <p>
            HackerX is an independent project, not affiliated with X Corp. or Hacker News, nor with the people whose posts appear here. Posts are shown with X’s official embed or linked, never copied. Quotes are attributed to their Hacker News authors and linked to the thread.
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
