import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
from merge_tweets import merge  # noqa: E402


def old_merge(records, minimum_authors):
    by_id = {str(record["id"]): record for record in records}
    ids = sorted(by_id, key=lambda value: (-len(value), value))
    canonical = {}
    for tweet_id in ids:
        handles = {handle.casefold() for handle in by_id[tweet_id].get("handles", []) if handle}
        candidates = [other_id for other_id in ids if len(other_id) > len(tweet_id)
            and other_id.startswith(tweet_id)
            and handles.intersection(handle.casefold() for handle in by_id[other_id].get("handles", []) if handle)] if handles else []
        target = min(candidates, key=lambda value: (len(value), value)) if candidates else tweet_id
        if candidates:
            target = canonical.get(target, target)
        canonical[tweet_id] = target
    merged = {}
    for tweet_id in ids:
        target, source = canonical[tweet_id], by_id[tweet_id]
        destination = merged.setdefault(target, {"id": target, "handles": [], "citations": [], "merged_ids": []})
        destination["merged_ids"].append(tweet_id)
        for handle in source.get("handles", []):
            if handle.casefold() not in {item.casefold() for item in destination["handles"]}:
                destination["handles"].append(handle)
        seen = {item.get("hn_id") for item in destination["citations"]}
        destination["citations"].extend(item for item in source.get("citations", []) if item.get("hn_id") not in seen)
    kept, rejected = [], []
    for record in merged.values():
        record["merged_ids"] = sorted(set(record["merged_ids"]), key=lambda value: (len(value), value))
        record["distinct_hn_authors"] = len({str(c.get("hn_author", "")).strip().lower() for c in record["citations"] if str(c.get("hn_author", "")).strip()})
        if record["distinct_hn_authors"] >= minimum_authors:
            kept.append(record)
        else:
            rejected.append({"id": record["id"], "distinct_hn_authors": record["distinct_hn_authors"], "reason": "fewer than required distinct HN authors"})
    return kept, rejected


class MergeIndexTests(unittest.TestCase):
    def test_indexed_merge_matches_previous_algorithm(self):
        fixture = [
            {"id": "123", "handles": ["Alice"], "citations": [{"hn_id": "1", "hn_author": "a"}]},
            {"id": "1234", "handles": ["ALICE"], "citations": [{"hn_id": "2", "hn_author": "b"}]},
            {"id": "12345", "handles": ["Alice"], "citations": [{"hn_id": "3", "hn_author": "c"}]},
            {"id": "1239", "handles": ["Bob"], "citations": [{"hn_id": "4", "hn_author": "d"}]},
            {"id": "99", "handles": ["Alice", "Other"], "citations": [{"hn_id": "5", "hn_author": "e"}]},
            {"id": "991", "handles": ["Other"], "citations": [{"hn_id": "6", "hn_author": "f"}]},
        ]
        expected = old_merge(copy.deepcopy(fixture), 2)
        actual = merge(copy.deepcopy(fixture), 2)
        self.assertEqual(actual, expected)


if __name__ == "__main__":
    unittest.main()
