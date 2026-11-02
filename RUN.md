# Long-running pipeline steps

Run these blocks on the machine that holds `data/cache/`. Each block pulls first, writes one log, and ends with a short tail. Nothing here uses `set -e`, so a failed step still prints its log.

## Step 1 — Finish the historical HN pull

The pull cache is resumable; this command skips completed date/tag/query ranges.

```sh
cd /data/home/hackerx && git pull
mkdir -p logs
python3 -u pipeline/pull_hn.py > logs/hn-pull.log 2>&1
echo FINISHED; tail -n 20 logs/hn-pull.log
```

## Step 2 — Extract, merge, and fetch current HN results

```sh
cd /data/home/hackerx && git pull
mkdir -p logs
(python3 -u pipeline/extract_tweets.py && python3 -u pipeline/merge_tweets.py && python3 -u pipeline/fetch_tweets.py) > logs/extract-merge-fetch.log 2>&1
echo FINISHED; tail -n 20 logs/extract-merge-fetch.log
```

## Step 3 — (retired) sample A/B comparison

The v1 pipeline runs Amos in single mode only, so there is no batched run to compare. The shared 60 requests/minute limiter and the content-addressed cache in `pipeline/amos.py` still apply. This step is kept as a numbered placeholder so Steps 4 and 5 keep their agreed numbers.

## Step 4 — Full Amos run (single mode)

Scores every eligible tweet. Progress prints every 25 calls and the whole run is resumable: rerunning the same command skips cached answers. Expect roughly 7,500–10,000 calls at 60 requests/minute (about 2–2.5 hours).

```sh
cd /data/home/hackerx && git pull
mkdir -p logs
python3 -u pipeline/filter_tweets.py --workers 12 > logs/amos-full.log 2>&1
echo FINISHED; grep -c ERROR logs/amos-full.log; tail -n 30 logs/amos-full.log
```

## Step 5 — Build `data/site/` and publish it

Turns `data/scored-tweets.json` into the files the static site reads, validates every schema and the 20 MiB budget, then commits and pushes the generated data.

```sh
cd /data/home/hackerx && git pull
mkdir -p logs
(python3 -u pipeline/build_site.py && git add data/site && git commit -m "data: publish ranked site data" && git push) > logs/site-build.log 2>&1
echo FINISHED; grep -c ERROR logs/site-build.log; tail -n 30 logs/site-build.log
```

After Step 5 the next push to `main` (or a rerun of Workers Builds) rebuilds the static site with real data.
