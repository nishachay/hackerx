import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Bookmark, Eye, Heart, MessageCircle, Quote as QuoteIcon, Repeat2 } from "lucide-react";
import { Avatar } from "../../../components/avatar";
import { ExportCard } from "../../../components/export-card";
import { RecordView } from "../../../components/record-view";
import { ShareButton } from "../../../components/share-button";
import { getCard, getCards } from "../../../lib/site-data";
import { compactNumber, formatDate, fullNumber } from "../../../lib/format";

export function generateStaticParams() {
  return getCards().map((card) => ({ id: card.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = getCard(id);
  if (!card) return { title: "Idea" };
  return { title: `${card.author.name}: ${card.text.slice(0, 70)}`, description: card.text.slice(0, 180) };
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
          <Avatar name={card.author.name} src={card.author.avatar} size={52} />
          <div className="detail-author-copy">
            <Link href={`/accounts/${card.author.handle}`} className="author-link detail-author-name">
              {card.author.name}
            </Link>
            <p>
              <span className="meta-mono">@{card.author.handle}</span>
              <span className="meta-dot" aria-hidden="true">
                ·
              </span>
              <time className="meta-mono" dateTime={card.created_at}>
                {formatDate(card.created_at)}
              </time>
            </p>
          </div>
          <a className="icon-button" href={card.url} target="_blank" rel="noreferrer" aria-label="Open the original post">
            <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </a>
        </header>

        <h1 className="detail-text">{card.text}</h1>

        {card.quoted_tweet ? (
          <div className="quoted-tweet detail-quoted">
            <p className="quoted-tweet-meta">
              {card.quoted_tweet.name} <span>@{card.quoted_tweet.handle}</span>
            </p>
            <p>{card.quoted_tweet.text}</p>
          </div>
        ) : null}

        {card.media.length > 0 ? (
          <div className={`detail-media${card.media.length > 1 ? " is-grid" : ""}`}>
            {card.media.map((media, index) => (
              <a key={`${media.url}-${index}`} href={media.video_url || media.url} target="_blank" rel="noreferrer" aria-label={media.type === "video" ? "Open video" : "Open image"}>
                <img src={media.url} alt={media.alt || ""} loading={index === 0 ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" />
                {media.type === "video" ? <span className="media-play">Video</span> : null}
              </a>
            ))}
          </div>
        ) : null}

        {card.link_card ? (
          <a className="link-card detail-link-card" href={card.link_card.url || card.url} target="_blank" rel="noreferrer">
            {card.link_card.image ? <img className="link-card-image" src={card.link_card.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : null}
            <span className="link-card-copy">
              <span className="link-card-domain">{card.link_card.domain || "Link"}</span>
              <span className="link-card-title">{card.link_card.title || card.link_card.description}</span>
              {card.link_card.description ? <span className="link-card-description">{card.link_card.description}</span> : null}
            </span>
          </a>
        ) : null}

        <div className="detail-tags">
          <span className="recommended-badge">
            <QuoteIcon size={13} strokeWidth={2} aria-hidden="true" />
            Recommended by {card.recommenders} Hacker News {card.recommenders === 1 ? "user" : "users"}
          </span>
          <span className="topic-chip">{card.topic || "Ideas"}</span>
          <span className="topic-chip">{card.kind || "idea"}</span>
        </div>

        <dl className="detail-stats">
          <div>
            <dt>
              <MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" /> Comments
            </dt>
            <dd>{fullNumber(card.quotes.length)}</dd>
          </div>
          <div>
            <dt>
              <Repeat2 size={16} strokeWidth={1.75} aria-hidden="true" /> Reposts
            </dt>
            <dd>{compactNumber(card.stats.reposts)}</dd>
          </div>
          <div>
            <dt>
              <Heart size={16} strokeWidth={1.75} aria-hidden="true" /> Likes
            </dt>
            <dd>{compactNumber(card.stats.likes)}</dd>
          </div>
          <div>
            <dt>
              <Eye size={16} strokeWidth={1.75} aria-hidden="true" /> Views
            </dt>
            <dd>{compactNumber(card.stats.views)}</dd>
          </div>
          <div>
            <dt>
              <Bookmark size={16} strokeWidth={1.75} aria-hidden="true" /> Saves
            </dt>
            <dd>{compactNumber(card.stats.bookmarks)}</dd>
          </div>
        </dl>

        <div className="detail-actions">
          <a className="button button-primary" href={card.url} target="_blank" rel="noreferrer">
            Open the original post
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
          </a>
          <ExportCard card={card} />
          <ShareButton path={`/tweet/${card.id}`} />
        </div>

        <section className="discussion" id="discussion" aria-labelledby="discussion-title">
          <div className="section-head">
            <h2 id="discussion-title">Why Hacker News recommends it</h2>
            <p>
              {card.quotes.length} {card.quotes.length === 1 ? "comment" : "comments"} from {card.citing_users} distinct readers
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
                    <blockquote>{quote.text}</blockquote>
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
