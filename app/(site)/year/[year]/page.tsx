import { notFound } from "next/navigation";
import { PageHeader } from "../../../components/page-header";
import { TweetCard } from "../../../components/tweet-card";
import { cardsByIds, getYear, getSite } from "../../../lib/site-data";
import { fullNumber } from "../../../lib/format";

export function generateStaticParams() {
  return getSite().years.map((group) => ({ year: String(group.year) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return { title: `Ideas from ${year}` };
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
            <span>{fullNumber(group.tweet_count)} ideas</span>
            <span className="meta-sep" aria-hidden="true">
              /
            </span>
            <span>{fullNumber(group.recommenders)} recommendations</span>
          </>
        }
      />
      <div className="feed">
        {cards.map((card, index) => (
          <TweetCard key={card.id} card={card} eager={index === 0} />
        ))}
      </div>
    </>
  );
}
