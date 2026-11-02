"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Upload } from "lucide-react";
import type { Card } from "../lib/site-data";
import { readSaved, readSavedAts, readSavedIds, writeSaved, type SavedEntry } from "../lib/saved-list";
import { buildExportEntries, parseImport, toCsv } from "../lib/saved-export";
import { TweetCard } from "./tweet-card";

type Lists = { saved: string[]; liked: string[]; history: string[] };

function read(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function download(filename: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function HistoryView({ cards }: { cards: Card[] }) {
  const [lists, setLists] = useState<Lists>({ saved: [], liked: [], history: [] });
  const [ready, setReady] = useState(false);
  const [importNote, setImportNote] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLists({ saved: readSavedIds(), liked: read("hackerx-liked"), history: read("hackerx-history") });
    setReady(true);
  }, []);

  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((card): card is Card => Boolean(card));
  const saved = pick(lists.saved);
  const liked = pick(lists.liked);
  const viewed = pick(lists.history);
  const empty = ready && saved.length === 0 && liked.length === 0 && viewed.length === 0;

  const exportJson = () => {
    const entries = buildExportEntries(readSavedIds(), readSavedAts(), cards);
    download("hackerx-saved.json", JSON.stringify(entries, null, 2) + "\n", "application/json");
  };

  const exportCsv = () => {
    const entries = buildExportEntries(readSavedIds(), readSavedAts(), cards);
    download("hackerx-saved.csv", toCsv(entries), "text/csv");
  };

  const importJson = async (file: File) => {
    try {
      const known = new Set(cards.map((card) => card.id));
      const { ids, savedAts } = parseImport(await file.text(), known);
      const entries: SavedEntry[] = ids.map((id) => ({ id, saved_at: savedAts[id] ?? new Date().toISOString() }));
      writeSaved(entries);
      setLists((current) => ({ ...current, saved: ids }));
      setImportNote(`Imported ${ids.length} saved ${ids.length === 1 ? "idea" : "ideas"}.`);
    } catch (error) {
      setImportNote(error instanceof Error ? error.message : "That file could not be read.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  if (!ready) {
    return <p className="result-count" role="status">
        Loading your history…
      </p>;
  }

  if (empty) {
    return (
      <div className="empty-state">
        <p className="empty-title">Your history is empty</p>
        <p>Bookmark an idea or open one, and it will wait for you here. Everything stays on this device.</p>
        <div className="empty-actions">
          <Link className="button button-primary" href="/">
            Browse the picks
          </Link>
          <Link className="button button-secondary" href="/explore">
            Explore by topic
          </Link>
          <button type="button" className="button button-secondary" onClick={() => importRef.current?.click()}>
            <Upload size={15} strokeWidth={1.75} aria-hidden="true" />
            Import a saved list
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Import saved ideas from a JSON export"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importJson(file);
            }}
          />
        </div>
        {importNote ? (
          <p className="history-import-note" role="status">
            {importNote}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="history">
      {saved.length > 0 ? (
        <section className="history-section" aria-labelledby="history-saved">
          <div className="history-tools">
            <h2 id="history-saved">Saved</h2>
            <div className="history-tools-actions" role="group" aria-label="Export and import saved ideas">
              <button type="button" className="button button-secondary" onClick={exportJson}>
                <Download size={15} strokeWidth={1.75} aria-hidden="true" />
                Export JSON
              </button>
              <button type="button" className="button button-secondary" onClick={exportCsv}>
                <Download size={15} strokeWidth={1.75} aria-hidden="true" />
                Export CSV
              </button>
              <button type="button" className="button button-secondary" onClick={() => importRef.current?.click()}>
                <Upload size={15} strokeWidth={1.75} aria-hidden="true" />
                Import
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label="Import saved ideas from a JSON export"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importJson(file);
                }}
              />
            </div>
          </div>
          {importNote ? (
            <p className="history-import-note" role="status">
              {importNote}
            </p>
          ) : null}
          <div className="feed">
            {saved.map((card) => (
              <TweetCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}
      {liked.length > 0 ? (
        <section className="history-section" aria-labelledby="history-liked">
          <h2 id="history-liked">Liked</h2>
          <div className="feed">
            {liked.map((card) => (
              <TweetCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}
      {viewed.length > 0 ? (
        <section className="history-section" aria-labelledby="history-viewed">
          <h2 id="history-viewed">Recently viewed</h2>
          <div className="feed">
            {viewed.map((card) => (
              <TweetCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
