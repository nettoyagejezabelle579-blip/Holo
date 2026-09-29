#!/usr/bin/env python3
"""Diagnostics for image sources (run by .github/workflows/fetch-images.yml): HTTP status of
holodori.best asset URLs and the file names in hololive.wiki's Holodori card categories."""
import json
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/png,image/*,*/*;q=0.8", "Referer": "https://holodori.best/"}


def status(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
            return f"{r.status} {r.headers.get('Content-Type')} {len(r.read())}B"
    except Exception as e:  # noqa: BLE001
        body = ""
        if hasattr(e, "read"):
            try:
                body = e.read()[:120]
            except Exception:  # noqa: BLE001
                pass
        return f"ERR {e} {body!r}"


CDN = "https://cdn.holodori.dev/assets/assetbundles/"
pats = ["img_card_vert_{id}/img_card_vert_{id}.webp", "img_card_vert_{id}/img_card_vert_{id}_unsquished.webp",
        "img_card_full_{id}/img_card_full_{id}_unsquished.webp", "img_card_full_{id}/img_card_full_{id}.webp",
        "img_card_icon_{id}/img_card_icon_{id}.webp", "img_card_icon_{id}/img_card_icon_{id}_unsquished.webp",
        "img_card_thumb_{id}/img_card_thumb_{id}.webp", "img_card_square_{id}/img_card_square_{id}.webp"]
for cid in ["00001-5-uniq-0000-00", "00023-5-uniq-0085-00", "00001-3-nrml-0000-00"]:
    for pt in pats:
        u = CDN + pt.format(id=cid)
        print("PROBE", status(u), u)
for mid in ["m0001", "m0548", "m0325", "m9999"]:
    for pt in ["img_music_jacket_{id}/img_music_jacket_{id}.webp", "img_music_jacket_{id}/img_music_jacket_{id}_unsquished.webp",
               "img_music_jacket_{id}/img_music_jacket_{id}.png"]:
        u = CDN + pt.format(id=mid)
        print("PROBE", status(u), u)

