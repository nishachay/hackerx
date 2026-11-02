import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { BrandMark } from "./components/brand-mark";
import { Credit } from "./components/credit";
import { EmbedConsentBar } from "./components/embed-consent-bar";
import { KeyboardShortcuts } from "./components/keyboard-shortcuts";
import { MobileNav, MobileTopBar, RailNav } from "./components/nav";
import { Sidebar } from "./components/sidebar";

/** The 404 page keeps the normal site chrome: rail, top bar, sidebar and
 * footer, including the independence note. */
export default function NotFound() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <RailNav />
      <MobileTopBar />
      <main id="main" className="main" tabIndex={-1}>
        <div className="not-found">
          <BrandMark size={44} />
          <p className="eyebrow">404</p>
          <h1>That idea isn’t here</h1>
          <p>The link may be older than the archive, or the post was removed from its source.</p>
          <div className="empty-actions">
            <Link className="button button-primary" href="/">
              <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
              Back to the picks
            </Link>
            <Link className="button button-secondary" href="/explore">
              <Compass size={16} strokeWidth={1.75} aria-hidden="true" />
              Explore topics
            </Link>
          </div>
        </div>
      </main>
      <Sidebar />
      <footer className="credit-mobile">
        <Credit />
      </footer>
      <MobileNav />
      <KeyboardShortcuts />
      <EmbedConsentBar />
    </div>
  );
}
