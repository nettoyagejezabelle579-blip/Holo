/* Board planner: how to set up every holomem board for one unit and song.
 *
 * Each holomem has its own board points (from Holomem Rank). For the chosen unit the planner
 * greedily unlocks, per holomem, the cheapest path to the tile that adds the most score per point
 * (support tiles on every board help all units; leader tiles only on the leader's board; member
 * tiles only on the boards of holomems in the unit; song tiles on the singers' boards). Then it
 * places owned ★4/★5 cards on unlocked Connect tiles where they add the most. Material costs are
 * listed but not limited (the site does not know your cube stock).
 */
(function () {
  "use strict";
  const H = window.Holo;
  const S = window.HoloSim;
  const B = window.HoloBoard;
  const G = window.HOLO_GAME;
  const tick = () => new Promise((r) => setTimeout(r, 0));

  function tileMaterials(chr, key) {
    const raw = B.tileByKey[key];
    const v = raw.var.find((x) => x.chrs && x.chrs.includes(chr)) || raw.var.find((x) => !x.chrs) || raw.var[0];
    return (v && v.mat) || [];
  }

  /**
   * o = { team: {leader, ids}, charts, luck, opts (makeEnv options), onProgress, signal }
   * returns { before, after, boards: {chr: {set, prev, connect, prevConnect, points, spent}}, materials }
   */
  async function plan(o) {
    const progress = H.progress;
    const opts = Object.assign({}, o.opts || {}, { board: true, boardFull: false });
    const luck = o.luck || "avg";
    const ids = o.team.ids;
    const leader = o.team.leader;
    const lvl = B.playerLevel(progress);
    const talents = Object.keys(H.talents);
    const teamChrs = new Set(ids.map((id) => H.cardById[id].chr).concat(leader ? [leader.chr] : []));
    const singers = new Set(o.charts.flatMap((c) => c.song.singerType === "all" ? talents : c.song.chrs));

    // Current state
    const sets = {}, connect = {};
    for (const chr of talents) {
      sets[chr] = B.unlocked(progress, chr);
      connect[chr] = Object.assign({}, (progress.connect || {})[chr] || {});
    }
    const pseudo = () => ({ cards: progress.cards, connect, playerLevel: progress.playerLevel });
    const effOf = (chr, set) => B.effects(chr, set, pseudo());
    const boardEff = {};
    for (const chr of talents) boardEff[chr] = effOf(chr, sets[chr]);

    function score(overrideChr, overrideEff) {
      const board = overrideChr ? Object.assign({}, boardEff, { [overrideChr]: overrideEff }) : boardEff;
      const env = S.makeEnv(progress, opts, board);
      const team = { leader, members: ids.map((id) => S.prepare(env, id)) };
      let s = 0;
      for (const c of o.charts) s += S.evaluate(env, team, c, false, luck);
      return s / o.charts.length;
    }
    const before = score();
    const prevSets = Object.fromEntries(talents.map((c) => [c, new Set(sets[c])]));
    const prevConnect = JSON.parse(JSON.stringify(connect));

    // Which tile types can matter for this unit on each board.
    function useful(chr, t) {
      if (!t.eff || !t.eff.live) return false;
      if (t.type === "all_member") return true;
      if (t.type === "leader") return leader && leader.chr === chr;
      if (t.type === "card") return ids.some((id) => H.cardById[id].chr === chr);
      if (t.type === "content") return singers.has(chr);
      return false;
    }
    const order = talents.slice().sort((a, b) => (teamChrs.has(b) ? 1 : 0) - (teamChrs.has(a) ? 1 : 0));

    // Boards of holomems outside the unit only add flat stats to everyone (support tiles), flat
    // stats to a unit/generation, or a song bonus. Their value is linear, so price them from a few
    // sensitivity measurements instead of re-scoring every tile.
    const envBase = S.makeEnv(progress, opts, boardEff);
    const base0 = score();
    const bump = (mut) => {
      const env = S.makeEnv(progress, opts, boardEff);
      mut(env);
      env.prepared = new Map();
      const team = { leader, members: ids.map((id) => S.prepare(env, id)) };
      let v = 0;
      for (const c of o.charts) v += S.evaluate(env, team, c, false, luck);
      return (v / o.charts.length - base0) / 100;
    };
    const perAll = bump((e) => { e.gFlat = e.gFlat.map((x) => x + 100); }) / 3; // per point of one stat
    const perGrp = {};
    for (const g in H.D.groups) perGrp[g] = ids.some((id) => (H.talents[H.cardById[id].chr] || { groups: [] }).groups.includes(g))
      ? bump((e) => { e.grpFlat = Object.assign({}, e.grpFlat, { [g]: (e.grpFlat[g] || 0) + 100 }); }) : 0;
    const perSong = base0 / 1000; // ≈ score per ‰ of song bonus
    function proxyValue(chr, t) {
      const e = t.eff;
      if (!e || !e.live) return 0;
      if (t.type === "all_member") {
        if (e.type === "all_parameter_up") return e.v * perAll * 3;
        if (e.type === "performance_up" || e.type === "technique_up" || e.type === "sense_up") return e.v * perAll;
        if (e.type === "all_parameter_up_for_character_grouping") return e.v * (perGrp[e.grp] || 0);
        return 0;
      }
      if (t.type === "content") {
        const st = e.singerType || "all";
        const ok = o.charts.some((c) => (c.song.singerType === "all" || c.song.chrs.includes(chr)) && (st === "all" || st === c.song.singerType));
        return ok ? e.v * perSong / o.charts.length : 0;
      }
      return 0;
    }

    // Cheapest unlock path from the unlocked set to every reachable locked tile.
    function paths(tiles, set) {
      const dist = new Map(), prev = new Map(), queue = [...set], seen = new Set();
      for (const k of set) dist.set(k, 0);
      while (queue.length) {
        let bi = 0;
        for (let i = 1; i < queue.length; i++) if (dist.get(queue[i]) < dist.get(queue[bi])) bi = i;
        const k = queue.splice(bi, 1)[0];
        if (seen.has(k)) continue;
        seen.add(k);
        for (const nk of tiles.byKey[k].nb) {
          const n = tiles.byKey[nk];
          if (set.has(nk) || n.lvl > lvl) continue;
          const d = dist.get(k) + n.cost;
          if (!dist.has(nk) || d < dist.get(nk)) { dist.set(nk, d); prev.set(nk, k); queue.push(nk); }
        }
      }
      return { dist, prev };
    }
    const pathTo = (prev, set, key) => { const p = []; let k = key; while (k && !set.has(k)) { p.push(k); k = prev.get(k); } return p; };

    let done = 0;
    for (const chr of order) {
      const tiles = B.tilesFor(chr);
      const budget = B.pointsFor(progress, chr);
      const targets = tiles.list.filter((t) => useful(chr, t));
      const exact = teamChrs.has(chr);
      // Boards of holomems in the unit are re-planned from scratch (boards can be reset in game);
      // other boards keep what you have and only spend their leftover points.
      let set = exact || o.resetOthers ? new Set([B.ROOT]) : new Set(prevSets[chr]);
      let cur = exact ? score(chr, effOf(chr, set)) : 0;
      let left = budget - B.spent(chr, set);
      for (let guard = 0; guard < 150 && left > 0; guard++) {
        const { dist, prev } = paths(tiles, set);
        let bestPath = null, bestRatio = 0, bestScore = cur;
        for (const t of targets) {
          if (set.has(t.k) || !dist.has(t.k)) continue;
          const cost = dist.get(t.k);
          if (cost > left || cost === 0) continue;
          const path = pathTo(prev, set, t.k);
          let sc;
          if (exact) {
            const trial = new Set(set);
            path.forEach((x) => trial.add(x));
            sc = score(chr, effOf(chr, trial));
          } else {
            sc = cur + path.reduce((a, k) => a + proxyValue(chr, tiles.byKey[k]), 0);
          }
          const ratio = (sc - cur) / cost;
          if (ratio > bestRatio + 1e-9) { bestRatio = ratio; bestScore = sc; bestPath = path; }
        }
        if (!bestPath) break;
        bestPath.forEach((x) => set.add(x));
        left -= bestPath.reduce((a, k) => a + tiles.byKey[k].cost, 0);
        cur = bestScore;
        if (o.signal && o.signal.cancelled) break;
      }
      // Leftover points: support (green) and song (yellow) tiles, including reward tiles. They never
      // lower this unit's score and help other units / rewards. Leader (red) tiles are only taken on
      // the leader's board, member (blue) tiles only on unit members' boards.
      for (let guard = 0; guard < 150 && left > 0; guard++) {
        const { dist, prev } = paths(tiles, set);
        let best = null, bestV = 0;
        for (const t of tiles.list) {
          if (set.has(t.k) || !dist.has(t.k) || !t.eff || (t.type !== "all_member" && t.type !== "content")) continue;
          const cost = dist.get(t.k);
          if (cost > left || cost === 0) continue;
          const path = pathTo(prev, set, t.k);
          if (path.some((k) => { const x = tiles.byKey[k]; return (x.type === "leader" && !(leader && leader.chr === chr)) || (x.type === "card" && !exact); })) continue;
          const v = path.reduce((a, k) => a + ((tiles.byKey[k].eff && tiles.byKey[k].eff.live ? 2 : 1) * tiles.byKey[k].grade), 0) / cost;
          if (v > bestV) { bestV = v; best = path; }
        }
        if (!best) break;
        best.forEach((x) => set.add(x));
        left -= best.reduce((a, k) => a + tiles.byKey[k].cost, 0);
      }
      // Keep the old board when the plan is not better.
      const newEff = effOf(chr, set);
      if (score(chr, newEff) >= score(chr, effOf(chr, prevSets[chr])) - 1e-6) { sets[chr] = set; boardEff[chr] = newEff; }
      done++;
      if (o.onProgress) o.onProgress(0.8 * done / order.length, H.L(H.talents[chr].name));
      if (exact || done % 6 === 0) await tick();
      if (o.signal && o.signal.cancelled) break;
    }

    // Connect cards: greedy assignment of owned ★4/★5 cards to unlocked Connect tiles.
    const cards = Object.keys(progress.cards).filter((id) => G.connect[id]);
    for (const chr of talents) connect[chr] = {};
    const slots = [];
    for (const chr of order) {
      if (!teamChrs.has(chr) && !singers.has(chr)) continue;
      for (const t of B.tilesFor(chr).list) if (t.type === "connection" && sets[chr].has(t.k)) slots.push([chr, t.k]);
    }
    const used = new Set();
    let base = score();
    for (let round = 0; round < slots.length; round++) {
      let best = null;
      for (const [chr, key] of slots) {
        if (connect[chr][key]) continue;
        for (const id of cards) {
          if (used.has(id)) continue;
          // only cards whose range touches something unlocked and useful
          const foot = B.connectFootprint(chr, key, id);
          if (!foot.some((k) => sets[chr].has(k))) continue;
          connect[chr][key] = id;
          const sc = score(chr, effOf(chr, sets[chr]));
          delete connect[chr][key];
          if (sc > base + 1e-6 && (!best || sc > best.s)) best = { chr, key, id, s: sc };
        }
      }
      if (!best) break;
      connect[best.chr][best.key] = best.id;
      used.add(best.id);
      boardEff[best.chr] = effOf(best.chr, sets[best.chr]);
      base = best.s;
      if (o.onProgress) o.onProgress(0.8 + 0.2 * (round + 1) / Math.max(1, slots.length), "Connect");
      await tick();
    }
    const after = score();

    // Summary per changed board + materials for newly unlocked tiles.
    const boards = {};
    const materials = {};
    for (const chr of talents) {
      const set = sets[chr], prev = prevSets[chr];
      const added = [...set].filter((k) => !prev.has(k));
      const removed = [...prev].filter((k) => !set.has(k));
      const conChanged = JSON.stringify(connect[chr]) !== JSON.stringify(prevConnect[chr] || {});
      if (!added.length && !removed.length && !conChanged) continue;
      for (const k of added) for (const [mid, q] of tileMaterials(chr, k)) materials[mid] = (materials[mid] || 0) + q;
      boards[chr] = {
        set: [...set], added, removed, connect: connect[chr], prevConnect: prevConnect[chr] || {},
        points: B.pointsFor(progress, chr), spent: B.spent(chr, set), team: teamChrs.has(chr),
      };
    }
    return { before, after, boards, materials };
  }

  function save(chr, board) {
    H.progress.board[chr] = board.set.slice();
    H.progress.connect = H.progress.connect || {};
    // A card can only be on one board: remove it elsewhere first.
    for (const other in H.progress.connect) for (const k in H.progress.connect[other]) {
      if (other !== chr && Object.values(board.connect).includes(H.progress.connect[other][k])) delete H.progress.connect[other][k];
    }
    H.progress.connect[chr] = Object.assign({}, board.connect);
    H.saveProgress();
  }

  window.HoloBoardPlan = { plan, save };
})();
