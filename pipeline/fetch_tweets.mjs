import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// react-tweet was removed: it reads posts through an unofficial X endpoint,
// which X's Terms of Service and Developer Policy forbid. The fetch pipeline
// is retired until a compliant source (the paid X API) is wired up.
function getTweet() {
  throw new Error('Fetch path removed for X policy compliance; no compliant fetch source is configured.');
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}

const inputPath = path.resolve(root, option('--input', 'data/tweet-candidates.json'));
const outputPath = path.resolve(root, option('--output', 'data/fetched-tweets.json'));
const refreshArchives = args.includes('--refresh-archives');
const limitValue = option('--limit', '0');
const limit = Number.parseInt(limitValue, 10) || 0;
const cacheDir = path.join(root, 'data/cache/tweets');
await mkdir(cacheDir, { recursive: true });
const candidates = JSON.parse(await readFile(inputPath, 'utf8'));
const selected = limit > 0 ? candidates.slice(0, limit) : candidates;

const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const response = await originalFetch(input, init);
    if (![429, 503].includes(response.status) || attempt === 6) return response;
    const header = response.headers.get('retry-after');
    const retryAt = header && Number.isNaN(Number(header)) ? Date.parse(header) : NaN;
    const waitMs = header && !Number.isNaN(Number(header))
      ? Math.max(1000, Number(header) * 1000)
      : !Number.isNaN(retryAt) ? Math.max(1000, retryAt - Date.now()) : Math.min(60_000, 2 ** attempt * 1000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error('Retry limit reached');
};

async function fetchOne(candidate, previousTweet = undefined, force = false) {
  const id = String(candidate.id);
  const cachePath = path.join(cacheDir, `${id}.json`);
  if (!force) {
    try {
      await readFile(cachePath, 'utf8');
      return;
    } catch { /* no cached result: fetch it below */ }
  }

  let entry;
  try {
    const tweet = await getTweet(id);
    if (!tweet) throw new Error('Tweet is unavailable or deleted');
    entry = { id, fetched_at: new Date().toISOString(), ok: true, deleted_on_x: false, tweet };
  } catch (error) {
    const message = String(error?.message ?? error);
    entry = previousTweet
      ? { id, fetched_at: new Date().toISOString(), ok: true, deleted_on_x: true, refetch_error: message, tweet: previousTweet }
      : { id, fetched_at: new Date().toISOString(), ok: false, error: message };
  }

  const tempPath = `${cachePath}.${process.pid}.tmp`;
  await writeFile(tempPath, JSON.stringify(entry), 'utf8');
  await rename(tempPath, cachePath);
  console.log(`${entry.ok ? 'fetched' : 'failed'} ${id}${entry.ok ? '' : `: ${entry.error}`}`);
}

let cursor = 0;
async function worker() {
  while (cursor < selected.length) {
    const candidate = selected[cursor++];
    await fetchOne(candidate);
  }
}
await Promise.all(Array.from({ length: Math.min(4, selected.length) }, worker));

if (refreshArchives) {
  const archiveDir = path.join(root, 'data/curated');
  let archiveFiles = [];
  try { archiveFiles = (await readdir(archiveDir)).filter((name) => name.endsWith('.json')); }
  catch { /* archive directory is created in the saving phase */ }
  let archiveCursor = 0;
  async function archiveWorker() {
    while (archiveCursor < archiveFiles.length) {
      const filename = archiveFiles[archiveCursor++];
      const archivePath = path.join(archiveDir, filename);
      const archive = JSON.parse(await readFile(archivePath, 'utf8'));
      const id = archive.id ?? path.basename(filename, '.json');
      await fetchOne({ id }, archive.tweet ?? archive, true);
      const refreshed = JSON.parse(await readFile(path.join(cacheDir, `${id}.json`), 'utf8'));
      const shouldMarkDeleted = refreshed.deleted_on_x === true;
      const shouldClearDeleted = !shouldMarkDeleted && archive.deleted_on_x === true;
      if (shouldMarkDeleted || shouldClearDeleted) {
        if (shouldMarkDeleted) archive.deleted_on_x = true;
        else delete archive.deleted_on_x;
        const tempArchivePath = `${archivePath}.${process.pid}.tmp`;
        await writeFile(tempArchivePath, JSON.stringify(archive, null, 2), 'utf8');
        await rename(tempArchivePath, archivePath);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, archiveFiles.length) }, archiveWorker));
}

const found = [];
const rejected = [];
for (const candidate of selected) {
  const entry = JSON.parse(await readFile(path.join(cacheDir, `${candidate.id}.json`), 'utf8'));
  if (entry.ok) found.push({ ...candidate, tweet: entry.tweet, tweet_fetched_at: entry.fetched_at });
  else rejected.push({ id: candidate.id, reason: entry.error });
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(`${outputPath}.tmp`, JSON.stringify(found), 'utf8');
await rename(`${outputPath}.tmp`, outputPath);
const rejectedPath = path.join(root, 'data/rejected-fetch.json');
await writeFile(rejectedPath, JSON.stringify(rejected, null, 2), 'utf8');
console.log(`Wrote ${found.length} tweets; ${rejected.length} first-fetch failures; cache is resumable.`);
