"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "j", action: "Next idea" },
  { keys: "k", action: "Previous idea" },
  { keys: "o or Enter", action: "Open the idea" },
  { keys: "v", action: "View the post on X" },
  { keys: "s", action: "Save or unsave" },
  { keys: "/", action: "Search" },
  { keys: "?", action: "This help" },
  { keys: "Esc", action: "Close" },
];

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.closest("input, textarea, select, [contenteditable=true]") !== null;
}

function touchOnly() {
  return window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState(-1);
  const [helpOpen, setHelpOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const cards = useCallback(
    () => Array.from(document.querySelectorAll<HTMLElement>("article.tweet-card[data-card-id]")).filter((card) => !card.hidden),
    [],
  );

  useEffect(() => {
    setIndex(-1);
  }, [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (helpOpen && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => closeRef.current?.focus());
    } else if (!helpOpen && dialog.open) {
      dialog.close();
    }
  }, [helpOpen]);

  useEffect(() => {
    if (touchOnly()) return;

    const highlight = (next: number) => {
      const list = cards();
      list.forEach((card, position) => card.classList.toggle("is-keyboard-focus", position === next));
      const current = list[next];
      if (current) current.scrollIntoView({ block: "nearest", behavior: "instant" });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      if (dialogRef.current?.open) return; // Esc is handled by the dialog itself
      const key = event.key;
      if (key === "j" || key === "k" || key === "o" || key === "Enter" || key === "v" || key === "s" || key === "/" || key === "?") {
        if (key === "/" || key === "?") event.preventDefault();
      } else {
        return;
      }

      if (key === "?") {
        setHelpOpen(true);
        return;
      }
      if (key === "/") {
        const sidebarSearch = document.getElementById("site-search");
        if (sidebarSearch && sidebarSearch.offsetParent !== null) {
          sidebarSearch.focus();
        } else if (pathname !== "/search") {
          router.push("/search");
        } else {
          document.getElementById("search-page-input")?.focus();
        }
        return;
      }

      const list = cards();
      if (list.length === 0) return;
      setIndex((previous) => {
        const current = key === "j" ? Math.min(previous + 1, list.length - 1) : key === "k" ? Math.max(previous - 1, 0) : previous < 0 ? 0 : previous;
        if (key === "j" || key === "k") {
          highlight(current);
          return current;
        }
        const card = list[current];
        if (!card) return previous;
        if (key === "o" || key === "Enter") {
          const id = card.dataset.cardId;
          if (id) router.push(`/tweet/${id}`);
        } else if (key === "v") {
          const url = card.dataset.cardUrl;
          if (url) window.open(url, "_blank", "noopener");
        } else if (key === "s") {
          card.querySelector<HTMLButtonElement>(".action[aria-pressed]")?.click();
        }
        return current;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cards, pathname, router]);

  return (
    <dialog
      ref={dialogRef}
      className="shortcut-help"
      aria-labelledby="shortcut-help-title"
      onClose={() => setHelpOpen(false)}
      onClick={(event) => {
        if (event.target === dialogRef.current) setHelpOpen(false);
      }}
    >
      <div className="shortcut-help-head">
        <h2 id="shortcut-help-title">Keyboard shortcuts</h2>
        <button ref={closeRef} type="button" className="icon-button" onClick={() => setHelpOpen(false)} aria-label="Close shortcuts help">
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      <ul className="shortcut-help-list">
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.keys}>
            <kbd>{shortcut.keys}</kbd>
            <span>{shortcut.action}</span>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
