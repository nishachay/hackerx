"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function ShareButton({ path, label = "Copy link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button type="button" className="button button-secondary" onClick={copy}>
        {copied ? <Check size={16} strokeWidth={1.75} aria-hidden="true" /> : <Link2 size={16} strokeWidth={1.75} aria-hidden="true" />}
        {copied ? "Link copied" : label}
      </button>
      <span className="sr-only" role="status">
        {copied ? "Link copied to clipboard." : ""}
      </span>
    </>
  );
}
