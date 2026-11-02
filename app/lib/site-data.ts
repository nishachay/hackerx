import fs from "node:fs";
import path from "node:path";
import fixtureRecords from "../../data/fixture-tweets.json";

/**
 * Single source of truth for the UI.
 *
 * Published data lives in `data/site/` (written by `pipeline/build_site.py`).
 * The fixture is only used while that directory is missing, so a fresh checkout
 * still renders a complete, honest preview.
 */

export type Stance = "recommends" | "neutral" | "critical";

export type Quote = {
  hn_id: string;
  author: string;
  text: string;
  created_at: string;
  year: number;
  story_title: string;
  story_url: string;
  points: number;
  stance: Stance;
};

export type Media = {
  type: "photo" | "video";
  url: string;
  width: number;
  height: number;
  alt: string;
  video_url?: string;
};

export type LinkCard = { title: string; description: string; domain?: string; image?: string; url: string };

export type Card = {
  id: string;
  rank: number;
  url: string;
  text: string;
  created_at: string;
  author: { name: string; handle: string; avatar: string; url: string };
  topic: string;
  kind: string;
  evergreen: number;
  recommenders: number;
  citing_users: number;
  rank_score: number;
  years: number[];
  quotes: Quote[];
  media: Media[];
  link_card: LinkCard | null;
  quoted_tweet: { id: string; text: string; name: string; handle: string } | null;
  stats: { replies: number; reposts: number; likes: number; views: number; bookmarks: number };
};

export type Account = {
  handle: string;
  name: string;
  avatar: string;
  url: string;
  tweet_ids: string[];
  tweet_count: number;
  recommenders: number;
  citations: number;
  topics: Record<string, number>;
};

export type YearGroup = { year: number; tweet_ids: string[]; tweet_count: number; recommenders: number };

export type SiteMeta = {
  generated_at: string;
  site_url: string;
  counts: { scored: number; published: number; accounts: number; years: number; topics: number; quotes: number; recommenders: number };
  topics: [string, number][];
  source: string;
  fixture: boolean;
  siteUrl: string;
};

type RawCitation = {
  hn_id?: string;
  hn_kind?: string;
  hn_author?: string;
  hn_created_at?: string;
  hn_comment_text?: string;
  hn_story_title?: string;
  hn_story_url?: string;
  hn_story_points?: number;
};

type RawRecord = {
  id?: string;
  url?: string;
  text?: string;
  created_at?: string;
  author?: { name?: string; handle?: string; avatar?: string | null; url?: string };
  topic?: string;
  kind?: string;
  evergreen?: number;
  recommenders?: number;
  citing_users?: number;
  rank_score?: number;
  years?: number[];
  quotes?: RawCitation[];
  media?: Media[] | null;
  link_card?: LinkCard | null;
  quoted_tweet?: Card["quoted_tweet"];
  stats?: Card["stats"];
  tweet?: { text?: string; created_at?: string; user?: { name?: string; screen_name?: string; profile_image_url_https?: string } };
  citations?: RawCitation[];
  counts?: { replies?: number; reposts?: number; likes?: number; views?: number; bookmarks?: number };
  fixture?: boolean;
};

const SITE_DIR = path.join(process.cwd(), "data", "site");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hackerx.nishachay.tech";

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(SITE_DIR, file), "utf8")) as T;
  } catch {
    return null;
  }
}

