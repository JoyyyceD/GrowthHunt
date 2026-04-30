"""
hn_analyze.py — Fetch high-traffic Hacker News posts and extract reusable title templates.

USAGE
-----
  # Full run (requires ANTHROPIC_API_KEY in environment):
  python scripts/hn_analyze.py

  # Dry run — skip Claude, just save raw HN data to data/hn-raw.json:
  python scripts/hn_analyze.py --dry-run

  # Resume from an existing hn-raw.json checkpoint (skip HN fetching):
  python scripts/hn_analyze.py --from-checkpoint

SETUP
-----
  pip install -r scripts/requirements.txt
  export ANTHROPIC_API_KEY="sk-ant-..."

OUTPUT
------
  data/hn-raw.json        — Raw story objects fetched from HN (checkpoint)
  data/hn-templates.json  — Final template list with patterns, scores, and tips
"""

import argparse
import json
import os
import time
from collections import defaultdict
from pathlib import Path

import anthropic
import requests
from tqdm import tqdm

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

HN_TOP_URL = "https://hacker-news.firebaseio.com/v0/topstories.json"
HN_BEST_URL = "https://hacker-news.firebaseio.com/v0/beststories.json"
HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item/{id}.json"

FETCH_LIMIT = 500          # How many story IDs to fetch from the top/best lists
KEEP_TOP_N = 200           # Keep the top N stories by score after filtering
MIN_SCORE = 200
MIN_COMMENTS = 50
BATCH_SIZE = 20            # Titles sent to Claude per API call
SLEEP_BETWEEN_HN = 0.1    # Seconds between HN item fetches
CLAUDE_MODEL = "claude-sonnet-4-6"

DATA_DIR = Path(__file__).parent.parent / "data"
RAW_PATH = DATA_DIR / "hn-raw.json"
TEMPLATES_PATH = DATA_DIR / "hn-templates.json"

VALID_TOPICS = {
    "indie hacker", "AI tool", "dev tool", "startup",
    "data", "product launch", "opinion", "tutorial",
    "show hn", "ask hn", "other",
}
VALID_FORMATS = {
    "Show HN", "Ask HN", "numeric list", "contrast",
    "question", "statement", "story", "other",
}
VALID_HOOKS = {
    "social proof", "curiosity", "controversy",
    "utility", "achievement", "problem", "other",
}

CLAUDE_SYSTEM = """\
You are an expert at analyzing Hacker News titles and extracting reusable content patterns.

For each title you receive, output a JSON object with exactly these keys:
  "topic"    — one of: indie hacker | AI tool | dev tool | startup | data | product launch | opinion | tutorial | show hn | ask hn | other
  "format"   — one of: Show HN | Ask HN | numeric list | contrast | question | statement | story | other
  "hook_type"— one of: social proof | curiosity | controversy | utility | achievement | problem | other
  "pattern"  — abstract the title into a reusable template by replacing specifics with {placeholders}
               e.g. "Show HN: I built a Markdown editor – 10k users in 2 weeks"
                 → "Show HN: I built {product} – {metric} in {timeframe}"

Return a JSON array where each element corresponds to one input title (same order).
Do not include any text outside the JSON array.
"""


# ---------------------------------------------------------------------------
# HN fetching
# ---------------------------------------------------------------------------

def fetch_story_ids(limit: int) -> list[int]:
    """Fetch combined top + best story IDs, deduped, up to limit."""
    ids: list[int] = []
    seen: set[int] = set()
    for url in (HN_TOP_URL, HN_BEST_URL):
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        for sid in resp.json():
            if sid not in seen:
                seen.add(sid)
                ids.append(sid)
            if len(ids) >= limit:
                break
        if len(ids) >= limit:
            break
    return ids[:limit]


def fetch_story(story_id: int) -> dict | None:
    """Fetch a single HN item; return None if it doesn't qualify."""
    url = HN_ITEM_URL.format(id=story_id)
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        item = resp.json()
    except Exception:
        return None

    if not item:
        return None
    if item.get("type") != "story":
        return None
    if item.get("score", 0) < MIN_SCORE:
        return None
    if item.get("descendants", 0) < MIN_COMMENTS:
        return None
    if not item.get("title"):
        return None

    return {
        "id": item["id"],
        "title": item["title"],
        "score": item["score"],
        "descendants": item.get("descendants", 0),
        "url": item.get("url", ""),
        "time": item.get("time", 0),
    }


def fetch_hn_stories() -> list[dict]:
    """Fetch, filter, and return the top KEEP_TOP_N stories."""
    print(f"Fetching up to {FETCH_LIMIT} story IDs from HN top + best lists...")
    ids = fetch_story_ids(FETCH_LIMIT)
    print(f"  → got {len(ids)} IDs. Fetching individual stories...")

    stories: list[dict] = []
    for sid in tqdm(ids, desc="Fetching HN stories", unit="story"):
        story = fetch_story(sid)
        if story:
            stories.append(story)
        time.sleep(SLEEP_BETWEEN_HN)

    # Sort by score, keep top N
    stories.sort(key=lambda s: s["score"], reverse=True)
    stories = stories[:KEEP_TOP_N]
    print(f"  → {len(stories)} stories passed filters (score≥{MIN_SCORE}, comments≥{MIN_COMMENTS})")
    return stories


