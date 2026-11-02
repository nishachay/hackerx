"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "hackerx-scroll";

type Positions = Record<string, number>;

function key() {
  return `${window.location.pathname}${window.location.search}`;
}

function readPositions(): Positions {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function savePosition() {
  try {
    const positions = readPositions();
    positions[key()] = window.scrollY;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    /* session storage can be unavailable; scrolling still works */
  }
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ScrollManager() {
  const pathname = usePathname();
  const popped = useRef(false);

  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        savePosition();
      });
    };

    const onPop = () => {
      popped.current = true;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("popstate", onPop);
    window.addEventListener("pagehide", savePosition);
    savePosition();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pagehide", savePosition);
      if (frame) window.cancelAnimationFrame(frame);
      history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        if (popped.current) {
          popped.current = false;
          const target = readPositions()[key()] ?? 0;
          const restore = () => window.scrollTo({ top: target, behavior: "instant" });
          restore();
          window.setTimeout(restore, 150);
          window.setTimeout(restore, 400);
        } else {
          window.scrollTo({ top: 0, behavior: "instant" });
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(outer);
      if (inner) window.cancelAnimationFrame(inner);
    };
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      history.pushState(null, "", hash);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
