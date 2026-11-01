# Long-running pipeline steps

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

## Step 3 — Compare single and batched Amos on the top 20 (wait for sample approval before Phase 6)

```sh
cd /data/home/hackerx && git pull
mkdir -p logs
python3 -u pipeline/filter_tweets.py --sample 20 --compare > logs/amos-compare.log 2>&1
echo FINISHED; tail -n 20 logs/amos-compare.log
```
