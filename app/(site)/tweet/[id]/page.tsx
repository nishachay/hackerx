import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Quote as QuoteIcon } from "lucide-react";
import { Avatar } from "../../../components/avatar";
import { ExportCard } from "../../../components/export-card";
import { RecordView } from "../../../components/record-view";
import { ShareButton } from "../../../components/share-button";
import { TweetEmbed } from "../../../components/tweet-embed";
import { getCard, getCards } from "../../../lib/site-data";
import { recommendationBadge, topQuote } from "../../../lib/quotes";
import { og } from "../../../lib/og";
import { QuoteText } from "../../../lib/quote-text";
import { formatDate, fullNumber } from "../../../lib/format";

export function generateStaticParams() {
  return getCards().map((card) => ({ id: card.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = getCard(id);
  if (!card) return { title: "Idea" };
  const badge = recommendationBadge(card.recommenders);
  const title = `@${card.author.handle}, ${badge.charAt(0).toLowerCase()}${badge.slice(1)}`;
  const quote = topQuote(card);
  const description = `${card.topic || "Ideas"} on HackerX${quote ? ` — “${quote.text.slice(0, 140)}” (HN reader @${quote.author})` : ""}`;
  return { title, description, ...og(title, description) };
}

const stanceLabel: Record<string, string> = { recommends: "Recommends", neutral: "Cites it", critical: "Disagrees" };

export default async function TweetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = getCard(id);
  if (!card) notFound();

  return (
    <>
      <RecordView id={card.id} />
      <div className="detail-topbar">
        <Link href="/" className="back-link">
          <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          Home
        </Link>
        <span className="meta-mono">Rank #{card.rank}</span>
      </div>

      <article className="detail">
        <header className="detail-author">
          <Avatar name={card.author.handle} size={52} />
          <div className="detail-author-copy">
            <Link href={`/accounts/${card.author.handle}`} className="author-link detail-author-name">
              @{card.author.handle}
            </Link>
            <p>
              <time className="meta-mono" dateTime={card.created_at}>
                {formatDate(card.created_at)}
              </time>
              <span className="topic-chip">{card.topic || "Ideas"}</span>
              {card.thread ? (
                <a className="thread-chip" href={card.url} target="_blank" rel="noreferrer">
                  Thread · Read the full thread on X
                  <ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" />
                </a>
              ) : null}
            </p>
          </div>
          <a className="icon-button" href={card.url} target="_blank" rel="noreferrer" aria-label="View on X">
            <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </a>
        </header>

        <TweetEmbed id={card.id} url={card.url} handle={card.author.handle} createdAt={card.created_at} eager />

        <div className="detail-tags">
          <span className="recommended-badge">
            <QuoteIcon size={13} strokeWidth={2} aria-hidden="true" />
            {recommendationBadge(card.recommenders)}
          </span>
          <span className="topic-chip">{card.kind || "idea"}</span>
        </div>

        <div className="detail-actions">
          <a className="button button-primary" href={card.url} target="_blank" rel="noreferrer">
            View on X
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
          </a>
          <ExportCard card={card} />
          <ShareButton path={`/tweet/${card.id}`} />
        </div>

        <section className="discussion" id="discussion" aria-labelledby="discussion-title">
          <div className="section-head">
            <h2 id="discussion-title">Why Hacker News recommends it</h2>
            <p>
              {fullNumber(card.quotes.length)} {card.quotes.length === 1 ? "comment" : "comments"} from{" "}
              {card.recommenders === 1 ? "1 distinct recommending reader" : `${fullNumber(card.recommenders)} distinct recommending readers`}
              {card.years.length > 0 ? `, between ${card.years[0]} and ${card.years[card.years.length - 1]}` : ""}.
            </p>
          </div>

          {card.quotes.length === 0 ? (
            <div className="empty-state empty-state-quiet">
              <p className="empty-title">No comment text archived</p>
              <p>This idea passed on citation count, but the original comments are no longer available.</p>
            </div>
          ) : (
            <ol className="quote-list">
              {card.quotes.map((quote) => (
                <li key={quote.hn_id} id={`hn-${quote.hn_id}`}>
                  <figure className="quote-item">
                    <div className="quote-item-head">
                      <QuoteIcon size={14} strokeWidth={2} aria-hidden="true" />
                      <span className="quote-author">@{quote.author}</span>
                      <span className={`stance stance-${quote.stance}`}>{stanceLabel[quote.stance] ?? "Cites it"}</span>
                      {quote.year ? <span className="meta-mono">{quote.year}</span> : null}
                    </div>
                    <blockquote>
                      <QuoteText text={quote.text} />
                    </blockquote>
                    <figcaption>
                      {quote.story_title ? <span>{quote.story_title}</span> : <span>Hacker News discussion</span>}
                      {quote.story_url ? (
                        <a href={quote.story_url} target="_blank" rel="noreferrer" className="text-link">
                          Read the thread
                          <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
                        </a>
                      ) : null}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ol>
          )}
        </section>
      </article>
    </>
  );
}
