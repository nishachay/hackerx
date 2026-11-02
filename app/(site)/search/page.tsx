import { PageHeader } from "../../components/page-header";
import { SearchView } from "../../components/search-view";
import { getCards } from "../../lib/site-data";

export const metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <>
      <PageHeader title="Search" eyebrow="Find" lede="Search the ideas, the people who wrote them, and the Hacker News comments that recommend them." />
      <SearchView cards={getCards()} />
    </>
  );
}
