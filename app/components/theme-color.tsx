"use client";

import { useEffect } from "react";

function applyThemeColor() {
  const light = document.documentElement.dataset.theme === "light";
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", light ? "#ffffff" : "#000000");
}

export function ThemeColor() {
  useEffect(() => {
    applyThemeColor();
    const observer = new MutationObserver(applyThemeColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return null;
}
