"use client";

import { useEffect, useState } from "react";
import { getEmbedConsent, onEmbedConsentChange, setEmbedConsent, type EmbedConsent } from "../lib/embed-consent";

/** One-time consent bar for X's official embed. */
export function EmbedConsentBar() {
  const [mounted, setMounted] = useState(false);
  const [consent, setConsent] = useState<EmbedConsent>(null);

  useEffect(() => {
    setMounted(true);
    setConsent(getEmbedConsent());
    return onEmbedConsentChange(setConsent);
  }, []);

  if (!mounted || consent !== null) return null;

  return (
    <div className="embed-consent" role="region" aria-label="How posts are shown">
      <p>Posts are shown using X’s embed, which may set cookies and collect data.</p>
      <div className="embed-consent-actions">
        <button type="button" className="button button-primary" onClick={() => setEmbedConsent("all")}>
          Show posts
        </button>
        <button type="button" className="button button-secondary" onClick={() => setEmbedConsent("links")}>
          Links only
        </button>
      </div>
    </div>
  );
}
