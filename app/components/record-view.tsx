"use client";

import { useEffect } from "react";

export function RecordView({ id }: { id: string }) {
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("hackerx-history") || "[]");
      const previous = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
      localStorage.setItem("hackerx-history", JSON.stringify([id, ...previous.filter((item) => item !== id)].slice(0, 60)));
    } catch {
      /* storage unavailable: history simply stays empty */
    }
  }, [id]);

  return null;
}
