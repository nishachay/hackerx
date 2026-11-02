import fs from "node:fs";
import path from "node:path";
import fixtureRecords from "../../data/fixture-tweets.json";

/**
 * Single source of truth for the UI.
 *
 * Published data lives in `data/site/` (written by `pipeline/build_site.py`).
 * It carries only our own metadata per post: id, url, author handle,
 * created_at, topic, kind, recommenders, citing_users, rank_score, years,
 * HN quotes and rank. Post text, media, stats, display names and avatars
 * are never published; posts render through X's official embed.
 *
 * The fixture is only used while that directory is missing, so a fresh
 * checkout still renders a complete, honest preview.
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
  edited_for_display?: boolean;
};

export type Card = {
  id: string;
  rank: number;
  url: string;
  created_at: string;
  author: { handle: string };
  topic: string;
  kind: string;
  recommenders: number;
  citing_users: number;
  rank_score: number;
  years: number[];
  quotes: Quote[];
};

export type Account = {
  handle: string;
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
  hn_comment_text?: string;
  hn_kind?: string;
  hn_author?: string;
  hn_created_at?: string;
  hn_story_title?: string;
  hn_story_url?: string;
  hn_story_points?: number;
};

type RawRecord = {
  id?: string;
  created_at?: string;
  author?: { handle?: string };
  topic?: string;
  kind?: string;
  recommenders?: number;
  citing_users?: number;
  rank_score?: number;
  years?: number[];
  quotes?: RawCitation[];
  tweet?: { created_at?: string; user?: { screen_name?: string } };
  citations?: RawCitation[];
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

function normaliseQuote(citation: RawCitation, fallbackId: string): Quote | null {
  const text = String(citation.hn_comment_text ?? "").trim();
  if (!text) return null;
  return {
    hn_id: String(citation.hn_id ?? fallbackId),
    author: String(citation.hn_author ?? "HN reader"),
    text,
    created_at: String(citation.hn_created_at ?? ""),
    year: yearOf(citation.hn_created_at),
    story_title: String(citation.hn_story_title ?? ""),
    story_url: String(citation.hn_story_url ?? ""),
    points: Number(citation.hn_story_points ?? 0),
    stance: "recommends",
  };
}

function normaliseFixture(record: RawRecord): Card {
  const handle = record.author?.handle ?? record.tweet?.user?.screen_name ?? "";
  const quotes: Quote[] = (record.citations ?? [])
    .filter((citation) => citation.hn_kind === "comment")
    .map((citation, index) => normaliseQuote(citation, `${record.id}-${index}`))
    .filter((quote): quote is Quote => quote !== null);
  const recommenders = new Set(quotes.map((quote) => quote.author.trim().toLowerCase())).size;
  return {
    id: String(record.id ?? ""),
    rank: 0,
    url: `https://x.com/${handle}/status/${record.id}`,
    created_at: String(record.created_at ?? record.tweet?.created_at ?? ""),
    author: { handle },
    topic: String(record.topic ?? "Programming"),
    kind: String(record.kind ?? "insight"),
    recommenders,
    citing_users: Number(record.citing_users ?? recommenders),
    rank_score: Number(record.rank_score ?? 0),
    years: [...new Set(quotes.map((quote) => quote.year).filter(Boolean))].sort(),
    quotes,
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
      url: card.author.handle ? `https://x.com/${card.author.handle}` : "",
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
