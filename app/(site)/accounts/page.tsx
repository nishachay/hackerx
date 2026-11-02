import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/page-header";
import { Avatar } from "../../components/avatar";
import { getSite } from "../../lib/site-data";
import { fullNumber } from "../../lib/format";

export const metadata = {
  title: "Accounts",
  description: "The authors whose ideas Hacker News readers keep recommending, ranked by recommendations.",
};

export default function AccountsPage() {
  const { accounts, meta } = getSite();

  return (
    <>
      <PageHeader
        title="Accounts"
        eyebrow="People"
        lede="The people behind the ideas in this archive, ranked by how often Hacker News readers recommend them."
        meta={<span>{fullNumber(meta.counts.accounts)} accounts</span>}
      />
      {accounts.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No accounts yet</p>
          <p>Accounts appear as soon as the pipeline publishes ranked ideas.</p>
        </div>
      ) : (
        <ul className="account-list">
          {accounts.map((account, index) => (
            <li key={account.handle}>
              <Link className="account-row" href={`/accounts/${account.handle}`}>
                <span className="account-rank meta-mono">{String(index + 1).padStart(2, "0")}</span>
                <Avatar name={account.name} src={account.avatar} size={40} />
                <span className="account-copy">
                  <span className="account-name">{account.name}</span>
                  <span className="account-handle meta-mono">@{account.handle}</span>
                </span>
                <span className="account-stat">
                  <span className="account-stat-value">{fullNumber(account.tweet_count)}</span>
                  <span className="account-stat-label">{account.tweet_count === 1 ? "idea" : "ideas"}</span>
                </span>
                <span className="account-stat account-stat-wide">
                  <span className="account-stat-value">{fullNumber(account.recommenders)}</span>
                  <span className="account-stat-label">recommendations</span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="account-chevron" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="feed-footnote">
        Every idea is linked to its original post.{" "}
        <Link className="text-link" href="/how-we-pick">
          How ranking works
          <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
        </Link>
      </p>
    </>
  );
}
