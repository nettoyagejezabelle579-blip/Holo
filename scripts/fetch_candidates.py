#!/usr/bin/env python3
"""Collect candidate pictures for the newest cards/songs into incoming/ (run on GitHub Actions,
reviewed by hand, then imported with scripts/import_named_art.py-like crops)."""
import json
import os
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept-Language": "ja,en;q=0.8"}
OUT = "incoming"
os.makedirs(OUT, exist_ok=True)
log = []


def get(url, binary=False):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
        data = r.read()
    return data if binary else data.decode("utf-8", "replace")


def save(url, name):
    try:
        data = get(url, True)
        if len(data) < 3000:
            raise ValueError("too small")
        ext = "png" if data[:4] == b"\x89PNG" else "webp" if data[8:12] == b"WEBP" else "jpg"
        path = os.path.join(OUT, f"{name}.{ext}")
        open(path, "wb").write(data)
        log.append(f"OK {path} {len(data)//1024}KB {url}")
    except Exception as e:  # noqa: BLE001
        log.append(f"ERR {name} {e} {url}")


# 1. Official posts on X (public embed API)
TWEETS = {"kobo_en": "2104405748877025465", "jp_2104043": "2104043348562419965", "gacha_en": "2104758648845337052",
          "trend_2104061": "2104061137918808440", "paradise_en": "2012442267831943495"}
for name, tid in TWEETS.items():
    try:
        d = json.loads(get(f"https://cdn.syndication.twimg.com/tweet-result?id={tid}&lang=en&token=4"))
        log.append(f"TWEET {name}: {d.get('text', '')[:300]!r}")
        for i, m in enumerate(d.get("mediaDetails", []) or []):
            u = m.get("media_url_https")
            if u:
                save(u + "?name=orig", f"x_{name}_{i}")
        for k in ("quoted_tweet", "parent"):
            q = d.get(k) or {}
            for i, m in enumerate(q.get("mediaDetails", []) or []):
                if m.get("media_url_https"):
                    save(m["media_url_https"] + "?name=orig", f"x_{name}_{k}_{i}")
    except Exception as e:  # noqa: BLE001
        log.append(f"TWEET ERR {name} {e}")

# 2. Articles / wiki pages: images near the new card names
PAGES = {"dengeki": "https://dengekionline.com/article/202609/89416",
         "gamerch_marine": "https://gamerch.com/hololive-dreams/998672",
         "appmedia_marine": "https://appmedia.jp/hololive-dreams/80234884"}
KEYS = ["お宝独占", "振り向きざま", "波間に揺れる", "これがボクのイチオシ", "Hoard", "Glance", "Tidal", "Absolute", "マリン", "こより", "こぼ", "ベールズ", "水着"]
for name, url in PAGES.items():
    try:
        html = get(url)
        imgs = []
        for m in re.finditer(r'<img[^>]+>', html):
            tag = m.group(0)
            src = re.search(r'(?:data-src|data-original|src)="([^"]+)"', tag)
            if not src:
                continue
            s = src.group(1)
            ctx = tag + html[m.end(): m.end() + 200]
            alt = re.search(r'alt="([^"]*)"', tag)
            if any(k in ctx for k in KEYS) or name == "dengeki":
                imgs.append((s, alt.group(1) if alt else ""))
        log.append(f"PAGE {name}: {len(html)} bytes, {len(imgs)} candidate images")
        seen = set()
        for i, (s, alt) in enumerate(imgs[:40]):
            if s in seen or s.startswith("data:") or s.endswith(".svg") or ".gif" in s:
                continue
            seen.add(s)
            if s.startswith("//"):
                s = "https:" + s
            elif s.startswith("/"):
                s = re.match(r"https?://[^/]+", url).group(0) + s
            log.append(f"  IMG {name}_{i} alt={alt[:60]!r}")
            save(s, f"{name}_{i}")
    except Exception as e:  # noqa: BLE001
        log.append(f"PAGE ERR {name} {e}")

# 3. YouTube thumbnails for the newest songs (their MV art)
MV = {"m0376": "c2hbKnXIa_c", "m0375": "UPSSUSLlwjY", "m0548": "-H4bB6hxeEs", "m0413": "65R4ZpEuzvM", "m0358": "hDALUZZrE5U", "m0357": "na6bysYNuS0"}
for sid, vid in MV.items():
    for q in ("maxresdefault", "sddefault", "hqdefault"):
        n = len(log)
        save(f"https://i.ytimg.com/vi/{vid}/{q}.jpg", f"yt_{sid}")
        if log[-1].startswith("OK"):
            break
        del log[n:]
open(os.path.join(OUT, "LOG.txt"), "w").write("\n".join(log) + "\n")
print("\n".join(log))
