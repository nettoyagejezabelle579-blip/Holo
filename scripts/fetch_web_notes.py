#!/usr/bin/env python3
"""One-off: save the text of score-mechanics guide pages into incoming/web/ (run on GitHub Actions)."""
import html as H
import os
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept-Language": "ja,en;q=0.8"}
PAGES = {
    "gamerch_score_support": "https://gamerch.com/hololive-dreams/1000807",
    "gamerch_score_up": "https://gamerch.com/hololive-dreams/999789",
    "appmedia_score_support": "https://appmedia.jp/hololive-dreams/80243071",
    "appmedia_score_up": "https://appmedia.jp/hololive-dreams/80248429",
    "horodori_scoring": "https://www.horodori.com/guide/scoring",
    "wfcalc_simulator": "https://dreams.wf-calc.net/simulator?lang=en",
    "wfcalc_home": "https://dreams.wf-calc.net/?lang=en",
    "wiki_scoring": "https://hololivedream.wiki/controls/scoring/",
    "namu_system": "https://en.namu.wiki/w/hololive%20Dreams/%EC%8B%9C%EC%8A%A4%ED%85%9C",
}
os.makedirs("incoming/web", exist_ok=True)
for name, url in PAGES.items():
    try:
        raw = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read().decode("utf-8", "replace")
        # keep script sources referenced (calculators) for a second look
        scripts = re.findall(r'<script[^>]+src="([^"]+)"', raw)
        text = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", raw)
        text = re.sub(r"(?s)<br\s*/?>|</p>|</li>|</h\d>|</tr>|</div>", "\n", text)
        text = H.unescape(re.sub(r"<[^>]+>", " ", text))
        text = "\n".join(l.strip() for l in text.splitlines() if l.strip())
        open(f"incoming/web/{name}.txt", "w").write(url + "\nSCRIPTS: " + " ".join(scripts) + "\n\n" + text)
        print("ok", name, len(text))
    except Exception as e:  # noqa: BLE001
        print("error", name, e)
