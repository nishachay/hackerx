import { Credit } from "../components/credit";
import { MobileNav, MobileTopBar, RailNav } from "../components/nav";
import { Sidebar } from "../components/sidebar";

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
    </div>
  );
}
