import { PageHeader } from "../../components/page-header";
import { EmbedSetting } from "../../components/embed-setting";

export const metadata = {
  title: "Privacy",
  description: "What HackerX stores in your browser, how X's embed works, and how to request a removal.",
};

const REMOVAL_URL = "https://github.com/nishachay/hackerx/issues/new?template=removal.yml";

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Privacy" eyebrow="Your data" lede="HackerX has no accounts and does no tracking of its own. This page lists everything that touches your browser." />

      <article className="prose">
        <section aria-labelledby="storage-title">
          <h2 id="storage-title">Stored in your browser</h2>
          <p>A few preferences live in your browser’s local storage and never leave it:</p>
          <ul className="plain-list">
            <li>Theme (dark or light).</li>
            <li>Saved and liked ideas.</li>
            <li>Reading history, so the History page can retrace your visits.</li>
            <li>Your embed choice: Show posts or Links only.</li>
          </ul>
          <p>Clearing your browser’s site data removes all of it.</p>
        </section>

        <section aria-labelledby="embed-title">
          <h2 id="embed-title">X’s official embed</h2>
          <p>
            Posts are shown using X’s official embed (X for Websites), and only after you choose “Show posts”. When the embed loads, X may set
            cookies and collect data as described in{" "}
            <a className="text-link" href="https://help.x.com/en/x-for-websites-ads-info-and-privacy" target="_blank" rel="noreferrer">
              X’s privacy notes for X for Websites
            </a>
            . With “Links only”, nothing from X is ever loaded and posts are plain links.
          </p>
          <EmbedSetting />
        </section>

        <section aria-labelledby="analytics-title">
          <h2 id="analytics-title">Analytics</h2>
          <p>
            The site may use Cloudflare Web Analytics, which is cookieless and collects only aggregate usage data. HackerX itself runs no
            accounts and no tracking.
          </p>
        </section>

        <section aria-labelledby="removal-title">
          <h2 id="removal-title">Request removal</h2>
          <p>
            Want a post or Hacker News comment removed from the archive?{" "}
            <a className="text-link" href={REMOVAL_URL} target="_blank" rel="noreferrer">
              Request removal
            </a>{" "}
            and we aim to act within 24 hours.
          </p>
        </section>
      </article>
    </>
  );
}
