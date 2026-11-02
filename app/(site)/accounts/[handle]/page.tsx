import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Avatar } from "../../../components/avatar";
import { TweetCard } from "../../../components/tweet-card";
import { cardsByIds, getAccount, getSite } from "../../../lib/site-data";
import { fullNumber } from "../../../lib/format";

export function generateStaticParams() {
  return getSite().accounts.map((account) => ({ handle: account.handle }));
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const account = getAccount(handle);
  return { title: account ? `${account.name} (@${account.handle})` : "Account" };
}

export default async function AccountPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const account = getAccount(decodeURIComponent(handle));
  if (!account) notFound();
  const cards = cardsByIds(account.tweet_ids);
  const topics = Object.entries(account.topics).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <>
      <header className="profile-head">
        <div className="profile-identity">
          <Avatar name={account.name} src={account.avatar} size={72} />
          <div>
            <p className="eyebrow">Account</p>
            <h1>{account.name}</h1>
            <p className="profile-handle meta-mono">@{account.handle}</p>
          </div>
        </div>
        <dl className="profile-stats">
          <div>
            <dt>Ideas</dt>
            <dd>{fullNumber(account.tweet_count)}</dd>
          </div>
          <div>
            <dt>Recommendations</dt>
            <dd>{fullNumber(account.recommenders)}</dd>
          </div>
          <div>
            <dt>HN citations</dt>
            <dd>{fullNumber(account.citations)}</dd>
          </div>
        </dl>
        {topics.length > 0 ? (
          <div className="chip-row profile-topics">
            {topics.map(([topic, count]) => (
              <span className="chip chip-static" key={topic}>
                {topic}
                <span className="chip-count">{fullNumber(count)}</span>
              </span>
            ))}
          </div>
        ) : null}
        {account.url ? (
          <a className="text-link" href={account.url} target="_blank" rel="noreferrer">
            Open @{account.handle}'s profile
            <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
          </a>
        ) : null}
      </header>
      <div className="feed profile-feed">
        {cards.map((card, index) => (
          <TweetCard key={card.id} card={card} eager={index === 0} />
        ))}
      </div>
    </>
  );
}
