"""Pipeline entry point; individual resumable stages are added phase by phase."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_config() -> dict:
    with (ROOT / "config.json").open(encoding="utf-8") as config_file:
        return json.load(config_file)


if __name__ == "__main__":
    config = load_config()
    print(f"HackerX pipeline scaffold ready ({len(config['topics'])} topics configured).")
