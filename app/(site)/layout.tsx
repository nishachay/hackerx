import type { Metadata } from "next";
import { Credit } from "../components/credit";
import { EmbedConsentBar } from "../components/embed-consent-bar";
import { KeyboardShortcuts } from "../components/keyboard-shortcuts";
import { MobileNav, MobileTopBar, RailNav } from "../components/nav";
import { Sidebar } from "../components/sidebar";

// The opengraph-image convention at the app root only covers root-level
// routes, so site pages reference the generated image explicitly.
export const metadata: Metadata = {
  twitter: { card: "summary_large_image" },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <RailNav />
      <MobileTopBar />
      <main id="main" className="main" tabIndex={-1}>
        {children}
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
