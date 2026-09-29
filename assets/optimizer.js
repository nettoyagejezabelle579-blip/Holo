/* Unit search on top of HoloSim.
 * Leaders are screened with a baseline unit, then each promising leader gets a
 * greedy fill + swap-until-stable local search. The best sets are finally tried
 * in every formation order (special skills fire in slot order).
 */
(function () {
  "use strict";
  const H = window.Holo;
  const S = window.HoloSim;
  const G = window.HOLO_GAME;

  const EFFORT = {
    fast: { leaders: 5, passes: 4, finalists: 3 },
    normal: { leaders: 10, passes: 8, finalists: 5 },
    thorough: { leaders: 24, passes: 12, finalists: 8 },
  };

  function permutations(arr) {
    if (arr.length <= 1) return [arr.slice()];
    const out = [];
    arr.forEach((x, i) => {
      const rest = arr.slice(0, i).concat(arr.slice(i + 1));
      for (const p of permutations(rest)) out.push([x].concat(p));
    });
    return out;
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));

  // Leader options: every owned outfit with a leader skill, plus each talent without an outfit skill.
  function leaderOptions(pool, extraOutfits) {
    const list = [];
    const seen = new Set();
    for (const id of pool.concat(extraOutfits || [])) {
      const sim = G.sim[id];
      if (!sim || !sim.leader || seen.has(id)) continue;
      seen.add(id);
      list.push({ chr: H.cardById[id].chr, cardId: id });
    }
    for (const chr in H.talents) list.push({ chr, cardId: null });
    return list;
  }
  const leaderKey = (l) => (l ? l.chr + "|" + (l.cardId || "") : "none");

  /**
   * o = {
   *   env, charts: [chart], weights?: [number], pool: [cardId], overrides?: {cardId: {lv,bloom}},
   *   lockMembers?: [cardId], lockLeader?: {chr, cardId}|null, leaderChr?: string (forced talent),
   *   effort?: "fast"|"normal"|"thorough", onProgress?: (fraction, text) => void, signal?: {cancelled}
   * }
   */
  async function optimize(o) {
    const cfg = EFFORT[o.effort || "normal"];
    const env = o.env;
    const charts = o.charts;
    const weights = o.weights || charts.map(() => 1 / charts.length);
    const overrides = o.overrides || {};
    const prep = (id) => S.prepare(env, id, overrides[id]);
    const locks = (o.lockMembers || []).filter((id) => H.cardById[id]);
    const pool = [...new Set(o.pool.concat(locks))].filter((id) => G.sim[id]);
    let evals = 0;
    const cache = new Map();

    function score(leader, ids) {
      const key = leaderKey(leader) + "#" + ids.join(",");
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const team = { leader, members: ids.map(prep) };
      let s = 0;
      for (let i = 0; i < charts.length; i++) s += weights[i] * S.evaluate(env, team, charts[i]);
      evals++;
      cache.set(key, s);
      return s;
    }
    const chrOf = (id) => H.cardById[id].chr;
    function canAdd(ids, id, skipIdx) {
      if (ids.includes(id)) return false;
      const chr = chrOf(id);
      return !ids.some((x, i) => i !== skipIdx && chrOf(x) === chr);
    }

    async function greedy(leader) {
      const ids = locks.slice(0, 5);
      while (ids.length < 5) {
        let best = null, bestS = -1;
        for (const id of pool) {
          if (!canAdd(ids, id, -1)) continue;
          const s = score(leader, ids.concat(id));
          if (s > bestS) { bestS = s; best = id; }
        }
        if (!best) break;
        ids.push(best);
        if (o.signal && o.signal.cancelled) break;
      }
      return ids;
    }
    async function localSearch(leader, ids) {
      let cur = score(leader, ids);
      for (let pass = 0; pass < cfg.passes; pass++) {
        let improved = false;
        for (let slot = 0; slot < ids.length; slot++) {
          if (locks.includes(ids[slot])) continue;
          let bestId = null, bestS = cur;
          for (const id of pool) {
            if (!canAdd(ids, id, slot)) continue;
            const trial = ids.slice();
            trial[slot] = id;
            const s = score(leader, trial);
            if (s > bestS + 1e-6) { bestS = s; bestId = id; }
          }
          if (bestId) { ids[slot] = bestId; cur = bestS; improved = true; }
          if (evals % 400 < 5) await tick();
          if (o.signal && o.signal.cancelled) return { ids, score: cur };
        }
        if (!improved) break;
      }
      return { ids, score: cur };
    }
    function bestOrder(leader, ids) {
      let best = ids, bestS = score(leader, ids);
      for (const p of permutations(ids)) {
        const s = score(leader, p);
        if (s > bestS + 1e-6) { bestS = s; best = p; }
      }
      return { ids: best, score: bestS };
    }

    // Leader candidates
    let leaders;
    if (o.lockLeader) leaders = [o.lockLeader];
    else {
      leaders = leaderOptions(pool, o.extraOutfits);
      if (o.leaderChr) leaders = leaders.filter((l) => l.chr === o.leaderChr);
    }
    const progress = (f, text) => o.onProgress && o.onProgress(Math.min(1, f), text);

    progress(0.02, "baseline");
    await tick();
    const baseLeader = leaders.find((l) => l.cardId) || leaders[0];
    const baseline = await greedy(baseLeader);
    const screened = leaders.map((l) => ({ l, s: score(l, baseline) })).sort((a, b) => b.s - a.s);
    const kept = screened.slice(0, Math.max(1, cfg.leaders)).map((x) => x.l);

    const results = [];
    for (let i = 0; i < kept.length; i++) {
      if (o.signal && o.signal.cancelled) break;
      const l = kept[i];
      progress(0.05 + (0.8 * i) / kept.length, "leader " + (i + 1) + "/" + kept.length);
      await tick();
      const start = await greedy(l);
      const r = await localSearch(l, start);
      // also try improving the baseline set under this leader
      const r2 = await localSearch(l, baseline.slice());
      const best = r2.score > r.score ? r2 : r;
      results.push({ leader: l, ids: best.ids.slice(), score: best.score });
    }
    // Re-screen every leader against the best set found so far.
    results.sort((a, b) => b.score - a.score);
    if (!o.lockLeader && results.length) {
      const top = results[0];
      for (const l of leaders) {
        const s = score(l, top.ids);
        if (s > top.score + 1e-6) {
          const r = await localSearch(l, top.ids.slice());
          results.push({ leader: l, ids: r.ids.slice(), score: r.score });
        }
      }
      results.sort((a, b) => b.score - a.score);
    }
    progress(0.9, "order");
    await tick();
    // Formation order for the finalists; drop duplicate sets.
    const finals = [];
    const seen = new Set();
    for (const r of results) {
      const key = leaderKey(r.leader) + "#" + r.ids.slice().sort().join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      const ord = bestOrder(r.leader, r.ids);
      finals.push({ leader: r.leader, ids: ord.ids, score: ord.score });
      if (finals.length >= cfg.finalists) break;
    }
    finals.sort((a, b) => b.score - a.score);
    progress(1, "done");
    return { best: finals[0] || null, alternatives: finals.slice(1), evals };
  }

  window.HoloOpt = { optimize, leaderOptions, permutations };
})();
