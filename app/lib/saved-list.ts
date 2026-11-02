"use client";

/** Saved ideas live in localStorage as [{ id, saved_at }]. Older visits
 * stored a plain array of id strings; both shapes read the same. */

export type SavedEntry = { id: string; saved_at: string };

const KEY = "hackerx-saved";

export function readSaved(): SavedEntry[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .map((item): SavedEntry | null => {
        if (typeof item === "string") return { id: item, saved_at: "" };
        if (item && typeof item === "object" && typeof (item as SavedEntry).id === "string") {
          return { id: (item as SavedEntry).id, saved_at: typeof (item as SavedEntry).saved_at === "string" ? (item as SavedEntry).saved_at : "" };
        }
        return null;
      })
      .filter((entry): entry is SavedEntry => entry !== null);
  } catch {
    return [];
  }
}

export function readSavedIds(): string[] {
  return readSaved().map((entry) => entry.id);
}

export function readSavedAts(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of readSaved()) map[entry.id] = entry.saved_at;
  return map;
}

export function writeSaved(entries: SavedEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* private mode: the toggle still reflects this visit */
  }
}

export function toggleSaved(id: string): boolean {
  const entries = readSaved();
  const existing = entries.some((entry) => entry.id === id);
  if (existing) {
    writeSaved(entries.filter((entry) => entry.id !== id));
    return false;
  }
  writeSaved([...entries, { id, saved_at: new Date().toISOString() }]);
  return true;
}
