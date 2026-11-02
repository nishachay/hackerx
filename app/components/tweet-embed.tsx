"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { formatDate } from "../lib/format";
import { getEmbedConsent, onEmbedConsentChange, type EmbedConsent } from "../lib/embed-consent";

declare global {
  interface Window {
    twttr?: {
      ready?: (callback: () => void) => void;
      widgets?: {
        createTweet: (
          id: string,
          element: HTMLElement,
          options: { theme?: string; dnt?: boolean; conversation?: string },
        ) => Promise<HTMLElement | undefined>;
      };
    };
  }
}

let widgetsPromise: Promise<NonNullable<Window["twttr"]>> | null = null;

/** Load https://platform.twitter.com/widgets.js exactly once, after consent. */
function loadWidgets() {
  if (widgetsPromise) return widgetsPromise;
  widgetsPromise = new Promise((resolve, reject) => {
    if (window.twttr?.widgets) {
      resolve(window.twttr as NonNullable<Window["twttr"]>);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = () => {
      const twttr = window.twttr;
      if (!twttr) {
        widgetsPromise = null;
        reject(new Error("widgets.js loaded without window.twttr"));
        return;
      }
      if (twttr.ready) twttr.ready(() => resolve(twttr as NonNullable<Window["twttr"]>));
      else resolve(twttr as NonNullable<Window["twttr"]>);
    };
    script.onerror = () => {
      widgetsPromise = null;
      reject(new Error("widgets.js failed to load"));
    };
    document.head.appendChild(script);
  });
  return widgetsPromise;
}

type Props = {
  id: string;
  url: string;
  handle: string;
  createdAt: string;
  eager?: boolean;
};

function LinksOnly({ url, handle, createdAt }: { url: string; handle: string; createdAt: string }) {
  return (
    <div className="tweet-embed-fallback">
      <p className="tweet-embed-line">
        <span className="meta-mono">@{handle}</span>
        {createdAt ? (
          <>
            <span className="meta-dot" aria-hidden="true">
              ·
            </span>
            <time className="meta-mono" dateTime={createdAt}>
              {formatDate(createdAt)}
            </time>
          </>
        ) : null}
      </p>
      <a className="text-link tweet-embed-link" href={url} target="_blank" rel="noreferrer">
        View on X
        <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
      </a>
    </div>
  );
}

/**
 * Renders the post through X's official embed (X for Websites), only after
 * the visitor chose "Show posts". Each embed is created lazily when its
 * card scrolls near the viewport. Deleted or private posts (createTweet
 * resolves with no element) hide the whole card. The links-only fallback
 * covers the loading state, failures and the "Links only" choice.
 */
export function TweetEmbed({ id, url, handle, createdAt, eager = false }: Props) {
  const [consent, setConsent] = useState<EmbedConsent>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed" | "empty">("idle");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConsent(getEmbedConsent());
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    const offConsent = onEmbedConsentChange(setConsent);
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      offConsent();
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (consent !== "all") return;
    const node = containerRef.current;
    if (!node) return;
    let cancelled = false;

    const create = async () => {
      setStatus("loading");
      try {
        const twttr = await loadWidgets();
        if (cancelled || !slotRef.current) return;
        slotRef.current.innerHTML = "";
        const element = await twttr.widgets?.createTweet(id, slotRef.current, {
          theme,
          dnt: true,
          conversation: "none",
        });
        if (cancelled) return;
        if (!element) {
          // Deleted or private post: hide the card completely.
          setStatus("empty");
          const card = node.closest(".tweet-card");
          if (card instanceof HTMLElement) card.hidden = true;
        } else {
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("failed");
      }
    };

    if (eager) {
      void create();
      return () => {
        cancelled = true;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void create();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [consent, id, eager, theme]);

  if (consent === "all" && status !== "failed" && status !== "empty") {
    const loading = status !== "ready";
    return (
      <div className={`tweet-embed${loading ? " is-loading" : ""}`} ref={containerRef} aria-busy={loading}>
        {loading ? (
          <div className="tweet-embed-skeleton" aria-hidden="true">
            <span className="skeleton skeleton-row skeleton-row-head" />
            <span className="skeleton skeleton-row" />
            <span className="skeleton skeleton-row" />
            <span className="skeleton skeleton-row skeleton-row-short" />
          </div>
        ) : null}
        <div className="tweet-embed-slot" ref={slotRef} />
      </div>
    );
  }
  if (status === "empty") return null;
  return <LinksOnly url={url} handle={handle} createdAt={createdAt} />;
}
