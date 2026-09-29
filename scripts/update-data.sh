#!/usr/bin/env bash
# Fetch the latest hololive Dreams master data and rebuild data/cards.js.
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
python3 scripts/build_data.py --eng .cache/holodori-db-eng-diff --jpn .cache/holodori-db-jpn-diff
