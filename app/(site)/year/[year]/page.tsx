import { notFound } from "next/navigation";
import { PageHeader } from "../../../components/page-header";
import { TweetCard } from "../../../components/tweet-card";
import { cardsByIds, getYear, getSite } from "../../../lib/site-data";
import { pluralize } from "../../../lib/format";
import { og } from "../../../lib/og";

export function generateStaticParams() {
  return getSite().years.map((group) => ({ year: String(group.year) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const group = getYear(Number.parseInt(year, 10));
  const title = `Ideas cited in ${year}`;
  const description = group
    ? `${group.tweet_count} ${group.tweet_count === 1 ? "post" : "posts"} cited by Hacker News readers in ${year}.`
    : `Ideas cited in ${year} in the HackerX archive.`;
  return { title, description, ...og(title, description) };
}

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: value } = await params;
  const year = Number.parseInt(value, 10);
  const group = getYear(year);
  if (!group) notFound();
  const cards = cardsByIds(group.tweet_ids);

  return (
    <>
      <PageHeader
        title={String(group.year)}
        eyebrow="By year"
        lede={`Ideas that Hacker News readers were still recommending in ${group.year}.`}
        meta={
          <>
            <span>{pluralize(group.tweet_count, "post cited", "posts cited")}</span>
            <span className="meta-sep" aria-hidden="true">
              /
            </span>
            <span>{pluralize(group.recommenders, "citation")}</span>
          </>
        }
      />
      <p className="year-note">Counts show how many picks Hacker News readers cited in each year, not when the post was written.</p>
      <div className="feed">
        {cards.map((card, index) => (
          <TweetCard key={card.id} card={card} eager={index === 0} />
        ))}
      </div>
    </>
  );
}
