import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="not-found">
      <span className="brand-mark" aria-hidden="true">
        H
      </span>
      <p className="eyebrow">404</p>
      <h1>That idea isn’t here</h1>
      <p>The link may be older than the archive, or the post was removed from its source.</p>
      <div className="empty-actions">
        <Link className="button button-primary" href="/">
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          Back to the picks
        </Link>
        <Link className="button button-secondary" href="/explore">
          <Compass size={16} strokeWidth={1.75} aria-hidden="true" />
          Explore topics
        </Link>
      </div>
    </main>
  );
}
