import type { Card } from "./site-data";
import { yearOf } from "./format";

/**
 * Export/import for the saved list. The export carries only our own public
 * metadata — id, url, handle, topic, year, saved_at — never post text,
 * media, counts or display names.
 */

export type SavedExportEntry = {
  id: string;
  url: string;
  handle: string;
  topic: string;
  year: string;
  saved_at: string;
};

export const SAVED_EXPORT_FIELDS = ["id", "url", "handle", "topic", "year", "saved_at"] as const;

export function buildExportEntries(ids: string[], savedAts: Record<string, string>, cards: Card[]): SavedExportEntry[] {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return ids
    .map((id) => {
      const card = byId.get(id);
      if (!card) return null;
      return {
        id: card.id,
        url: card.url,
        handle: card.author.handle,
        topic: card.topic,
        year: yearOf(card.created_at),
        saved_at: savedAts[id] ?? "",
      };
    })
    .filter((entry): entry is SavedExportEntry => entry !== null);
}

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(entries: SavedExportEntry[]): string {
  const header = SAVED_EXPORT_FIELDS.join(",");
  const rows = entries.map((entry) => SAVED_EXPORT_FIELDS.map((field) => csvCell(entry[field])).join(","));
  return [header, ...rows].join("\n") + "\n";
}

export type ParsedImport = { ids: string[]; savedAts: Record<string, string> };

/** Validate an exported JSON payload; unknown ids and bad rows are ignored. */
export function parseImport(raw: string, knownIds: Set<string>): ParsedImport {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("The file is not a HackerX export (expected a JSON list).");
  const ids: string[] = [];
  const savedAts: Record<string, string> = {};
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const id = (row as Record<string, unknown>).id;
    if (typeof id !== "string" || !id || !knownIds.has(id)) continue;
    if (ids.includes(id)) continue;
    const savedAt = (row as Record<string, unknown>).saved_at;
    ids.push(id);
    if (typeof savedAt === "string" && savedAt) savedAts[id] = savedAt;
  }
  return { ids, savedAts };
}
