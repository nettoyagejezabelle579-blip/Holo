#!/usr/bin/env python3
"""One-off: save the text of score-mechanics guide pages into incoming/web/ (run on GitHub Actions)."""
import html as H
import os
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept-Language": "ja,en;q=0.8"}
PAGES = {}
# hololive Dreams Lab: every guide page linked from its home page, plus the simulator's JS bundle.
BASE = "https://dreams.wf-calc.net"
home = urllib.request.urlopen(urllib.request.Request(BASE + "/?lang=en", headers=UA), timeout=40).read().decode("utf-8", "replace")
bundles = re.findall(r'src="(/assets/[^"]+\.js)"', home)
os.makedirs("incoming/web", exist_ok=True)
for js in bundles:
    data = urllib.request.urlopen(urllib.request.Request(BASE + js, headers=UA), timeout=60).read()
    open("incoming/web/wfcalc_" + os.path.basename(js), "wb").write(data)
    print("bundle", js, len(data))
    txt = data.decode("utf-8", "replace")
    for route in sorted(set(re.findall(r'["\'](/(?:guide|guides|live|score|docs|help)[a-z0-9/_-]*)["\']', txt))):
        PAGES["wfcalc" + route.replace("/", "_")] = BASE + route + "?lang=en"
    for chunk in sorted(set(re.findall(r'["\'](?:\./|/assets/)([A-Za-z0-9_-]+\.js)["\']', txt)))[:80]:
        try:
            c = urllib.request.urlopen(urllib.request.Request(BASE + "/assets/" + chunk, headers=UA), timeout=60).read()
            open("incoming/web/wfcalc_chunk_" + chunk, "wb").write(c)
        except Exception as e:  # noqa: BLE001
            print("chunk error", chunk, e)
print("pages", PAGES)
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
