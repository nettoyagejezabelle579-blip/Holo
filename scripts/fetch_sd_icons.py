#!/usr/bin/env python3
"""Collect the holomem chibi (SD) images from the official hololive Dreams site into incoming/sd/."""
import os
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
os.makedirs("incoming/sd", exist_ok=True)
seen = {}
for page in ["https://www.hololive-dreams.com/", "https://www.hololive-dreams.com/en/", "https://www.hololive-dreams.com/holomem/", "https://www.hololive-dreams.com/en/holomem/"]:
    try:
        html = urllib.request.urlopen(urllib.request.Request(page, headers=UA), timeout=40).read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        print("page error", page, e)
        continue
    for u in re.findall(r"https://images\.microcms-assets\.io/assets/[0-9a-f]+/[0-9a-f]+/([a-z0-9-]+)_sd\.png", html):
        pass
    for m in re.finditer(r"(https://images\.microcms-assets\.io/assets/[0-9a-f]+/[0-9a-f]+/([a-z0-9-]+)_sd\.png)", html):
        seen.setdefault(m.group(2), m.group(1))
print(len(seen), "sd images:", ", ".join(sorted(seen)))
for slug, url in sorted(seen.items()):
    try:
        data = urllib.request.urlopen(urllib.request.Request(url + "?fm=webp&w=320", headers=UA), timeout=40).read()
        open(f"incoming/sd/{slug}.webp", "wb").write(data)
    except Exception as e:  # noqa: BLE001
        print("download error", slug, e)
