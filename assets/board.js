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
    // Two of the four layouts are mirror images; Connect ranges are mirrored with them.
    const b1 = list.find((t) => t.g === "B-001"), r1 = list.find((t) => t.g === "R-001");
    const out = { list, byKey: Object.fromEntries(list.map((t) => [t.k, t])), byPos,
      flipX: b1 && b1.x > 0 ? -1 : 1, flipY: r1 && r1.y < 0 ? -1 : 1 };
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

  // The tiles you have unlocked (My Data). Boards you haven't set up have only the centre tile:
  // points are never spent automatically.
  function unlocked(progress, chr) {
    const saved = progress.board && progress.board[chr];
    return new Set((saved || []).concat(ROOT));
  }
  function isSet(progress, chr) {
    const saved = progress.board && progress.board[chr];
    return !!(saved && saved.length);
  }

  // Board planned for the holomem's role in a unit, from its rank points (used by the optimizer to
  // compare units as if every board were set up for them):
  //   leader  → leader tiles, then member tiles, then support/song tiles
  //   member  → member tiles, then support/song tiles (leader tiles do nothing for a non-leader)
  //   support → support and song tiles only (the holomem is not in the unit)
  const ROLE_W = {
    leader: { leader: 3, card: 2, all_member: 1, content: 0.6 },
    member: { card: 3, all_member: 1, content: 0.6 },
    support: { all_member: 3, content: 1 },
  };
  const roleCache = new Map();
  // songTypes: the song (yellow) tile kinds that count for this holomem on the songs being played
  // ("solo" – its solo songs, FuwaMoco's songs for both twins; "group" – unit songs it sings in;
  // "all" – all-hololive songs). Yellow tiles of other kinds are useless there and are not taken.
  function roleSetup(progress, chr, role, songTypes) {
    const types = songTypes || new Set();
    const key = chr + "|" + role + "|" + pointsFor(progress, chr) + "|" + playerLevel(progress) + "|" + [...types].sort().join(",");
    const w = ROLE_W[role];
    const useful = (x) => x.eff && x.eff.live && w[x.type] && (x.type !== "content" || types.has(x.eff.singerType || "all"));
    if (roleCache.has(key)) return roleCache.get(key);
    const b = tilesFor(chr);
    const set = new Set([ROOT]);
    const lvl = playerLevel(progress);
    let left = pointsFor(progress, chr);
    for (let guard = 0; guard < 200 && left > 0; guard++) {
      const { dist, prev } = pathCosts(chr, set, lvl);
      let best = null, bestScore = 0;
      for (const t of b.list) {
        if (set.has(t.k) || !dist.has(t.k) || !useful(t)) continue;
        const cost = dist.get(t.k);
        if (cost > left) continue;
        // value of the whole path (tiles on the way count too)
        let v = 0, k = t.k;
        while (k && !set.has(k)) { const x = b.byKey[k]; if (useful(x)) v += w[x.type] * x.grade; k = prev.get(k); }
        const score = v / Math.max(1, cost) - t.prio * 1e-4;
        if (score > bestScore) { bestScore = score; best = t; }
      }
      if (!best) break;
      let k = best.k;
      while (k && !set.has(k)) { set.add(k); left -= b.byKey[k].cost; k = prev.get(k); }
    }
    roleCache.set(key, set);
    return set;
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

  // Connect: a ★4/★5 card placed on an unlocked Connect tile multiplies the tiles in its range.
  function connectLevel(progress, cardId) {
    const card = H.cardById[cardId];
    const own = progress.cards && progress.cards[cardId];
    return card ? H.skillLevelAt(card, "board", own ? own.bloom : 0) : 1;
  }
  function connectFootprint(chr, tileKey, cardId) {
    const b = tilesFor(chr);
    const c = G.connect[cardId];
    const t = b.byKey[tileKey];
    if (!c || !t) return [];
    return c.cells.map(([dx, dy]) => b.byPos.get((t.x + dx * b.flipX) + "," + (t.y + dy * b.flipY))).filter(Boolean).map((x) => x.k);
  }
  function connectMultipliers(progress, chr, set) {
    const mult = new Map();
    const placed = (progress && progress.connect && progress.connect[chr]) || {};
    for (const tileKey in placed) {
      const cardId = placed[tileKey];
      if (!set.has(tileKey) || !G.connect[cardId]) continue;
      const v = G.connect[cardId].v[connectLevel(progress, cardId) - 1] || G.connect[cardId].v[0];
      // "Board effect UP X%" adds X% on top of the tile (in game: +50 tile with a 140% card shows +120).
      // Overlapping ranges are assumed to add up.
      for (const k of connectFootprint(chr, tileKey, cardId)) mult.set(k, (mult.get(k) || 1) + v / 1000);
    }
    return mult;
  }
  // Cards already placed on any board (a card can only be on one Connect tile).
  function placedCards(progress) {
    const out = {};
    for (const chr in (progress.connect || {})) for (const k in progress.connect[chr]) out[progress.connect[chr][k]] = { chr, tile: k };
    return out;
  }

  // Live-relevant effects from a set of tiles (with Connect bonuses), merged.
  function effects(chr, set, progress) {
    const b = tilesFor(chr);
    const mult = progress ? connectMultipliers(progress, chr, set) : new Map();
    const merged = new Map();
    for (const k of set) {
      const t = b.byKey[k];
      if (!t || !t.eff || !t.eff.live) continue;
      const e = t.eff;
      const v = e.v * (mult.get(k) || 1);
      const key = [t.type, e.type, e.when, e.tgt, e.grp || "", e.chr || "", e.songTrig || "", e.singerType || ""].join("|");
      const m = merged.get(key);
      if (m) m.v += v;
      else merged.set(key, Object.assign({}, e, { v, node: t.type === "all_member" ? "all_member" : t.type }));
    }
    return [...merged.values()];
  }

  // Holomem Rank table: [{rank, exp (total), points (this rank), total}]
  function rankTable() {
    return G.rankPoints.map((total, i) => ({ rank: i + 1, exp: G.rankExp[i] || 0, points: total - (i ? G.rankPoints[i - 1] : 0), total }));
  }

  function effectText(e, chr) {
    const tl = H.talents[chr];
    const grp = e.grp && H.D.groups[e.grp] ? H.L(H.D.groups[e.grp].name) : "";
    const v = Math.round(e.v * 100) / 100;
    const s = (H.L(e.text) || e.type).replace("[value/10]", (v / 10).toFixed(1)).replace("[value]", String(v))
      .replace("[character]", tl ? H.L(tl.short) : "").replace("[character_grouping]", grp);
    return H.plain(s);
  }


  window.HoloBoard = { ROOT, tilesFor, isSet, roleSetup, pointsFor, playerLevel, spent, autoSetup, unlocked, canUnlock, lockTile, effects, effectText, tileByKey,
    connectLevel, connectFootprint, connectMultipliers, placedCards, rankTable };
})();
