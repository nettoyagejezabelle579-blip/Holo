# holodori DB — hololive Dreams card database

An unofficial, static fan site for **hololive Dreams** (ホロライブドリームス / "holodori") modelled on
the card page of holodori.best. No build step, no server code — open `index.html` or host the folder on
GitHub Pages.

## Pages

- `index.html` — latest information: live/upcoming pick-up banners with their cards, launch info and
  the highest-stat cards.
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

## Data

`data/cards.js` is generated from the datamined master data published at
[HolodoriDB/holodori-db-eng-diff](https://github.com/HolodoriDB/holodori-db-eng-diff) and
[HolodoriDB/holodori-db-jpn-diff](https://github.com/HolodoriDB/holodori-db-jpn-diff).
The current build uses master data from 2026-09-26: 185 cards (54 talents × ★3/★4/★5 plus 23 limited ★5)
across the launch pool and six pick-up banners up to *Seeking the Summer Cool* (2026-09-19).

Cards that are officially announced but not in the master data yet live in `data/announced.js`
(currently ★5 *Hoard the Loot!♡* Houshou Marine and ★5 *A Glance of Adventure* Hakui Koyori,
banner opening 2026-09-29 11:00 JST). Remove them once the real data arrives.

To refresh:

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
