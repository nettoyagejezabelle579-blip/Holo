/* Holomem board (Holo成員面板): tiles per holomem, unlock rules and auto setup.
 *
 * Rank gives board points (CharacterLevel.skillTreePointQuantity). A tile can be unlocked when it
 * touches an unlocked tile (the centre tile is always unlocked), its Dream Rank condition is met and
 * enough points are left. Auto setup mirrors the in-game modes (Leader / Member / Support focus):
 * it repeatedly unlocks the cheapest path to the most valuable reachable tile.
 */
(function () {
  "use strict";
  const H = window.Holo;
  const G = window.HOLO_GAME;
  const ROOT = "S-001";
  const tileByKey = Object.fromEntries(G.tiles.map((t) => [t.k, t]));
  const cache = new Map();

  function modelOf(chr) {
    return G.boardModel[chr] || "tree-model-001";
  }
  // Tiles of one holomem with the resolved effect variant and position.
  function tilesFor(chr) {
    if (cache.has(chr)) return cache.get(chr);
    const model = modelOf(chr);
    const list = G.tiles.map((t) => {
      const v = t.var.find((x) => x.chrs && x.chrs.includes(chr)) || t.var.find((x) => !x.chrs) || t.var[0];
      const pos = t.pos[model] || [0, 0];
      return { k: t.k, g: t.g, grade: t.grade, type: t.type, cost: t.cost, prio: t.prio, lvl: t.lvl, x: pos[0], y: pos[1], eff: v ? v.eff : null };
    });
    const byPos = new Map(list.map((t) => [t.x + "," + t.y, t]));
    for (const t of list) {
      t.nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => byPos.get(t.x + dx + "," + (t.y + dy))).filter(Boolean).map((n) => n.k);
    }
    const out = { list, byKey: Object.fromEntries(list.map((t) => [t.k, t])) };
    cache.set(chr, out);
    return out;
  }

  function rankOf(progress, chr) {
    return (progress.ranks && progress.ranks[chr]) || 1;
  }
  function pointsFor(progress, chr) {
    const r = rankOf(progress, chr);
    return G.rankPoints[Math.max(0, Math.min(G.rankPoints.length - 1, r - 1))] || 0;
  }
  function playerLevel(progress) {
    return progress.playerLevel || 30;
  }
  function spent(chr, set) {
    const b = tilesFor(chr);
    let s = 0;
    for (const k of set) if (b.byKey[k]) s += b.byKey[k].cost;
    return s;
  }

  // Cheapest unlock path (sum of tile costs) from the unlocked set to every locked tile.
  function pathCosts(chr, set, lvl) {
    const b = tilesFor(chr);
    const dist = new Map(), prev = new Map();
    const queue = [];
    for (const k of set) { dist.set(k, 0); queue.push(k); }
    // Small graph (153 tiles): simple Dijkstra with a linear scan.
    const done = new Set();
    while (queue.length) {
      let bi = 0;
      for (let i = 1; i < queue.length; i++) if (dist.get(queue[i]) < dist.get(queue[bi])) bi = i;
      const k = queue.splice(bi, 1)[0];
      if (done.has(k)) continue;
      done.add(k);
      for (const nk of b.byKey[k].nb) {
        const n = b.byKey[nk];
        if (set.has(nk) || n.lvl > lvl) continue;
        const d = dist.get(k) + n.cost;
        if (!dist.has(nk) || d < dist.get(nk)) { dist.set(nk, d); prev.set(nk, k); queue.push(nk); }
      }
    }
    return { dist, prev };
  }

  function tileValue(t, mode) {
    if (t.type === "connection" || !t.eff) return 0;
    // Tiles outside the chosen focus are still taken once the focus tiles run out.
    const ratio = (G.autoModes[mode] || {})[t.type] || 100;
    const live = t.eff && t.eff.live ? 1 : 0.25; // live-score tiles first, park/reward tiles later
    return (ratio / 1000) * t.grade * live;
  }

  // Auto setup: spend the available points following the chosen focus.
  function autoSetup(progress, chr, mode, start) {
    const b = tilesFor(chr);
    const set = new Set(start || [ROOT]);
    set.add(ROOT);
    const lvl = playerLevel(progress);
    let left = pointsFor(progress, chr) - spent(chr, set);
    for (let guard = 0; guard < 200 && left > 0; guard++) {
      const { dist, prev } = pathCosts(chr, set, lvl);
      let best = null, bestScore = 0;
      for (const t of b.list) {
        if (set.has(t.k) || !dist.has(t.k)) continue;
        const cost = dist.get(t.k);
        if (cost > left) continue;
        const v = tileValue(t, mode);
        if (!v) continue;
        const score = v / Math.max(1, cost) - t.prio * 1e-3;
        if (score > bestScore) { bestScore = score; best = t; }
      }
      if (!best) break;
      let k = best.k;
      while (k && !set.has(k)) { set.add(k); left -= b.byKey[k].cost; k = prev.get(k); }
    }
    return [...set];
  }

  // The unlocked tiles the optimizer should use for a holomem.
  function unlocked(progress, chr) {
    const saved = progress.board && progress.board[chr];
    if (saved && saved.length) return new Set(saved.concat(ROOT));
    return new Set(autoSetup(progress, chr, (progress.boardMode && progress.boardMode[chr]) || progress.boardAutoMode || "leader"));
  }

  function canUnlock(progress, chr, set, key) {
    const b = tilesFor(chr);
    const t = b.byKey[key];
    if (!t || set.has(key)) return false;
    if (t.lvl > playerLevel(progress)) return false;
    if (!t.nb.some((n) => set.has(n))) return false;
    return pointsFor(progress, chr) - spent(chr, set) >= t.cost;
  }
  // Removing a tile also removes tiles that are no longer connected to the centre.
  function lockTile(chr, set, key) {
    const b = tilesFor(chr);
    const next = new Set(set);
    next.delete(key);
    const keep = new Set([ROOT]);
    const stack = [ROOT];
    while (stack.length) {
      const k = stack.pop();
      for (const n of b.byKey[k].nb) if (next.has(n) && !keep.has(n)) { keep.add(n); stack.push(n); }
    }
    return keep;
  }

  // Live-relevant effects from a set of tiles, merged.
  function effects(chr, set) {
    const b = tilesFor(chr);
    const merged = new Map();
    for (const k of set) {
      const t = b.byKey[k];
      if (!t || !t.eff || !t.eff.live) continue;
      const e = t.eff;
      const key = [t.type, e.type, e.when, e.tgt, e.grp || "", e.chr || "", e.songTrig || "", e.singerType || ""].join("|");
      const m = merged.get(key);
      if (m) m.v += e.v;
      else merged.set(key, Object.assign({}, e, { node: t.type === "all_member" ? "all_member" : t.type }));
    }
    return [...merged.values()];
  }

  function effectText(e, chr) {
    const tl = H.talents[chr];
    let s = H.L(e.text) || e.type;
    const grp = e.grp && H.D.groups[e.grp] ? H.L(H.D.groups[e.grp].name) : "";
    return s.replace("[value/10]", (e.v / 10).toFixed(1)).replace("[value]", String(e.v))
      .replace("[character]", tl ? H.L(tl.short) : "").replace("[character_grouping]", grp);
  }

  window.HoloBoard = { ROOT, tilesFor, pointsFor, playerLevel, spent, autoSetup, unlocked, canUnlock, lockTile, effects, effectText, tileByKey };
})();
