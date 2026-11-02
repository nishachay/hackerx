import { PageHeader } from "../../components/page-header";
import { ExploreGrid } from "../../components/explore-grid";
import { getCards, getSite } from "../../lib/site-data";

export const metadata = { title: "Explore" };

export default function ExplorePage() {
  const cards = getCards();
  const { meta } = getSite();
  const topics = (meta.topics.length > 0 ? meta.topics : [...new Map(cards.map((card) => [card.topic || "Other", 1])).entries()]).slice(0, 12);

  return (
    <>
      <PageHeader
        title="Explore"
        eyebrow="Browse"
        lede="Every idea in the archive, grouped by the topic readers filed it under."
        meta={<span>{cards.length} ideas</span>}
      />
      <ExploreGrid cards={cards} topics={topics} />
    </>
  );
}
