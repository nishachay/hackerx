"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  Compass,
  History,
  Home,
  Info,
  ListChecks,
  MoreHorizontal,
  Rss,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "./brand-mark";
import { Credit } from "./credit";
import { ThemeToggle } from "./theme-toggle";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const primaryNav: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/year", label: "By year", icon: CalendarDays },
  { href: "/accounts", label: "Accounts", icon: Users },
];

export const moreNav: NavItem[] = [
  { href: "/zen", label: "Zen", icon: Sparkles },
  { href: "/on-this-day", label: "On this day", icon: CalendarClock },
  { href: "/history", label: "History", icon: History },
];

export const aboutNav: NavItem[] = [
  { href: "/how-we-pick", label: "How we pick", icon: ListChecks },
  { href: "/about", label: "About", icon: Info },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
];

export const allNav = [...primaryNav, ...moreNav, ...aboutNav];
const sheetNav = [...moreNav, ...aboutNav];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function RailLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      <span className="nav-label">{item.label}</span>
      <span className="nav-indicator" aria-hidden="true" />
    </Link>
  );
}

export function RailNav() {
  const pathname = usePathname() || "/";
  return (
    <nav className="rail" aria-label="Primary">
      <Link href="/" className="brand" aria-label="HackerX home">
        <BrandMark />
        <span className="brand-name">HackerX</span>
      </Link>

      <div className="rail-group">
        <p className="rail-label">Browse</p>
        {primaryNav.map((item) => (
          <RailLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      <div className="rail-group">
        <p className="rail-label">More</p>
        {moreNav.map((item) => (
          <RailLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      <div className="rail-group">
        <p className="rail-label">HackerX</p>
        {aboutNav.map((item) => (
          <RailLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      <div className="rail-foot">
        <ThemeToggle />
        <a className="nav-link nav-link-quiet" href="/rss.xml">
          <Rss size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className="nav-label">RSS feed</span>
        </a>
        <p className="rail-note">Ideas worth keeping, surfaced by Hacker News readers.</p>
        <Credit />
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetActive = [...sheetNav].some((item) => isActive(pathname, item.href));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add("sheet-open");
      window.requestAnimationFrame(() => closeRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => document.documentElement.classList.remove("sheet-open");
  }, []);

  const close = () => setOpen(false);

  return (
    <>
      <nav className="tabbar" aria-label="Primary">
        {primaryNav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`tab${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={`tab${sheetActive || open ? " is-active" : ""}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      <dialog
        ref={dialogRef}
        className="more-sheet"
        aria-labelledby="more-title"
        onClose={() => {
          setOpen(false);
          document.documentElement.classList.remove("sheet-open");
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="more-sheet-head">
          <h2 id="more-title">More</h2>
          <button ref={closeRef} type="button" className="icon-button" onClick={close} aria-label="Close menu">
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="More pages">
          <ul className="more-sheet-list">
            {sheetNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={`sheet-link${active ? " is-active" : ""}`} onClick={close} aria-current={active ? "page" : undefined}>
                    <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="more-sheet-foot">
          <ThemeToggle />
          <a className="sheet-link" href="/rss.xml">
            <Rss size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>RSS feed</span>
          </a>
        </div>
      </dialog>
    </>
  );
}

export function MobileTopBar() {
  return (
    <header className="mobile-top">
      <Link href="/" className="brand" aria-label="HackerX home">
        <BrandMark />
        <span className="brand-name">HackerX</span>
      </Link>
      <div className="mobile-top-actions">
        <Link href="/search" className="icon-button" aria-label="Search HackerX">
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <ThemeToggle compact />
      </div>
    </header>
  );
}