# ---------------------------------------------------------------------------
# Claude analysis
# ---------------------------------------------------------------------------

def analyze_batch(client: anthropic.Anthropic, titles: list[str]) -> list[dict]:
    """Send a batch of titles to Claude; return a list of analysis dicts."""
    numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(titles))
    prompt = f"Analyze these {len(titles)} Hacker News titles:\n\n{numbered}"

    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=4096,
        system=CLAUDE_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0]

    try:
        results = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"  [WARN] Failed to parse Claude response: {exc}")
        # Return empty stubs so we don't crash
        results = [
            {"topic": "other", "format": "other", "hook_type": "other", "pattern": t}
            for t in titles
        ]

    return results


def analyze_stories(stories: list[dict]) -> list[dict]:
    """Attach Claude analysis to each story dict."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError("ANTHROPIC_API_KEY is not set in environment.")

    client = anthropic.Anthropic(api_key=api_key)

    titles = [s["title"] for s in stories]
    batches = [titles[i:i + BATCH_SIZE] for i in range(0, len(titles), BATCH_SIZE)]

    print(f"Analyzing {len(titles)} titles in {len(batches)} batches of {BATCH_SIZE}...")
    all_results: list[dict] = []
    for batch in tqdm(batches, desc="Claude analysis", unit="batch"):
        results = analyze_batch(client, batch)
        all_results.extend(results)

    # Merge analysis back into story dicts
    enriched: list[dict] = []
    for story, analysis in zip(stories, all_results):
        enriched.append({**story, **analysis})

    return enriched


# ---------------------------------------------------------------------------
# Template aggregation
# ---------------------------------------------------------------------------

def normalize(val: str, valid: set[str], fallback: str = "other") -> str:
    """Lowercase-match against a set of valid values; fallback if not found."""
    v = val.strip().lower()
    for option in valid:
        if option.lower() == v:
            return option
    return fallback


def build_templates(enriched: list[dict]) -> list[dict]:
    """Group stories by pattern and compute aggregate stats."""
    groups: dict[str, dict] = defaultdict(lambda: {
        "scores": [],
        "examples": [],
        "topic_votes": defaultdict(int),
        "format_votes": defaultdict(int),
        "hook_votes": defaultdict(int),
    })

    for story in enriched:
        pattern = story.get("pattern", story["title"]).strip()
        g = groups[pattern]
        g["scores"].append(story["score"])
        if len(g["examples"]) < 3:
            g["examples"].append(story["title"])
        g["topic_votes"][normalize(story.get("topic", "other"), VALID_TOPICS)] += 1
        g["format_votes"][normalize(story.get("format", "other"), VALID_FORMATS)] += 1
        g["hook_votes"][normalize(story.get("hook_type", "other"), VALID_HOOKS)] += 1

    templates: list[dict] = []
    for pattern, g in groups.items():
        scores = g["scores"]
        dominant_topic = max(g["topic_votes"], key=g["topic_votes"].get)
        dominant_format = max(g["format_votes"], key=g["format_votes"].get)
        dominant_hook = max(g["hook_votes"], key=g["hook_votes"].get)

        # Slugify the pattern for an ID
        slug = (
            pattern.lower()
            .replace("{", "")
            .replace("}", "")
            .replace(" ", "-")
            .replace("/", "-")
            [:60]
            .strip("-")
        )

        templates.append({
            "id": slug,
            "pattern": pattern,
            "topic": dominant_topic,
            "format": dominant_format,
            "hook_type": dominant_hook,
            "examples": g["examples"],
            "avg_score": round(sum(scores) / len(scores)),
            "frequency": len(scores),
            "tips": "",  # Placeholder — consider a second Claude pass to generate tips
        })

    # Sort by frequency desc, then avg_score desc
    templates.sort(key=lambda t: (-t["frequency"], -t["avg_score"]))
    return templates


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Fetch HN stories and extract reusable title templates via Claude."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Skip Claude analysis. Fetch HN data only and save to data/hn-raw.json.",
    )
    parser.add_argument(
        "--from-checkpoint",
        action="store_true",
        help="Skip HN fetching; load stories from existing data/hn-raw.json.",
    )
    args = parser.parse_args()

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Fetch or load stories
    if args.from_checkpoint:
        if not RAW_PATH.exists():
            raise FileNotFoundError(f"Checkpoint not found: {RAW_PATH}")
        print(f"Loading stories from checkpoint: {RAW_PATH}")
        stories = json.loads(RAW_PATH.read_text())
        print(f"  → {len(stories)} stories loaded.")
    else:
        stories = fetch_hn_stories()
        RAW_PATH.write_text(json.dumps(stories, indent=2))
        print(f"Raw stories saved to {RAW_PATH}")

    if args.dry_run:
        print("--dry-run: skipping Claude analysis. Done.")
        return

    # 2. Analyze with Claude
    enriched = analyze_stories(stories)

    # 3. Aggregate into templates
    templates = build_templates(enriched)
    print(f"\nExtracted {len(templates)} unique patterns.")

    # 4. Save
    TEMPLATES_PATH.write_text(json.dumps(templates, indent=2))
    print(f"Templates saved to {TEMPLATES_PATH}")


if __name__ == "__main__":
    main()
