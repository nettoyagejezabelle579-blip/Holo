# holodori DB — hololive Dreams card database

An unofficial, static fan site for **hololive Dreams** (ホロライブドリームス / "holodori") modelled on
the card page of holodori.best. No build step, no server code — open `index.html` or host the folder on
GitHub Pages.

## Pages

- `index.html` — start page and latest information (live/upcoming banners, announced cards and songs).
- `my/index.html` — **My Data**: tick the cards you own and set each card's level (limit break shown) and
  Bloom, your Holomem Rank for every holomem, each holomem's **board** (tile-by-tile editor of the real
  Holo成員面板 layout with points, Dream Rank requirements and Leader/Member/Support auto setup), and how
  many Memories you have. Backup/restore as a file or text. Everything is stored in your browser.
- `team/index.html` — **Team Optimizer**, in five steps like holodori.best:
  1. *What unit*: best unit / build around up to 5 core cards (+ optional fixed leader) /
     best card to pull (keeps up to 4 cards, tries every card you don't own and ranks them by score gain).
  2. *Target*: score on one song, average over several (event) songs, or Holomem Score Rating
     (best top-3 songs with a chosen leader, with song recommendations).
  3. *Options*: ALL PERFECT or AUTO, LIFE assumption, my cards vs. every card maxed (theory), search effort.
  4. *Holomem board*: on/off, or treat every board as fully unlocked.
  5. *Input*: song + difficulty, the event song list, or the rating leader.
  Results show the leader outfit, the five members in the best formation order, estimated score,
  score rank, Unit Score and alternative units.
- `team/details.html` — **Team Details**: build a unit by hand; per-member stats, active skill uptime,
  special skill timing and a score breakdown. Also lets you calibrate estimates with a real in-game score.
- `team/method.html` — how the score is estimated.
- `cards/index.html` — the card database.

## Card database features

- **Search** across card titles, talent names, leader outfit names and skill text (English and Japanese).
  Press `/` to focus the search box.
- **Filters**: rarity, type (Cute / Happy / Pure), availability (standard / limited / announced), gacha banner,
  branch, unit / generation, talent, skill effect (optionally restricted to the Active, Special, Passive or
  Leader slot), skill condition, passive target, collection (owned / not owned / favourites).
- **Sorting** by release date, total, Performance, Technique, Sense, rarity, talent, name, active skill
  cooldown or activation chance, ascending or descending.
- **Stats at** Lv 1, max level, or max level + potential 5.
- **Views**: grid, compact grid, list (with skill text) and a sortable table.
- **Card detail** (shareable `#card-id` links): level slider and potential selector with live stats,
  stats at every limit break, active / special / passive skills at the unlocked skill level (or all levels),
  leader outfit skill, holomem board effect, potential unlock list, talent profile and release info.
  Arrow keys move between cards, `Esc` closes.
- **Compare** up to four cards side by side.
- **Collection tracking** (owned + favourites) stored in the browser, with JSON export/import.
- English / Japanese UI, light / dark / auto theme, mobile layout. Filter state is kept in the URL.

## Score model

The in-game score formula is not public, so the optimizer uses a documented estimate built from the
master data (see `team/method.html`): card stats by level/bloom, passive and leader outfit skills,
the tiles unlocked on each holomem board, memories and the Member Upgrade Bonus give the Unit Score; each
note then scores Unit Score × song coefficient × note coefficient × combo bonus × the expected active
Score UP (highest active wins, boosted by Score Support), with special skills firing at the chart's
markers in formation order. Enter one real score in Team Details to rescale all estimates.

## Data

`data/cards.js` is generated from the datamined master data published at
[HolodoriDB/holodori-db-eng-diff](https://github.com/HolodoriDB/holodori-db-eng-diff) and
[HolodoriDB/holodori-db-jpn-diff](https://github.com/HolodoriDB/holodori-db-jpn-diff).
The current build uses master data from 2026-09-26: 185 cards (54 talents × ★3/★4/★5 plus 23 limited ★5)
across the launch pool and six pick-up banners up to *Seeking the Summer Cool* (2026-09-19).

Cards and songs that are officially announced but not in the master data yet live in `data/announced.js`.
Currently that is the banner announced on 2026-09-26 and opening 2026-09-29 11:00 JST: ★5 *Hoard the Loot!♡*
Houshou Marine, ★5 *A Glance of Adventure* Hakui Koyori, and new cards for Kobo Kanaeru and Hakos Baelz
(titles TBA), plus four announced songs: *Kyapi*, *BAKU LOVE CHEMISTRY*, *PROPOSE* and *Play Dice!*.
Remove them once the real data arrives.

`data/game.js` holds the structured skills, songs, note/combo tables and board totals
(`scripts/build_game.py`); `data/charts/*.js` hold note timings and special-skill markers per chart
(`scripts/build_charts.py`, from parsed holodori charts). To refresh everything:

```sh
./scripts/update-data.sh
```

Stats are `round(levelBase × distribution ÷ 1000 × (1 + potential bonus))`, using the per-card level curve,
limit-break caps and potential table from the master data.

### Card art

Card art is not bundled. Tiles show a generated face in the talent's colours. To show real art, put
`<assetId>.webp` files somewhere and set `artBase` in `assets/config.js`.

## Disclaimer

Unofficial and fan-made; not affiliated with or endorsed by QualiArts Inc. or COVER Corp.
hololive Dreams and all related data belong to their respective owners.
