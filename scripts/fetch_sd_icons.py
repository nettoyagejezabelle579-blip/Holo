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


pages, seen_pages, sd = [BASE + "/", BASE + "/holomem/", BASE + "/en/holomem/"], set(), {}
while pages and len(seen_pages) < 150:
    page = pages.pop(0)
    if page in seen_pages:
        continue
    seen_pages.add(page)
    try:
        html = get(page)
    except Exception as e:  # noqa: BLE001
        log.append(f"page error {page} {e}")
        continue
    for m in re.finditer(r"(https://images\.microcms-assets\.io/assets/[0-9a-f]+/[0-9a-f]+/([a-z0-9-]+?)[-_]sd\.(?:png|webp))", html):
        sd.setdefault(m.group(2), m.group(1))
    for href in re.findall(r'href="(/(?:en/)?holomem/[a-z0-9-]+/?)"', html):
        pages.append(BASE + href if href.endswith("/") else BASE + href + "/")
log.append(f"visited {len(seen_pages)} pages, {len(sd)} sd images: {', '.join(sorted(sd))}")
for slug, url in sorted(sd.items()):
    try:
        open(f"incoming/sd/{slug}.webp", "wb").write(get(url + "?fm=webp&w=320", True))
    except Exception as e:  # noqa: BLE001
        log.append(f"download error {slug} {e}")

CDN = "https://cdn.holodori.dev/assets/assetbundles/"
for name in ["img_chara_icon_{c}", "img_character_icon_{c}", "img_chara_sd_{c}", "img_character_sd_{c}", "img_sd_{c}",
             "img_chara_face_{c}", "img_character_face_{c}", "img_icon_character_{c}", "img_chara_{c}", "img_character_{c}",
             "img_chara_mini_{c}", "img_holomem_icon_{c}", "img_skill_tree_chara_{c}", "img_skill_tree_character_{c}"]:
    for cid in ["chr-00001", "00001"]:
        n = name.format(c=cid)
        for ext in ("webp", "png"):
            u = f"{CDN}{n}/{n}.{ext}"
            try:
                data = get(u, True)
                if data[:4] in (b"RIFF", b"\x89PNG"):
                    log.append(f"CDN OK {u} {len(data)}")
                    open(f"incoming/sd/cdn_{n}.{ext}", "wb").write(data)
            except Exception:  # noqa: BLE001
                pass
open("incoming/sd/LOG.txt", "w").write("\n".join(log) + "\n")
print("\n".join(log))
