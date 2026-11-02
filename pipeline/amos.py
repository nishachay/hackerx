"""Small client for the no-key Amos System One decision endpoint."""

from __future__ import annotations

import hashlib
import json
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import deque
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = "https://api.amos.scira.ai/v1/systemone"
MODEL = "amos-1-large"
_RATE_LOCK = threading.Lock()
_REQUEST_TIMES: deque[float] = deque()


class AmosClient:
    """Caches complete typed-decision responses and throttles all calls in-process."""

    def __init__(self, cache_dir: Path | None = None, requests_per_minute: int = 60) -> None:
        self.cache_dir = cache_dir or ROOT / "data" / "cache" / "amos"
        self.requests_per_minute = requests_per_minute
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.requests_made = 0
        self.cache_hits = 0
        self._counter_lock = threading.Lock()

    def _wait_for_slot(self) -> None:
        while True:
            with _RATE_LOCK:
                now = time.monotonic()
                while _REQUEST_TIMES and now - _REQUEST_TIMES[0] >= 60:
                    _REQUEST_TIMES.popleft()
                if len(_REQUEST_TIMES) < self.requests_per_minute:
                    _REQUEST_TIMES.append(now)
                    return
                wait = max(0.05, 60 - (now - _REQUEST_TIMES[0]))
            time.sleep(wait)

    @staticmethod
    def _retry_after(value: str | None, fallback: float) -> float:
        if not value:
            return fallback
        try:
            return max(1.0, float(value))
        except ValueError:
            try:
                return max(1.0, (parsedate_to_datetime(value) - datetime.now(timezone.utc)).total_seconds())
            except (TypeError, ValueError, OverflowError):
                return fallback

    def ask(self, state: Any, questions: dict[str, Any]) -> dict[str, Any]:
        payload = {"model": MODEL, "state": state, "questions": questions}
        encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
        key = hashlib.sha256(encoded).hexdigest()
        cache_path = self.cache_dir / f"{key}.json"
        if cache_path.exists():
            with self._counter_lock:
                self.cache_hits += 1
            return json.loads(cache_path.read_text(encoding="utf-8"))

        request = urllib.request.Request(
            ENDPOINT,
            data=encoded,
            headers={"Content-Type": "application/json", "User-Agent": "HackerX/1.0"},
            method="POST",
        )
        delay = 2.0
        for attempt in range(8):
            self._wait_for_slot()
            with self._counter_lock:
                self.requests_made += 1
            try:
                with urllib.request.urlopen(request, timeout=180) as response:
                    answer = json.loads(response.read().decode("utf-8"))
            except urllib.error.HTTPError as error:
                if error.code not in (429, 503) or attempt == 7:
                    raise
                time.sleep(self._retry_after(error.headers.get("Retry-After"), delay))
                delay = min(delay * 2, 60)
                continue
            except urllib.error.URLError:
                if attempt == 7:
                    raise
                time.sleep(delay)
                delay = min(delay * 2, 60)
                continue

            temp = cache_path.with_suffix(f".json.{threading.get_ident()}.tmp")
            temp.write_text(json.dumps(answer, ensure_ascii=False), encoding="utf-8")
            temp.replace(cache_path)
            return answer
        raise RuntimeError("Amos request retries exhausted")


def evergreen_questions(topics: list[str]) -> dict[str, Any]:
    return {
        "evergreen_1": {"type": "noul", "instructions": "Is this worth reading in 5 years?"},
        "evergreen_2": {"type": "noul", "instructions": "Does it teach a lasting idea rather than react to news?"},
        "evergreen_3": {"type": "noul", "instructions": "Would a thoughtful engineer save it to reread?"},
        "kind": {
            "type": "choice",
            "instructions": "Which kind best describes this tweet?",
            "criteria": {key: None for key in ("insight", "advice", "technical", "story", "news", "drama", "promo", "launch", "joke")},
        },
        "topic": {
            "type": "choice",
            "instructions": "Which topic best describes this tweet?",
            "criteria": {topic: None for topic in topics},
        },
    }


def recommendation_questions() -> dict[str, Any]:
    return {
        "stance": {
            "type": "choice",
            "instructions": "Does this HN comment recommend the tweet, cite it neutrally, or criticize it? Recommends means it praises, agrees with, or shares the tweet as worth reading. Neutral means it only cites or quotes it. Critical means it mocks, disputes, or criticizes it.",
            "criteria": {"recommends": None, "neutral": None, "critical": None},
        }
    }
