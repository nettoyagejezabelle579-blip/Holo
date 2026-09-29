#!/usr/bin/env python3
"""Download a picture for every card and every song cover into this repo.

Usage (needs internet access to the image hosts):
    python3 scripts/download_images.py            # only what is missing
    python3 scripts/download_images.py --force    # re-download everything

Sources, tried in order (all public):
  card art      https://cdn.holodori.dev/assets/assetbundles/img_card_vert_<assetId>/img_card_vert_<assetId>.webp
  illustration  https://cdn.holodori.dev/assets/assetbundles/img_card_full_<assetId>/img_card_full_<assetId>_unsquished.webp
  song cover    official site jacket (data/jackets.js), then
                https://cdn.holodori.dev/assets/assetbundles/img_music_jacket_<jacketId>/img_music_jacket_<jacketId>.webp

Files go to assets/art/vert/<cardId>.webp, assets/art/full/<cardId>.webp and assets/jackets/<songId>.<ext>;
data/art.js and data/jacket_files.js are rewritten so the site uses the local files first.
Images (c) COVER Corp. / QualiArts; for personal, non-commercial use.
"""
import argparse
import json
import os
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36", "Referer": "https://holodori.best/", "Accept": "image/avif,image/webp,image/png,image/*;q=0.8"}
CDN = "https://cdn.holodori.dev/assets/assetbundles/"
VERT = [CDN + "img_card_vert_{id}/img_card_vert_{id}.webp", CDN + "img_card_vert_{id}/img_card_vert_{id}_unsquished.webp"]
FULL = [CDN + "img_card_full_{id}/img_card_full_{id}_unsquished.webp", CDN + "img_card_full_{id}/img_card_full_{id}.webp"]
JACKET = [CDN + "img_music_jacket_{id}/img_music_jacket_{id}.webp", CDN + "img_music_jacket_{id}/img_music_jacket_{id}_unsquished.webp",
          CDN + "img_music_jacket_{id}/img_music_jacket_{id}.png"]


def load_js(path):
    s = open(os.path.join(ROOT, path), encoding="utf-8").read()
    return json.loads(s[s.index("=") + 1:].rstrip().rstrip(";"))


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        data = r.read()
        ctype = r.headers.get("Content-Type", "")
    if len(data) < 200:
        raise ValueError("too small")
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return data, "webp"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return data, "png"
    if data[:3] == b"\xff\xd8\xff":
        return data, "jpg"
    raise ValueError("not an image (%s)" % ctype)


def get_first(urls):
    last = None
    for u in urls:
        for attempt in range(3):
            try:
                return fetch(u)
            except Exception as e:  # noqa: BLE001 - report and try the next source
                last = e
                # Only timeouts are worth retrying; refused/blocked/missing moves on to the next source.
                if not ("timed out" in str(e).lower() or isinstance(e, TimeoutError)):
                    break
                time.sleep(1 + attempt * 2)
    raise RuntimeError(str(last))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--no-full", action="store_true", help="skip the large full illustrations")
    ap.add_argument("--limit", type=int, default=0, help="only try the first N downloads (testing)")
    ap.add_argument("--manifest-only", action="store_true", help="just rebuild data/art.js and data/jacket_files.js from the files present")
    args = ap.parse_args()
    cards = load_js("data/cards.js")["cards"]
    songs = load_js("data/game.js")["songs"]
    try:
        official = load_js("data/jackets.js")
    except Exception:
        official = {}
    os.makedirs(os.path.join(ROOT, "assets", "art", "vert"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "assets", "art", "full"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "assets", "jackets"), exist_ok=True)
    failed = []

    jobs = []
    for c in cards:
        if not c.get("asset"):
            continue
        jobs.append(("vert", c["id"], [u.format(id=c["asset"]) for u in VERT], os.path.join("assets", "art", "vert", c["id"] + ".webp")))
        if not args.no_full:
            jobs.append(("full", c["id"], [u.format(id=c["asset"]) for u in FULL], os.path.join("assets", "art", "full", c["id"] + ".webp")))
    for s in songs:
        urls = ([official[s["id"]]] if s["id"] in official else []) + [u.format(id=s.get("jacket", s["id"])) for u in JACKET]
        jobs.append(("jacket", s["id"], urls, None))

    if args.manifest_only:
        jobs = []
    elif args.limit:
        jobs = jobs[:args.limit]
    jacket_files = {}
    for i, (kind, key, urls, dest) in enumerate(jobs, 1):
        if kind == "jacket":
            existing = [f for f in os.listdir(os.path.join(ROOT, "assets", "jackets")) if not f.startswith(".") and f.split(".")[0] == key]
            if existing and not args.force:
                jacket_files[key] = existing[0]
                continue
        elif os.path.exists(os.path.join(ROOT, dest)) and not args.force:
            continue
        # The full illustration of cards that already ship one (assets/art/full) is kept.
        try:
            data, ext = get_first(urls)
        except Exception as e:  # noqa: BLE001
            failed.append((kind, key, str(e)))
            print(f"[{i}/{len(jobs)}] {kind} {key}: FAILED {e}", file=sys.stderr)
            continue
        if kind == "jacket":
            name = f"{key}.{ext}"
            dest = os.path.join("assets", "jackets", name)
            jacket_files[key] = name
        with open(os.path.join(ROOT, dest), "wb") as f:
            f.write(data)
        print(f"[{i}/{len(jobs)}] {kind} {key} ok ({len(data) // 1024} KB)")

    # Rewrite the manifests the site reads.
    art = {}
    for kind in ("icon", "vert", "full"):
        folder = os.path.join(ROOT, "assets", "art", kind)
        if os.path.isdir(folder):
            for f in os.listdir(folder):
                if f.endswith(".webp"):
                    art.setdefault(f[:-5], []).append(kind)
    with open(os.path.join(ROOT, "data", "art.js"), "w", encoding="utf-8") as f:
        f.write("// Generated by scripts/import_art.py / download_images.py. Card art (c) QualiArts / COVER Corp.\n")
        f.write("window.HOLO_ART = ")
        json.dump({k: sorted(v) for k, v in sorted(art.items())}, f, separators=(",", ":"))
        f.write(";\n")
    for fname in [x for x in os.listdir(os.path.join(ROOT, "assets", "jackets")) if not x.startswith(".")]:
        jacket_files.setdefault(fname.split(".")[0], fname)
    with open(os.path.join(ROOT, "data", "jacket_files.js"), "w", encoding="utf-8") as f:
        f.write("// Generated by scripts/download_images.py: song covers stored in assets/jackets.\n")
        f.write("window.HOLO_JACKET_FILES = ")
        json.dump(dict(sorted(jacket_files.items())), f, separators=(",", ":"))
        f.write(";\n")
    have_cards = sum(1 for c in cards if art.get(c["id"]))
    print(f"\ncards with a picture: {have_cards}/{len(cards)}, songs with a cover: {len(jacket_files)}/{len(songs)}")
    if failed:
        print(f"{len(failed)} downloads failed (the site falls back to the web or a generated picture for these).")


if __name__ == "__main__":
    main()