function yearOf(value?: string) {
  const year = Number.parseInt(String(value ?? "").slice(0, 4), 10);
  return Number.isFinite(year) ? year : 0;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normaliseFixture(record: RawRecord): Card {
  const handle = record.author?.handle ?? record.tweet?.user?.screen_name ?? "";
  const name = record.author?.name ?? record.tweet?.user?.name ?? handle;
  const quotes: Quote[] = (record.citations ?? [])
    .filter((citation) => citation.hn_kind === "comment" && citation.hn_comment_text?.trim())
    .map((citation, index) => ({
      hn_id: String(citation.hn_id ?? `${record.id}-${index}`),
      author: String(citation.hn_author ?? "HN reader"),
      text: String(citation.hn_comment_text ?? ""),
      created_at: String(citation.hn_created_at ?? ""),
      year: yearOf(citation.hn_created_at),
      story_title: String(citation.hn_story_title ?? ""),
      story_url: String(citation.hn_story_url ?? ""),
      points: Number(citation.hn_story_points ?? 0),
      stance: "recommends" as Stance,
    }));
  const recommenders = new Set(quotes.map((quote) => quote.author.trim().toLowerCase())).size;
  return {
    id: String(record.id ?? ""),
    rank: 0,
    url: `https://x.com/${handle}/status/${record.id}`,
    text: String(record.text ?? record.tweet?.text ?? ""),
    created_at: String(record.created_at ?? record.tweet?.created_at ?? ""),
    author: {
      name,
      handle,
      avatar: String(record.author?.avatar ?? record.tweet?.user?.profile_image_url_https ?? ""),
      url: handle ? `https://x.com/${handle}` : "",
    },
    topic: String(record.topic ?? "Programming"),
    kind: String(record.kind ?? "insight"),
    evergreen: Number(record.evergreen ?? 0.82),
    recommenders,
    citing_users: Number(record.citing_users ?? recommenders),
    rank_score: Number(record.rank_score ?? 0),
    years: [...new Set(quotes.map((quote) => quote.year).filter(Boolean))].sort(),
    quotes,
    media: Array.isArray(record.media) ? record.media : [],
    link_card: record.link_card ?? null,
    quoted_tweet: record.quoted_tweet ?? null,
    stats: {
      replies: Number(record.counts?.replies ?? record.stats?.replies ?? 0),
      reposts: Number(record.counts?.reposts ?? record.stats?.reposts ?? 0),
      likes: Number(record.counts?.likes ?? record.stats?.likes ?? 0),
      views: Number(record.counts?.views ?? record.stats?.views ?? 0),
      bookmarks: Number(record.counts?.bookmarks ?? record.stats?.bookmarks ?? 0),
    },
  };
}

function rankTweets(cards: Card[]) {
  const ordered = [...cards].sort(
    (a, b) => b.recommenders - a.recommenders || b.rank_score - a.rank_score || b.citing_users - a.citing_users || a.id.localeCompare(b.id),
  );
  return ordered.map((card, index) => ({ ...card, rank: index + 1 }));
}

function buildFixture() {
  const cards = rankTweets((fixtureRecords as RawRecord[]).map(normaliseFixture));
  const accounts = new Map<string, Account>();
  const years = new Map<number, YearGroup>();
  const topics = new Map<string, number>();
  for (const card of cards) {
    const key = card.author.handle.toLowerCase();
    const account = accounts.get(key) ?? {
      handle: card.author.handle,
      name: card.author.name,
      avatar: card.author.avatar,
      url: card.author.url,
      tweet_ids: [],
      tweet_count: 0,
      recommenders: 0,
      citations: 0,
      topics: {},
    };
    account.tweet_ids.push(card.id);
    account.recommenders += card.recommenders;
    account.citations += card.citing_users;
    account.topics[card.topic] = (account.topics[card.topic] ?? 0) + 1;
    accounts.set(key, account);
    for (const year of card.years) {
      const group = years.get(year) ?? { year, tweet_ids: [], tweet_count: 0, recommenders: 0 };
      group.tweet_ids.push(card.id);
      group.recommenders += card.recommenders;
      years.set(year, group);
    }
    topics.set(card.topic, (topics.get(card.topic) ?? 0) + 1);
  }
  const accountList = [...accounts.values()]
    .map((account) => ({ ...account, tweet_count: account.tweet_ids.length }))
    .sort((a, b) => b.tweet_count - a.tweet_count || b.recommenders - a.recommenders);
  const yearList = [...years.values()]
    .map((group) => ({ ...group, tweet_count: group.tweet_ids.length }))
    .sort((a, b) => b.year - a.year);
  const meta: SiteMeta = {
    generated_at: new Date().toISOString(),
    site_url: SITE_URL,
    counts: {
      scored: cards.length,
      published: cards.length,
      accounts: accountList.length,
      years: yearList.length,
      topics: topics.size,
      quotes: cards.reduce((total, card) => total + card.quotes.length, 0),
      recommenders: cards.reduce((total, card) => total + card.recommenders, 0),
    },
    topics: [...topics.entries()].sort((a, b) => b[1] - a[1]),
    source: "data/fixture-tweets.json",
    fixture: true,
    siteUrl: SITE_URL,
  };
  return { cards, accounts: accountList, years: yearList, meta };
}

function load() {
  const tweets = readJson<Card[]>("tweets.json");
  if (!tweets || !Array.isArray(tweets) || tweets.length === 0) return buildFixture();
  const accounts = readJson<Account[]>("accounts.json") ?? [];
  const years = readJson<YearGroup[]>("years.json") ?? [];
  const meta = readJson<Omit<SiteMeta, "fixture" | "siteUrl">>("meta.json");
  const cards = rankTweets(tweets);
  return {
    cards,
    accounts,
    years,
    meta: {
      generated_at: meta?.generated_at ?? "",
      site_url: meta?.site_url ?? SITE_URL,
      counts: meta?.counts ?? {
        scored: cards.length,
        published: cards.length,
        accounts: accounts.length,
        years: years.length,
        topics: new Set(cards.map((card) => card.topic)).size,
        quotes: cards.reduce((total, card) => total + card.quotes.length, 0),
        recommenders: cards.reduce((total, card) => total + card.recommenders, 0),
      },
      topics: meta?.topics ?? [],
      source: meta?.source ?? "data/site",
      fixture: false,
      siteUrl: SITE_URL,
    },
  };
}

let cache: ReturnType<typeof load> | null = null;

export function getSite() {
  if (!cache) cache = load();
  return cache;
}

export function getCards() {
  return getSite().cards;
}

export function getCard(id: string) {
  return getCards().find((card) => card.id === id);
}

export function getAccount(handle: string) {
  return getSite().accounts.find((account) => account.handle.toLowerCase() === handle.toLowerCase());
}

export function getYear(year: number) {
  return getSite().years.find((group) => group.year === year);
}

export function cardsByIds(ids: string[]) {
  const map = new Map(getCards().map((card) => [card.id, card]));
  return ids.map((id) => map.get(id)).filter((card): card is Card => Boolean(card));
}

export { initials };
