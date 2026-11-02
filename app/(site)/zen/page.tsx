import { PageHeader } from "../../components/page-header";
import { ZenView } from "../../components/zen-view";
import { getCards } from "../../lib/site-data";

export const metadata = { title: "Zen" };

export default function ZenPage() {
  return (
    <>
      <PageHeader title="Zen" eyebrow="Slow reading" lede="One idea at a time. No infinite feed, no counts to chase." />
      <ZenView cards={getCards()} />
    </>
  );
}
