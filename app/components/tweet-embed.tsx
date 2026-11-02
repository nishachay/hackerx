import { ExternalLink } from "lucide-react";
import { formatDate } from "../lib/format";

type Props = {
  id: string;
  url: string;
  handle: string;
  createdAt: string;
  eager?: boolean;
};

/**
 * Links-only presentation: the post itself is never copied. Stage 3
 * upgrades this to X's official embed behind consent; this fallback is
 * also what renders while the embed loads or if it fails.
 */
export function TweetEmbed({ url, handle, createdAt }: Props) {
  return (
    <div className="tweet-embed-fallback">
      <p className="tweet-embed-line">
        <span className="meta-mono">@{handle}</span>
        {createdAt ? (
          <>
            <span className="meta-dot" aria-hidden="true">
              ·
            </span>
            <time className="meta-mono" dateTime={createdAt}>
              {formatDate(createdAt)}
            </time>
          </>
        ) : null}
      </p>
      <a className="text-link tweet-embed-link" href={url} target="_blank" rel="noreferrer">
        View on X
        <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
      </a>
    </div>
  );
}
