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


# 3. YouTube thumbnails for the newest songs (their MV art)
MV = {"m0354": "11VKhxkxlDs"}
for sid, vid in MV.items():
    for q in ("maxresdefault", "sddefault", "hqdefault"):
        n = len(log)
        save(f"https://i.ytimg.com/vi/{vid}/{q}.jpg", f"yt_{sid}")
        if log[-1].startswith("OK"):
            break
        del log[n:]
open(os.path.join(OUT, "LOG.txt"), "w").write("\n".join(log) + "\n")
print("\n".join(log))
