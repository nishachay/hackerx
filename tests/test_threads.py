import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
from build_site import build, build_card, load_thread_ids  # noqa: E402
from detect_threads import detect_ids  # noqa: E402
from test_build_site import scored_fixture  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DETECT = ROOT / "pipeline" / "detect_threads.py"


def raw_record(tweet_id, text, handle="someone", replies=None):
    record = {
        "id": tweet_id,
        "tweet": {"id_str": tweet_id, "text": text, "user": {"screen_name": handle}},
    }
    if replies is not None:
        record["replies"] = replies
    return record


class ThreadsFileTests(unittest.TestCase):
    def test_committed_file_is_id_strings_only(self):
        path = ROOT / "data" / "threads.json"
        if not path.exists():
            self.skipTest("data/threads.json not committed yet")
        payload = json.loads(path.read_text(encoding="utf-8"))
        self.assertIsInstance(payload, list)
        self.assertTrue(all(isinstance(item, str) for item in payload), "only id strings allowed")
        self.assertTrue(all(item.isdigit() for item in payload), "ids are numeric strings")
        self.assertEqual(payload, sorted(payload), "ids stay sorted")

    def test_detect_ids_publishes_only_ids(self):
        records = [
            raw_record("100", "1/ a numbered thread starts here"),
            raw_record("101", "plain post, no thread signals"),
            raw_record("102", "later continued by the author", replies=[
                {"user": {"screen_name": "someone"}, "in_reply_to_status_id_str": "102"},
            ]),
            raw_record("103", "replied to by someone else", replies=[
                {"user": {"screen_name": "other"}, "in_reply_to_status_id_str": "103"},
            ]),
        ]
        self.assertEqual(detect_ids(records), ["100", "102"])

    def test_missing_raw_data_errors_without_writing(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "threads.json"
            result = subprocess.run(
                [sys.executable, str(DETECT), "--scored", "data/definitely-missing.json", "--out", str(out)],
                capture_output=True, text=True, cwd=ROOT,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("data/definitely-missing.json", result.stderr)
            self.assertFalse(out.exists(), "never writes an empty file")

    def test_script_writes_sorted_id_list(self):
        with tempfile.TemporaryDirectory() as tmp:
            scored = Path(tmp) / "scored.json"
            out = Path(tmp) / "threads.json"
            scored.write_text(json.dumps([
                raw_record("200", "just a post"),
                raw_record("199", "1/ thread incoming \U0001f9f5"),
            ]), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(DETECT), "--scored", str(scored), "--out", str(out)],
                capture_output=True, text=True, cwd=ROOT,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(out.read_text(encoding="utf-8")), ["199"])

    def test_build_applies_overlay_and_survives_missing_file(self):
        config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
        record = scored_fixture()[1]
        plain = build_card(record, config)
        self.assertIs(plain["thread"], False)
        marked = build_card(record, config, frozenset({plain["id"]}))
        self.assertIs(marked["thread"], True)
        with tempfile.TemporaryDirectory() as tmp:
            missing = Path(tmp) / "no-threads.json"
            self.assertEqual(load_thread_ids(missing), frozenset())
            scored = Path(tmp) / "scored.json"
            scored.write_text(json.dumps(scored_fixture()), encoding="utf-8")
            out_dir = Path(tmp) / "site"
            out_dir.mkdir()
            stats = build(scored, out_dir, config, "https://hackerx.example", missing)
            self.assertGreater(stats["published"], 0)
            cards = json.loads((out_dir / "all.json").read_text(encoding="utf-8"))
            self.assertTrue(all(card["thread"] is False for card in cards))

    def test_build_marks_overlay_ids(self):
        config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as tmp:
            scored = Path(tmp) / "scored.json"
            scored.write_text(json.dumps(scored_fixture()), encoding="utf-8")
            out_dir = Path(tmp) / "site"
            out_dir.mkdir()
            first = build(scored, out_dir, config, "https://hackerx.example")
            self.assertGreater(first["published"], 0)
            cards = json.loads((out_dir / "all.json").read_text(encoding="utf-8"))
            target = cards[0]["id"]
            threads = Path(tmp) / "threads.json"
            threads.write_text(json.dumps([target]), encoding="utf-8")
            build(scored, out_dir, config, "https://hackerx.example", threads)
            cards = json.loads((out_dir / "all.json").read_text(encoding="utf-8"))
            flagged = {card["id"] for card in cards if card["thread"]}
            self.assertEqual(flagged, {target})


if __name__ == "__main__":
    unittest.main()
