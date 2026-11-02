import { PageHeader } from "../../components/page-header";
import { OnThisDayView } from "../../components/on-this-day-view";
import { getCards } from "../../lib/site-data";
import { og } from "../../lib/og";

export const metadata = {
  title: "On this day",
  description: "HackerX picks that Hacker News readers were discussing on this day in past years.",
  ...og("On this day", "HackerX picks that Hacker News readers were discussing on this day in past years."),
};

export default function OnThisDayPage() {
  const cards = getCards();
  const buckets: Record<string, string[]> = {};
  for (const card of cards) {
    for (const day of new Set(card.quotes.map((quote) => quote.created_at.slice(5, 10)).filter(Boolean))) {
      buckets[day] = [...(buckets[day] ?? []), card.id];
    }
  }
  for (const key of Object.keys(buckets)) {
    buckets[key] = [...new Set(buckets[key])];
  }

  return (
    <>
      <PageHeader
        title="On this day"
        eyebrow="Anniversaries"
        lede="The ideas Hacker News readers were recommending on this date, in years past."
        meta={<span>{Object.keys(buckets).length} dates in the archive</span>}
      />
      <OnThisDayView cards={cards} buckets={buckets} fallbackIds={cards.slice(0, 5).map((card) => card.id)} />
    </>
  );
}
