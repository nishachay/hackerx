"use client";

import { useEffect, useState } from "react";
import { getEmbedConsent, onEmbedConsentChange, setEmbedConsent, type EmbedConsent } from "../lib/embed-consent";

/** About-page control to change the embed consent choice at any time. */
export function EmbedSetting() {
  const [consent, setConsent] = useState<EmbedConsent>(null);

  useEffect(() => {
    setConsent(getEmbedConsent());
    return onEmbedConsentChange(setConsent);
  }, []);

  return (
    <div className="embed-setting">
      <div className="embed-setting-actions" role="group" aria-label="How posts are shown">
        <button
          type="button"
          className={`button ${consent === "all" ? "button-primary" : "button-secondary"}`}
          aria-pressed={consent === "all"}
          onClick={() => setEmbedConsent("all")}
        >
          Show posts
        </button>
        <button
          type="button"
          className={`button ${consent === "links" ? "button-primary" : "button-secondary"}`}
          aria-pressed={consent === "links"}
          onClick={() => setEmbedConsent("links")}
        >
          Links only
        </button>
      </div>
      <p className="embed-setting-note" role="status">
        {consent === "all"
          ? "Posts render with X’s official embed. X may set cookies and collect data."
          : consent === "links"
            ? "Posts are shown as links only. Nothing from X is loaded."
            : "You have not chosen yet. The site asks once, the first time."}
      </p>
    </div>
  );
}
