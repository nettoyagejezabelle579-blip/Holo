#!/usr/bin/env python3
"""Build data/charts/<songId>.js from parsed chart timelines.

Usage: python3 scripts/build_charts.py --timelines <holodori-chart-timelines.json>

Each chart keeps only what the score model needs:
  t  - note times in milliseconds, delta encoded in base36
  k  - one character per note: note type code (see TYPES)
  sp - special skill trigger times (ms), one per formation slot, in slot order
  sc - combo count when each special skill fires
  fv - fever window [start, end] (ms), multiplayer only
Charts that are missing are simulated from the note count in data/game.js.
"""
import argparse
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"


def b36(n):
    if n == 0:
        return "0"
    s = ""
    while n:
        n, r = divmod(n, 36)
        s = DIGITS[r] + s
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--timelines", required=True)
    ap.add_argument("--out", default=os.path.join(ROOT, "data", "charts"))
    args = ap.parse_args()
    with open(args.timelines, encoding="utf-8") as f:
        data = json.load(f)
    os.makedirs(args.out, exist_ok=True)
    per_song = {}
    for c in data["charts"]:
        if c.get("availability") != "available":
            continue
        events = sorted(c["events"], key=lambda e: e[0])
        times, kinds, prev = [], [], 0
        for us, code, _flag in events:
            ms = round(us / 1000)
            times.append(b36(ms - prev))
            kinds.append(str(code))
            prev = ms
        fever = c.get("feverMarkerMicroseconds") or {}
        per_song.setdefault(c["songId"], {})[c["difficulty"]] = {
            "hash": c.get("upstreamChartHash"),
            "t": ",".join(times),
            "k": "".join(kinds),
            "sp": [round(x / 1000) for x in c.get("specialMarkerMicroseconds", [])],
            "sc": c.get("specialStartsAtCombo", []),
            "fv": [round(fever["feverStart"] / 1000), round(fever["feverEnd"] / 1000)] if fever.get("feverStart") else None,
        }
    for song_id, charts in per_song.items():
        with open(os.path.join(args.out, f"{song_id}.js"), "w", encoding="utf-8") as f:
            f.write("(window.HOLO_CHARTS=window.HOLO_CHARTS||{})[" + json.dumps(song_id) + "]=")
            json.dump(charts, f, separators=(",", ":"))
            f.write(";\n")
    with open(os.path.join(args.out, "index.js"), "w", encoding="utf-8") as f:
        f.write("window.HOLO_CHART_INDEX=")
        json.dump({s: {d: v["hash"] for d, v in c.items()} for s, c in sorted(per_song.items())}, f, separators=(",", ":"))
        f.write(";\n")
    print(f"wrote {len(per_song)} songs of charts -> {args.out}")


if __name__ == "__main__":
    main()
