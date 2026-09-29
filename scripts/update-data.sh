#!/usr/bin/env bash
# Fetch the latest hololive Dreams master data + chart timelines and rebuild data/.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .cache
for repo in holodori-db-eng-diff holodori-db-jpn-diff; do
  if [ -d ".cache/$repo/.git" ]; then
    git -C ".cache/$repo" pull --ff-only -q
  else
    git clone -q "https://github.com/HolodoriDB/$repo.git" ".cache/$repo"
  fi
done
# Parsed chart timelines (only the one data folder is checked out).
if [ -d ".cache/yagoo-dori/.git" ]; then
  git -C .cache/yagoo-dori pull --ff-only -q
else
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/asciisyaez/yagoo-dori.git .cache/yagoo-dori
  git -C .cache/yagoo-dori sparse-checkout set data/generated apps/web/public/game/cards apps/web/public/game/previews
fi
# Traditional Chinese text (only the languages/cht folder is checked out).
if [ -d ".cache/android-database/.git" ]; then
  git -C .cache/android-database pull --ff-only -q
else
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/holodori-net/android-database.git .cache/android-database
  git -C .cache/android-database sparse-checkout set languages/cht
fi
CHT=.cache/android-database/languages/cht
python3 scripts/build_data.py --eng .cache/holodori-db-eng-diff --jpn .cache/holodori-db-jpn-diff --cht "$CHT"
python3 scripts/build_game.py --eng .cache/holodori-db-eng-diff --jpn .cache/holodori-db-jpn-diff --cht "$CHT"
python3 scripts/build_charts.py --timelines .cache/yagoo-dori/data/generated/holodori-chart-timelines.json
python3 scripts/import_art.py --icons .cache/yagoo-dori/apps/web/public/game/cards --full .cache/yagoo-dori/apps/web/public/game/previews
if [ -d ".cache/holo-dreams-songlist/.git" ]; then
  git -C .cache/holo-dreams-songlist pull --ff-only -q
else
  git clone -q --depth 1 https://github.com/MinatoIsuki/holo-dreams-songlist.git .cache/holo-dreams-songlist
fi
python3 scripts/build_jackets.py --songlist .cache/holo-dreams-songlist/output.json
