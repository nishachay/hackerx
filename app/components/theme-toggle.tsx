"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.dataset.theme = next;
    try {
      localStorage.setItem("hackerx-theme", next);
    } catch {
      /* storage may be unavailable; the theme still applies for this page */
    }
    setTheme(next);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => root.classList.remove("theme-switching")));
  };

  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      className={compact ? "icon-button theme-toggle is-compact" : "nav-link theme-toggle"}
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      {compact ? null : <span className="nav-label">{theme === "dark" ? "Light theme" : "Dark theme"}</span>}
    </button>
  );
}
