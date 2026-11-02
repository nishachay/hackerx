import json
import sys
import threading
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
from filter_tweets import filter_records  # noqa: E402


ROOT = Path(__file__).resolve().parents[1]


class MockAmosClient:
    def __init__(self):
        self.requests_made = 0
        self.cache_hits = 0
        self.lock = threading.Lock()

    def ask(self, state, questions):
        with self.lock:
            self.requests_made += 1
        time.sleep(0.001)
        answers = {}
        for key, question in questions.items():
            if question["type"] == "noul":
                answers[key] = {"noul": 0.83}
            elif "stance" in key:
                answers[key] = {"choice": "recommends", "probabilities": {"recommends": 0.9}}
            elif key.endswith("kind") or key == "kind":
                answers[key] = {"choice": "technical"}
            elif key.endswith("topic") or key == "topic":
                answers[key] = {"choice": "Programming"}
            else:
                answers[key] = {"choice": "technical"}
        return {"answers": answers}


def fixture_records():
    records = []
    for i in range(7):
        records.append({
            "id": str(1000 + i),
            "distinct_hn_authors": 4,
            "tweet": {"text": f"A lasting idea number {i}", "user": {"name": f"Author {i}", "screen_name": f"author{i}"}},
            "citations": [
                {"hn_id": f"{i}-1", "hn_kind": "comment", "hn_author": f"reader{i}a", "hn_comment_text": "recommend this", "hn_story_title": "Useful discussion"},
                {"hn_id": f"{i}-2", "hn_kind": "comment", "hn_author": f"reader{i}b", "hn_comment_text": "also recommend", "hn_story_title": "Useful discussion"},
                {"hn_id": f"{i}-3", "hn_kind": "comment", "hn_author": f"reader{i}c", "hn_comment_text": "worth reading", "hn_story_title": "Useful discussion"},
            ],
        })
    return records


class FilterConcurrencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))

    def test_concurrent_single_mode_matches_serial_results_and_order(self):
        serial, serial_passed = filter_records(fixture_records(), self.config, MockAmosClient(), workers=1, label="test")
        concurrent, concurrent_passed = filter_records(fixture_records(), self.config, MockAmosClient(), workers=5, label="test")
        self.assertEqual(concurrent, serial)
        self.assertEqual(concurrent_passed, serial_passed)
        self.assertEqual([row["id"] for row in concurrent], [str(1000 + i) for i in range(7)])
        for row in concurrent:
            offset = int(row["id"]) - 1000
            self.assertEqual([item["hn_id"] for item in row["recommendations"]], [f"{offset}-{n}" for n in range(1,4)])


if __name__ == "__main__":
    unittest.main()
