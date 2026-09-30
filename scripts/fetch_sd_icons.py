#!/usr/bin/env python3
"""Collect holomem chibi (SD) images from the official hololive Dreams site (every holomem page)
into incoming/sd/, and probe a few asset-CDN names. Log in incoming/sd/LOG.txt."""
import os
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
BASE = "https://www.hololive-dreams.com"
os.makedirs("incoming/sd", exist_ok=True)
log = []


def get(url, binary=False):
    data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
    return data if binary else data.decode("utf-8", "replace")


import time
# The home page shows a random few chibis on each load: load it until no new ones appear for a while.
pages, seen_pages, sd, idle = [], set(), {}, 0
for n in range(400):
    page = BASE + ("/" if n % 2 == 0 else "/en/") + f"?r={n}"
    before = len(sd)
    seen_pages.add(page)
    try:
        html = get(page)
    except Exception as e:  # noqa: BLE001
        log.append(f"page error {page} {e}")
        continue
    for m in re.finditer(r"(https://images\.microcms-assets\.io/assets/[0-9a-f]+/[0-9a-f]+/([a-z0-9-]+?)[-_]sd\.(?:png|webp))", html):
        sd.setdefault(m.group(2), m.group(1))
    idle = 0 if len(sd) > before else idle + 1
    if idle >= 60:
        break
    time.sleep(0.3)
log.append(f"visited {len(seen_pages)} pages, {len(sd)} sd images: {', '.join(sorted(sd))}")
for slug, url in sorted(sd.items()):
    try:
        open(f"incoming/sd/{slug}.webp", "wb").write(get(url + "?fm=webp&w=320", True))
    except Exception as e:  # noqa: BLE001
        log.append(f"download error {slug} {e}")

open("incoming/sd/LOG.txt", "w").write("\n".join(log) + "\n")
print("\n".join(log))
