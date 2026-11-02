"use client";

/**
 * Consent state for X's official embed. "all" loads widgets.js and renders
 * posts through X for Websites; "links" keeps every post as a plain link.
 * Stored in localStorage and broadcast so embeds, the banner and the About
 * page setting stay in sync.
 */

export type EmbedConsent = "all" | "links" | null;

const KEY = "hackerx-embed-consent";
const EVENT = "hackerx-embed-consent";

export function getEmbedConsent(): EmbedConsent {
  try {
    const value = localStorage.getItem(KEY);
    return value === "all" || value === "links" ? value : null;
  } catch {
    return null;
  }
}

export function setEmbedConsent(value: "all" | "links") {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* private mode: choice lasts for this page view */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

export function onEmbedConsentChange(callback: (value: EmbedConsent) => void) {
  const listener = (event: Event) => callback((event as CustomEvent<EmbedConsent>).detail ?? getEmbedConsent());
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
