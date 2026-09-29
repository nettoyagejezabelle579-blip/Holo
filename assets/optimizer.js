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
    fast: { leaders: 5, passes: 4, finalists: 3, pairCand: 12, themes: false, swapOrderCand: 1 },
    normal: { leaders: 10, passes: 8, finalists: 5, pairCand: 18, themes: true, swapOrderCand: 3 },
    thorough: { leaders: 24, passes: 12, finalists: 8, pairCand: 26, themes: true, swapOrderCand: 5 },
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
      for (let i = 0; i < charts.length; i++) {
        let v = S.evaluate(env, team, charts[i], false, o.luck || "avg");
        if (o.objective === "eventpt") v *= 1 + S.eventPtBonus(env, team, charts[i].songId);
        s += weights[i] * v;
      }
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
        // Formation order matters (special skills fire in slot order): try swapping positions too.
        for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
          const trial = ids.slice();
          [trial[i], trial[j]] = [trial[j], trial[i]];
          const s = score(leader, trial);
          if (s > cur + 1e-6) { ids.splice(0, ids.length, ...trial); cur = s; improved = true; }
        }
        if (!improved) break;
      }
      return { ids, score: cur };
    }
    // Replace two members at once (synergies such as "2 or more Cute" or unit conditions need this).
    async function pairSearch(leader, ids) {
      let cur = score(leader, ids);
      const free = ids.map((_, i) => i).filter((i) => !locks.includes(ids[i]));
      // Candidates: cards that do best when dropped into the unit alone.
      const cand = pool.filter((id) => !ids.includes(id)).map((id) => {
        let best = -1;
        for (const slot of free) {
          if (!canAdd(ids, id, slot)) continue;
          const trial = ids.slice(); trial[slot] = id;
          best = Math.max(best, score(leader, trial));
        }
        return { id, s: best };
      }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, cfg.pairCand).map((x) => x.id);
      let bestTrial = null, bestS = cur;
      for (let a = 0; a < free.length; a++) for (let b = a + 1; b < free.length; b++) {
        const i = free[a], j = free[b];
        for (let x = 0; x < cand.length; x++) for (let y = 0; y < cand.length; y++) {
          if (x === y) continue;
          const trial = ids.slice();
          trial[i] = cand[x]; trial[j] = cand[y];
          if (new Set(trial.map(chrOf)).size < trial.length) continue;
          const sc = score(leader, trial);
          if (sc > bestS + 1e-6) { bestS = sc; bestTrial = trial; }
        }
        if (evals % 400 < 5) await tick();
      }
      return bestTrial ? { ids: bestTrial, score: bestS } : { ids, score: cur };
    }
    // A swap that only pays off together with a new formation order: for each slot, re-order the
    // unit around its most promising replacement cards.
    async function swapOrderSearch(leader, ids) {
      let best = { ids: ids.slice(), score: score(leader, ids) };
      for (let slot = 0; slot < ids.length; slot++) {
        if (locks.includes(ids[slot])) continue;
        const cands = [];
        for (const id of pool) {
          if (!canAdd(ids, id, slot)) continue;
          const trial = ids.slice();
          trial[slot] = id;
          cands.push({ trial, s: score(leader, trial) });
        }
        cands.sort((a, b) => b.s - a.s);
        for (const c of cands.slice(0, cfg.swapOrderCand)) {
          const ord = bestOrder(leader, c.trial);
          if (ord.score > best.score + 1e-6) best = ord;
        }
        if (evals % 400 < 130) await tick();
      }
      return best;
    }
    // Alternate order search, single swaps and pair swaps until nothing improves.
    async function polish(leader, ids) {
      let r = { ids: ids.slice(), score: score(leader, ids) };
      for (let k = 0; k < 6; k++) {
        const ord = bestOrder(leader, r.ids);
        let ls = await localSearch(leader, ord.ids.slice());
        if (ls.score <= Math.max(r.score, ord.score) + 1e-6) {
          const cur = ord.score > r.score ? ord : r;
          let pr = await pairSearch(leader, cur.ids.slice());
          if (pr.score <= cur.score + 1e-6) pr = await swapOrderSearch(leader, cur.ids.slice());
          if (pr.score <= Math.max(r.score, ord.score) + 1e-6) { if (ord.score > r.score) r = ord; break; }
          ls = await localSearch(leader, pr.ids.slice());
        }
        r = ls;
      }
      return r;
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
    // Theme starts: units built around one type, one unit/generation, or a leader outfit's condition.
    if (cfg.themes && !(o.signal && o.signal.cancelled)) {
      const themes = [];
      for (const attr of ["cute", "happy", "pure"]) themes.push((id) => H.cardById[id].attr === attr);
      const grpSeen = new Set();
      for (const id of pool) for (const g of (H.talents[chrOf(id)] || { groups: [] }).groups) grpSeen.add(g);
      for (const g of grpSeen) themes.push((id) => H.talents[chrOf(id)].groups.includes(g));
      const leadersByScore = results.map((r) => r.leader);
      for (let ti = 0; ti < themes.length; ti++) {
        const fit = themes[ti];
        const members = pool.filter(fit);
        if (members.length < 2) continue;
        // Greedy fill restricted to the theme first, then open to everything.
        for (const l of leadersByScore.slice(0, 3)) {
          const ids = locks.slice(0, 5);
          for (const phase of [members, pool]) {
            while (ids.length < 5) {
              let best = null, bestS = -1;
              for (const id of phase) {
                if (!canAdd(ids, id, -1)) continue;
                const sc = score(l, ids.concat(id));
                if (sc > bestS) { bestS = sc; best = id; }
              }
              if (!best) break;
              ids.push(best);
              if (phase === members && ids.filter(fit).length >= 3) break;
            }
          }
          if (ids.length < 5) continue;
          const r = await localSearch(l, ids);
          results.push({ leader: l, ids: r.ids.slice(), score: r.score });
        }
        progress(0.6 + (0.2 * ti) / themes.length, "themes");
        if (o.signal && o.signal.cancelled) break;
      }
      // Leader outfits with a unit condition: try each with its best-fitting start.
      for (const l of leaders.filter((x) => x.cardId)) {
        const trig = (G.sim[l.cardId].leader.trig || [])[0];
        if (!trig || !(trig.attr || trig.grp)) continue;
        const fit = (id) => trig.attr ? H.cardById[id].attr === trig.attr : H.talents[chrOf(id)].groups.includes(trig.grp);
        const members = pool.filter(fit);
        if (members.length < (trig.n || 1)) continue;
        const start = results[0].ids.filter((id) => !fit(id)).slice(0, 5 - Math.min(5, trig.n || 1));
        const add = members.map((id) => ({ id, s: score(l, [id]) })).sort((a, b) => b.s - a.s).map((x) => x.id);
        const ids = locks.slice(0, 5);
        for (const id of add) { if (ids.filter(fit).length >= (trig.n || 1)) break; if (canAdd(ids, id, -1)) ids.push(id); }
        for (const id of start) if (ids.length < 5 && canAdd(ids, id, -1)) ids.push(id);
        while (ids.length < 5) {
          let best = null, bestS = -1;
          for (const id of pool) { if (!canAdd(ids, id, -1)) continue; const sc = score(l, ids.concat(id)); if (sc > bestS) { bestS = sc; best = id; } }
          if (!best) break;
          ids.push(best);
        }
        if (ids.length < 5) continue;
        const r = await localSearch(l, ids);
        results.push({ leader: l, ids: r.ids.slice(), score: r.score });
        if (evals % 400 < 50) await tick();
        if (o.signal && o.signal.cancelled) break;
      }
      results.sort((a, b) => b.score - a.score);
    }

    // Re-screen every leader against the best sets found so far and search the promising new ones.
    results.sort((a, b) => b.score - a.score);
    if (!o.lockLeader && results.length) {
      const searched = new Set(results.map((r) => leaderKey(r.leader)));
      for (let round = 0; round < 3; round++) {
        const sets = results.slice(0, 3).map((r) => r.ids);
        const rescreen = leaders.filter((l) => !searched.has(leaderKey(l)))
          .map((l) => ({ l, s: Math.max(...sets.map((ids) => score(l, ids))) }))
          .sort((a, b) => b.s - a.s).slice(0, Math.max(2, Math.ceil(cfg.leaders / 2)));
        let gained = false;
        for (const { l } of rescreen) {
          searched.add(leaderKey(l));
          const bestSet = sets.map((ids) => ({ ids, s: score(l, ids) })).sort((a, b) => b.s - a.s)[0].ids;
          const r = await localSearch(l, bestSet.slice());
          if (r.score > results[0].score + 1e-6) gained = true;
          results.push({ leader: l, ids: r.ids.slice(), score: r.score });
          if (o.signal && o.signal.cancelled) break;
        }
        results.sort((a, b) => b.score - a.score);
        if (!gained) break;
      }
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
      const ord = await polish(r.leader, r.ids);
      finals.push({ leader: r.leader, ids: ord.ids, score: ord.score });
      if (finals.length >= cfg.finalists) break;
    }
    finals.sort((a, b) => b.score - a.score);
    progress(1, "done");
    return { best: finals[0] || null, alternatives: finals.slice(1), evals };
  }

  window.HoloOpt = { optimize, leaderOptions, permutations };
})();
