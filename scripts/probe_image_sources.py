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


for u in ["https://api.holodori.best/api/asset/assetbundles/img_card_vert_00023-5-uniq-0085-00/img_card_vert_00023-5-uniq-0085-00.webp",
          "https://api.holodori.best/api/asset/assetbundles/img_card_vert_00001-5-uniq-0000-00/img_card_vert_00001-5-uniq-0000-00.webp",
          "https://cdn.holodori.dev/assets/assetbundles/img_card_full_00001-5-uniq-0000-00/img_card_full_00001-5-uniq-0000-00_unsquished.webp",
          "https://api.holodori.best/api/asset/assetbundles/img_music_jacket_m0548/img_music_jacket_m0548.webp",
          "https://holodori.best/cards"]:
    print("PROBE", status(u), u)

API = "https://hololive.wiki/w/api.php"


def wiki(params):
    q = urllib.parse.urlencode(dict(params, format="json"))
    with urllib.request.urlopen(urllib.request.Request(API + "?" + q, headers=UA), timeout=40) as r:
        return json.load(r)


for cat in ["Category:Holodori Card Illustrations", "Category:Hololive Dreams Images"]:
    try:
        names, cont = [], {}
        while True:
            d = wiki(dict(action="query", list="categorymembers", cmtitle=cat, cmlimit="500", cmtype="file", **cont))
            names += [m["title"] for m in d["query"]["categorymembers"]]
            if "continue" not in d:
                break
            cont = {"cmcontinue": d["continue"]["cmcontinue"]}
        print("WIKI", cat, len(names))
        for n in names:
            print("WIKIFILE", n)
    except Exception as e:  # noqa: BLE001
        print("WIKI ERR", cat, e)
