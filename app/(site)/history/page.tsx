import { PageHeader } from "../../components/page-header";
import { HistoryView } from "../../components/history-view";
import { getCards } from "../../lib/site-data";
import { og } from "../../lib/og";

export const metadata = {
  title: "History",
  description: "Ideas you saved, liked and recently viewed on this device. Stored only in your browser.",
  ...og("History", "Ideas you saved, liked and recently viewed on this device. Stored only in your browser."),
};

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        title="History"
        eyebrow="On this device"
        lede="Saved, liked and recently viewed ideas. Stored in your browser only — no account, no tracking."
      />
      <HistoryView cards={getCards()} />
    </>
  );
}
