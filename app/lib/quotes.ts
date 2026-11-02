import type { Card, Quote } from "./site-data";

/** Client-safe helpers shared by cards, RSS, metadata and exports. */

export function topQuote(card: Card): Quote | null {
  return card.quotes.find((quote) => quote.stance === "recommends") ?? card.quotes[0] ?? null;
}

export function recommendationBadge(recommenders: number): string {
  return recommenders === 1 ? "Shared by 1 HN user" : `Recommended by ${recommenders} HN users`;
}
