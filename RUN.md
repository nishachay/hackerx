# Long-running pipeline steps

## Step 1 — Finish the historical HN pull

The pull cache is resumable; this command skips completed date/tag/query ranges.

```sh
cd /data/home/hackerx && git pull
set -e
mkdir -p logs
python3 -u pipeline/pull_hn.py > logs/pull.log 2>&1
echo FINISHED; tail -n 20 logs/pull.log
```
