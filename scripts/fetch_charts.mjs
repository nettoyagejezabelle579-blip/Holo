#!/usr/bin/env node
// Download and parse the charts of songs that have no chart in data/charts yet.
// Charts: holodori.best's asset CDN (.sus files). Parser: yagoo-dori's chart-timeline-parser.ts
// (github.com/asciisyaez/yagoo-dori), passed as the first argument; run with `npx tsx`.
//   npx -y tsx scripts/fetch_charts.mjs <path to chart-timeline-parser.ts> [--all]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const parserPath = process.argv[2];
const all = process.argv.includes("--all");
if (!parserPath) throw new Error("usage: fetch_charts.mjs <chart-timeline-parser.ts>");
const { parseHolodoriSus, TIMELINE_NOTE_TYPE_CODES } = await import(pathToFileURL(path.resolve(parserPath)).href);

const loadJs = (file) => { const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), "utf8"), ctx); return ctx.window; };
const game = loadJs("data/game.js").HOLO_GAME;
const chartDir = path.join(ROOT, "data", "charts");
const index = fs.existsSync(path.join(chartDir, "index.js")) ? loadJs("data/charts/index.js").HOLO_CHART_INDEX || {} : {};
const URLS = [
  "https://cdn.holodori.dev/assets/resources/chart_{id}_{d}.sus/chart_{id}_{d}.sus",
  "https://api.holodori.best/api/asset/resources/chart_{id}_{d}.sus/chart_{id}_{d}.sus",
];
const UA = { "user-agent": "Mozilla/5.0 (holodori-db chart sync)" };
const b36 = (n) => n.toString(36);

async function fetchSus(id, d) {
  for (const t of URLS) {
    const url = t.replaceAll("{id}", id).replaceAll("{d}", d);
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) continue;
      const text = await r.text();
      if (text.startsWith("#") || text.includes("#REQUEST") || text.includes("#WAVEOFFSET")) return text;
    } catch { /* try the next source */ }
  }
  return null;
}

let added = 0, missing = [];
for (const song of game.songs) {
  const have = index[song.id] || {};
  const diffs = Object.keys(song.diff || {}).filter((d) => all || !have[d]);
  if (!diffs.length) continue;
  const file = path.join(chartDir, `${song.id}.js`);
  const charts = fs.existsSync(file) ? (loadJs(`data/charts/${song.id}.js`).HOLO_CHARTS || {})[song.id] || {} : {};
  let changed = false;
  for (const d of diffs) {
    const sus = await fetchSus(song.id, d);
    if (!sus) { missing.push(`${song.id}:${d}`); continue; }
    let parsed;
    try { parsed = parseHolodoriSus(sus); } catch (e) { missing.push(`${song.id}:${d} (parse: ${e.message})`); continue; }
    const events = parsed.events.slice().sort((a, b) => a.atMicroseconds - b.atMicroseconds);
    const times = [], kinds = [];
    let prev = 0;
    for (const ev of events) {
      const ms = Math.round(ev.atMicroseconds / 1000);
      times.push(b36(ms - prev));
      kinds.push(String(TIMELINE_NOTE_TYPE_CODES[ev.noteType]));
      prev = ms;
    }
    const markers = parsed.specialMarkerMicroseconds || [];
    const fever = parsed.feverMarkerMicroseconds || {};
    charts[d] = {
      hash: `sus-${sus.length}`,
      t: times.join(","),
      k: kinds.join(""),
      sp: markers.map((x) => Math.round(x / 1000)),
      sc: markers.map((m) => events.filter((ev) => ev.atMicroseconds < m && ev.noteType !== "damage").length),
      fv: fever.feverStart ? [Math.round(fever.feverStart / 1000), Math.round(fever.feverEnd / 1000)] : null,
    };
    index[song.id] = Object.assign(index[song.id] || {}, { [d]: charts[d].hash });
    changed = true;
    added++;
    console.log(`chart ${song.id} ${d}: ${events.length} notes, ${markers.length} special markers`);
  }
  if (changed) fs.writeFileSync(file, "(window.HOLO_CHARTS=window.HOLO_CHARTS||{})[" + JSON.stringify(song.id) + "]=" + JSON.stringify(charts) + ";\n");
}
const sorted = Object.fromEntries(Object.entries(index).sort());
fs.writeFileSync(path.join(chartDir, "index.js"), "window.HOLO_CHART_INDEX=" + JSON.stringify(sorted) + ";\n");
console.log(`added ${added} charts; still missing ${missing.length}: ${missing.join(", ")}`);
