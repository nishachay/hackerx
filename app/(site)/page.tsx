import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "../components/page-header";
import { TodayPick } from "../components/today-pick";
import { Feed } from "../components/feed";
import { getCards, getSite } from "../lib/site-data";
import { og } from "../lib/og";
import { fullNumber } from "../lib/format";

export const metadata = {
  title: { absolute: "HackerX — ideas worth keeping" },
  description: "Timeless ideas recommended by Hacker News readers, with the comments that recommend them.",
  ...og("HackerX — ideas worth keeping", "Timeless ideas recommended by Hacker News readers, with the comments that recommend them."),
};

export default function HomePage() {
  const cards = getCards();
  const { meta } = getSite();

  if (cards.length === 0) {
    return (
      <>
        <PageHeader title="Home" lede="Timeless ideas the Hacker News community keeps recommending." />
        <div className="empty-state">
          <p className="empty-title">No picks yet</p>
          <p>The archive fills as soon as the pipeline publishes its first ranked set.</p>
        </div>
      </>
    );
  }

  const day = Math.floor(Date.now() / 86_400_000);
  const pick = cards[day % Math.min(cards.length, 30)] ?? cards[0];

  return (
    <>
      <PageHeader
        title="Home"
        lede="Timeless ideas the Hacker News community keeps recommending."
        meta={
          <>
            <span>{fullNumber(meta.counts.published)} ideas</span>
            <span className="meta-sep" aria-hidden="true">
              /
            </span>
            <span>{fullNumber(meta.counts.recommenders)} recommendations</span>
            <span className="meta-sep" aria-hidden="true">
              /
            </span>
            <span>{fullNumber(meta.counts.accounts)} accounts</span>
          </>
        }
      />
      <TodayPick card={pick} />
      <Feed cards={cards} />
      <p className="feed-footnote">
        Ranked by distinct Hacker News recommenders, then longevity and discussion.{" "}
        <Link href="/how-we-pick" className="text-link">
          How we pick
          <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
        </Link>
      </p>
    </>
  );
}
