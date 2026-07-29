#!/usr/bin/env python3
"""Rank actionable SEO opportunities from a Google Search Console CSV export."""

from __future__ import annotations

import argparse
import csv
import math
from pathlib import Path


ALIASES = {
    "query": {"query", "queries", "top queries", "search query"},
    "page": {"page", "pages", "landing page", "url"},
    "clicks": {"clicks", "click"},
    "impressions": {"impressions", "impression"},
    "ctr": {"ctr", "average ctr", "click through rate", "click-through rate"},
    "position": {"position", "average position", "avg position"},
}


def normalized(value: str) -> str:
    return " ".join(value.strip().lower().replace("_", " ").split())


def column_map(fieldnames: list[str]) -> dict[str, str]:
    mapped: dict[str, str] = {}
    for field in fieldnames:
        key = normalized(field)
        for canonical, aliases in ALIASES.items():
            if key in aliases and canonical not in mapped:
                mapped[canonical] = field
    required = {"clicks", "impressions", "ctr", "position"}
    missing = sorted(required - mapped.keys())
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")
    return mapped


def number(value: str) -> float:
    cleaned = value.strip().replace(",", "")
    return float(cleaned or 0)


def ctr_value(value: str) -> float:
    cleaned = value.strip()
    if cleaned.endswith("%"):
        return number(cleaned[:-1]) / 100
    parsed = number(cleaned)
    return parsed / 100 if parsed > 1 else parsed


def expected_ctr(position: float) -> float:
    if position <= 3:
        return 0.10
    if position <= 5:
        return 0.05
    if position <= 10:
        return 0.025
    return 0


def classify(position: float, ctr: float, impressions: float) -> tuple[str, float] | None:
    if 8 <= position <= 30:
        score = impressions * (31 - position) / 30
        return "striking-distance", score
    if position < 8 and ctr < expected_ctr(position):
        gap = max(expected_ctr(position) - ctr, 0.001)
        return "low-ctr", impressions * gap * 12
    if position > 30 and impressions >= 100:
        return "content-gap-or-mismatch", math.sqrt(impressions) * 2
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Search Console CSV export")
    parser.add_argument("--min-impressions", type=float, default=20)
    parser.add_argument("--limit", type=int, default=25)
    args = parser.parse_args()

    with args.input.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError("CSV has no header row")
        columns = column_map(reader.fieldnames)
        opportunities = []
        for row in reader:
            impressions = number(row[columns["impressions"]])
            if impressions < args.min_impressions:
                continue
            clicks = number(row[columns["clicks"]])
            ctr = ctr_value(row[columns["ctr"]])
            position = number(row[columns["position"]])
            result = classify(position, ctr, impressions)
            if not result:
                continue
            kind, score = result
            opportunities.append(
                {
                    "kind": kind,
                    "score": score,
                    "query": row.get(columns.get("query", ""), "").strip(),
                    "page": row.get(columns.get("page", ""), "").strip(),
                    "clicks": clicks,
                    "impressions": impressions,
                    "ctr": ctr,
                    "position": position,
                }
            )

    opportunities.sort(key=lambda item: item["score"], reverse=True)
    print("# Search Console opportunity triage\n")
    print("| Priority | Type | Query / page | Clicks | Impressions | CTR | Position |")
    print("|---:|---|---|---:|---:|---:|---:|")
    for index, item in enumerate(opportunities[: args.limit], start=1):
        subject = item["query"] or item["page"] or "(not provided)"
        subject = subject.replace("|", "\\|")
        print(
            f"| {index} | {item['kind']} | {subject} | {item['clicks']:.0f} | "
            f"{item['impressions']:.0f} | {item['ctr']:.1%} | {item['position']:.1f} |"
        )
    if not opportunities:
        print("\nNo opportunities met the current thresholds.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
