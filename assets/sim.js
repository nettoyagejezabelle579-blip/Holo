/* Live score estimator for hololive Dreams units.
 *
 * Model (all inputs come from the master data; see /team/method.html):
 *   member stat   = (card stat at level & bloom + flat board bonuses)
 *                   × (1 + passive + leader outfit + board % + memories %)
 *   Unit Score    = Σ members (Performance + Technique + Sense) × (1 + Member Upgrade Bonus)
 *   note score    = Unit Score × song coefficient × note-type coefficient × (1 + combo bonus)
 *                   × (1 + expected active Score UP × (1 + Score Support))
 *   Active skills are checked every cooldown with their activation chance; when several
 *   are active the highest effect wins. Special skills fire at the chart's special
 *   markers in formation order.
 */
(function () {
  "use strict";
  const H = window.Holo;
  const G = window.HOLO_GAME;
  const D = H.D;

  // ---------- chart loading ----------
  const CODE = ["normal", "flick", "long_start", "long_end", "long_flick_end", "long_continuation", "long_relay", "damage"];
  const chartIndex = window.HOLO_CHART_INDEX || {};
  const loading = {};
  function chartBase() {
    const base = document.body.dataset.base || ".";
    return base + "/data/charts/";
  }
  function loadChart(songId) {
    if ((window.HOLO_CHARTS || {})[songId] || !chartIndex[songId]) return Promise.resolve();
    if (loading[songId]) return loading[songId];
    loading[songId] = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = chartBase() + encodeURIComponent(songId) + ".js";
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
    return loading[songId];
  }
  function loadCharts(ids) {
    return Promise.all(ids.map(loadChart));
  }

  const songById = Object.fromEntries(G.songs.map((s) => [s.id, s]));
  const chartCache = new Map();

  function comboBonus(table, combo) {
    let b = 0;
    for (const [from, v] of table) if (combo >= from) b = v; else break;
    return b;
  }

  // Build the per-note weight table for one song/difficulty/play mode.
  function getChart(songId, diff, mode) {
    const key = songId + ":" + diff + ":" + mode;
    if (chartCache.has(key)) return chartCache.get(key);
    const song = songById[songId];
    const raw = ((window.HOLO_CHARTS || {})[songId] || {})[diff];
    let times = [], codes = [], sp, sc, synthetic = false;
    if (raw) {
      let acc = 0;
      const parts = raw.t.split(",");
      for (let i = 0; i < parts.length; i++) {
        acc += parseInt(parts[i], 36);
        times.push(acc / 1000);
        codes.push(raw.k.charCodeAt(i) - 48);
      }
      sp = raw.sp.map((x) => x / 1000);
      sc = raw.sc.slice();
    } else {
      // No parsed chart: spread the known note count evenly and place five special markers.
      synthetic = true;
      const n = (song.diff[diff] && song.diff[diff].notes) || 500;
      const start = 3, end = Math.max(start + 10, song.sec - 3);
      for (let i = 0; i < n; i++) { times.push(start + ((end - start) * i) / Math.max(1, n - 1)); codes.push(0); }
      sp = [0.12, 0.3, 0.48, 0.66, 0.84].map((f) => start + (end - start) * f);
      sc = sp.map((t) => Math.round(((t - start) / (end - start)) * n));
    }
    const combo = G.combos[song.combo] || [[0, 0]];
    const T = [], W = [0];
    let n = 0;
    for (let i = 0; i < times.length; i++) {
      const type = CODE[codes[i]] || "normal";
      if (type === "damage") continue; // avoided, never scored and never counted for combo
      n++;
      const coefRow = G.notes[type] || G.notes.normal;
      const judge = mode === "auto" ? (coefRow.auto || 0) : (coefRow.perfect || 0);
      const bonus = mode === "auto" ? 0 : comboBonus(combo, n);
      T.push(times[i]);
      W.push(W[W.length - 1] + (judge / 1000) * (1 + bonus / 1000));
    }
    const chart = {
      songId, diff, mode, synthetic, song,
      times: Float64Array.from(T), W: Float64Array.from(W), notes: T.length,
      sp, sc, end: (T.length ? T[T.length - 1] : song.sec) + 0.001,
    };
    chartCache.set(key, chart);
    return chart;
  }
  function lowerBound(arr, t) {
    let lo = 0, hi = arr.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < t) lo = mid + 1; else hi = mid; }
    return lo;
  }
  function weightBetween(chart, t0, t1) {
    return chart.W[lowerBound(chart.times, t1)] - chart.W[lowerBound(chart.times, t0)];
  }
  // Time at which the running combo first reaches n (Infinity if never).
  function comboTime(chart, n) {
    if (n <= 0) return 0;
    return n <= chart.notes ? chart.times[n - 1] : Infinity;
  }

  // ---------- environment (user progress + options) ----------
  function posterPermil(count) {
    let v = 0;
    for (const [th, p] of G.posters) if (count >= th) v = p;
    return v;
  }
  // Unlocked board tiles → merged live effects for every holomem.
  function boardEffects(progress, opts) {
    const B = window.HoloBoard;
    const out = {};
    for (const chr in H.talents) {
      if (!opts.board) { out[chr] = []; continue; }
      const set = opts.boardFull ? new Set(B.tilesFor(chr).list.map((t) => t.k)) : B.unlocked(progress, chr);
      out[chr] = B.effects(chr, set, progress);
    }
    return out;
  }
  function upgradeBonus(progress) {
    let sum = 0;
    for (const id in progress.cards) {
      const c = H.cardById[id];
      if (!c || c.announced) continue;
      const lv = progress.cards[id].lv || 1;
      const arr = G.upgrade[c.levelGroup] || [];
      sum += arr[Math.min(arr.length, lv) - 1] || 0;
    }
    return Math.min(G.upgradeCap, sum);
  }

  // opts: { board: bool, mode: "perfect"|"auto", lifeFull: bool, memories, useProgress }
  function makeEnv(progress, opts) {
    opts = Object.assign({ board: true, mode: "perfect", lifeFull: true }, opts || {});
    const board = boardEffects(progress, opts);
    // Support-type board tiles apply to every unit.
    const gFlat = [0, 0, 0];
    const grpFlat = {};
    const content = []; // [{chr, singerType, v}]
    for (const chr in board) {
      for (const e of board[chr]) {
        const v = e.v;
        if (e.node === "all_member") {
          if (e.type === "all_parameter_up") { gFlat[0] += v; gFlat[1] += v; gFlat[2] += v; }
          else if (e.type === "performance_up") gFlat[0] += v;
          else if (e.type === "technique_up") gFlat[1] += v;
          else if (e.type === "sense_up") gFlat[2] += v;
          else if (e.type === "all_parameter_up_for_character_grouping" && e.grp) grpFlat[e.grp] = (grpFlat[e.grp] || 0) + v;
        } else if (e.node === "content" && e.type.startsWith("live_score_bonus")) {
          content.push({ chr, singerType: e.singerType || "all", v });
        }
      }
    }
    const grpCap = (G.boardLimits || {}).all_parameter_up_for_character_grouping || 900;
    for (const g in grpFlat) grpFlat[g] = Math.min(grpCap, grpFlat[g]);
    return {
      progress, opts, board, gFlat, grpFlat, content,
      memory: posterPermil(progress.memories || 0),
      upgrade: upgradeBonus(progress),
      calib: opts.calib != null ? opts.calib : H.store.get("calibration", 1) || 1,
      prepared: new Map(),
    };
  }

  // Card as it is in the user's box (or a hypothetical copy for "what to pull").
  function prepare(env, cardId, override) {
    const key = cardId + (override ? ":" + override.lv + ":" + override.bloom : "");
    let m = env.prepared.get(key);
    if (m) return m;
    const card = H.cardById[cardId];
    const own = override || (env.progress.cards[cardId]) || { lv: H.maxLevel(card), bloom: 0 };
    const lv = Math.max(1, Math.min(H.maxLevel(card), own.lv || 1));
    const bloom = Math.max(0, Math.min(5, own.bloom || 0));
    const s = H.stats(card, lv, bloom);
    const sim = G.sim[cardId];
    const tl = H.talents[card.chr];
    const aLv = H.skillLevelAt(card, "active", bloom), sLv = H.skillLevelAt(card, "special", bloom), pLv = H.skillLevelAt(card, "passive", bloom);
    // Member-type board tiles of this talent.
    const flat = [0, 0, 0], pct = [0, 0, 0];
    let rate = 0, ctShort = 0, seu = 0;
    for (const e of env.board[card.chr] || []) {
      if (e.node !== "card") continue;
      const v = e.v;
      if (PCT[e.type]) { pct[0] += v * PCT[e.type][0]; pct[1] += v * PCT[e.type][1]; pct[2] += v * PCT[e.type][2]; continue; }
      if (e.type === "live_active_skill_effect_up_permil_up") { seu += v; continue; }
      if (e.type === "all_parameter_up") { flat[0] += v; flat[1] += v; flat[2] += v; }
      else if (e.type === "performance_up") flat[0] += v;
      else if (e.type === "technique_up") flat[1] += v;
      else if (e.type === "sense_up") flat[2] += v;
      else if (e.type === "live_active_skill_activation_probability_up_permil_up") rate += v;
      else if (e.type === "live_active_skill_cool_time_shorten_permil_up") ctShort += v;
    }
    m = {
      id: cardId, card, chr: card.chr, attr: card.attr, groups: tl ? tl.groups : [],
      lv, bloom, base: s, baseTotal: s[3], flat,
      active: sim.active[aLv - 1] || sim.active[0],
      special: sim.special[sLv - 1] || sim.special[0],
      passive: sim.passive[pLv - 1] || sim.passive[0],
      leader: sim.leader, rate, ctShort, pct, seu,
    };
    env.prepared.set(key, m);
    return m;
  }

  // ---------- trigger & target helpers ----------
  function trigOk(trigs, ctx, time, combo) {
    for (const t of trigs) {
      switch (t.type) {
        case "deck_card_attribute": if (ctx.attrCount[t.attr] < (t.n || 1)) return false; break;
        case "deck_card_character_grouping": if ((ctx.grpCount[t.grp] || 0) < (t.n || 1)) return false; break;
        case "deck_leader_character": if (!t.chrs.includes(ctx.leaderChr)) return false; break;
        case "deck_leader_character_grouping": if (!ctx.leaderGroups.includes(t.grp)) return false; break;
        case "music_character": if (!ctx.songAll && !t.chrs.some((c) => ctx.songChrs.has(c))) return false; break;
        case "combo_gte": if (combo == null || combo < t.n) return false; break;
        case "life_gte": if (!ctx.lifeFull) return false; break;
        case "life_lte": if (ctx.lifeFull) return false; break;
        default: break; // judgement conditions: assumed met
      }
    }
    return true;
  }
  function hasTimeTrigger(trigs) {
    return trigs.some((t) => t.type === "combo_gte");
  }
  function recipients(members, tgt, selfIdx, order) {
    if (!tgt || tgt.type === "self") return [selfIdx];
    if (tgt.type === "all") return members.map((_, i) => i);
    let list = order;
    if (tgt.type === "attribute") list = order.filter((i) => members[i].attr === tgt.attr);
    else if (tgt.type === "character_grouping") list = order.filter((i) => members[i].groups.includes(tgt.grp));
    else if (tgt.type === "character") list = order.filter((i) => members[i].chr === tgt.chr);
    return tgt.n ? list.slice(0, tgt.n) : list;
  }
  const PCT = {
    performance_up_permil_up: [1, 0, 0], technique_up_permil_up: [0, 1, 0], sense_up_permil_up: [0, 0, 1],
    all_parameter_up_permil_up: [1, 1, 1],
  };
  function applyEffects(effs, members, selfIdx, order, acc) {
    for (const e of effs) {
      const who = recipients(members, e.tgt, selfIdx, order);
      const pct = PCT[e.type];
      for (const i of who) {
        if (pct) { acc.pct[i][0] += e.v * pct[0]; acc.pct[i][1] += e.v * pct[1]; acc.pct[i][2] += e.v * pct[2]; }
        else if (e.type === "live_active_skill_effect_up_permil_up") acc.seu[i] += e.v;
      }
    }
  }

  // ---------- evaluation ----------
  // team = { leader: { chr, cardId|null }, members: [prepared member ×1..5] }
  function evaluate(env, team, chart, detail) {
    const members = team.members;
    const n = members.length;
    const song = chart.song;
    const leaderChr = team.leader ? team.leader.chr : null;
    const ctx = {
      attrCount: { cute: 0, happy: 0, pure: 0 }, grpCount: {},
      leaderChr, leaderGroups: leaderChr && H.talents[leaderChr] ? H.talents[leaderChr].groups : [],
      songChrs: new Set(song.chrs), songAll: song.singerType === "all", lifeFull: env.opts.lifeFull,
    };
    for (const m of members) {
      ctx.attrCount[m.attr]++;
      for (const g of m.groups) ctx.grpCount[g] = (ctx.grpCount[g] || 0) + 1;
    }
    // Recipient priority for capped targets: highest base total first.
    const order = members.map((_, i) => i).sort((a, b) => members[b].baseTotal - members[a].baseTotal || a - b);
    const acc = { pct: members.map((m) => m.pct.slice()), seu: members.map((m) => m.seu) };

    // Leader outfit skill
    const lead = team.leader && team.leader.cardId ? G.sim[team.leader.cardId].leader : null;
    if (lead) {
      if (trigOk(lead.trig, ctx)) applyEffects(lead.eff, members, -1, order, acc);
      if (lead.add.length && trigOk(lead.addTrig, ctx)) applyEffects(lead.add, members, -1, order, acc);
    }
    // Passive skills
    for (let i = 0; i < n; i++) {
      const p = members[i].passive;
      if (p && trigOk(p.trig, ctx)) applyEffects(p.eff, members, i, order, acc);
    }
    // Leader-type board tiles of the leader talent
    const leadFlat = [0, 0, 0], leadPct = [0, 0, 0];
    let leadSeu = 0;
    if (leaderChr) {
      for (const e of env.board[leaderChr] || []) {
        if (e.node !== "leader") continue;
        if (e.songTrig === "music_skill_tree_character" && !(ctx.songAll || ctx.songChrs.has(leaderChr))) continue;
        const v = e.v;
        if (e.type === "all_parameter_up") { leadFlat[0] += v; leadFlat[1] += v; leadFlat[2] += v; }
        else if (e.type === "performance_up") leadFlat[0] += v;
        else if (e.type === "technique_up") leadFlat[1] += v;
        else if (e.type === "sense_up") leadFlat[2] += v;
        else if (PCT[e.type]) { leadPct[0] += v * PCT[e.type][0]; leadPct[1] += v * PCT[e.type][1]; leadPct[2] += v * PCT[e.type][2]; }
        else if (e.type === "live_active_skill_effect_up_permil_up") leadSeu += v;
      }
    }

    // Final member stats and Unit Score
    let raw = 0;
    const stats = detail ? [] : null;
    for (let i = 0; i < n; i++) {
      const m = members[i];
      let tot = 0;
      const row = detail ? [0, 0, 0] : null;
      for (let k = 0; k < 3; k++) {
        let flat = m.flat[k] + env.gFlat[k] + leadFlat[k];
        for (const g of m.groups) flat += env.grpFlat[g] || 0;
        const v = (m.base[k] + flat) * (1 + (acc.pct[i][k] + leadPct[k] + env.memory) / 1000);
        tot += v;
        if (row) row[k] = v;
      }
      raw += tot;
      if (stats) stats.push(row);
    }
    const unit = raw * (1 + env.upgrade / 10000);

    // Song bonus from content-type board tiles (capped)
    let songBonus = 0;
    for (const c of env.content) {
      if (!(ctx.songAll || ctx.songChrs.has(c.chr))) continue;
      if (c.singerType !== "all" && c.singerType !== song.singerType) continue;
      songBonus += c.v;
    }
    songBonus = Math.min((G.boardLimits || {}).live_score_bonus_add_permil_up_by_music_skill_tree_character_and_music_singer_type || 100, songBonus);

    // ----- skill timeline -----
    const specials = [];
    for (let i = 0; i < n && i < chart.sp.length; i++) {
      const s = members[i].special;
      if (!s) continue;
      const t0 = chart.sp[i];
      const combo = chart.sc[i] != null ? chart.sc[i] : 0;
      const effs = s.eff.concat(s.add.length && trigOk(s.trig, ctx, t0, combo) ? s.add : []);
      let sup = 0, rate = 0;
      for (const e of effs) {
        if (e.type === "score_up_effect_up_permil_up") sup += e.v;
        else if (e.type === "live_active_skill_activation_probability_up_permil_up") rate += e.v;
      }
      specials.push({ slot: i, t0, t1: t0 + s.dur, sup: sup / 1000, rate: rate / 1000 });
    }
    const act = [];
    const bounds = [0, chart.end];
    for (let i = 0; i < n; i++) {
      const m = members[i];
      const a = m.active;
      if (!a) continue;
      const ct = a.ct * (1 - m.ctShort / 1000);
      let base = 0, add = 0;
      for (const e of a.eff) if (e.type === "score_up_permil_up") base = Math.max(base, e.v);
      for (const e of a.add) if (e.type === "score_up_permil_up") add = Math.max(add, e.v);
      let addFrom = Infinity;
      if (a.add.length) {
        const staticOk = trigOk(a.trig.filter((t) => t.type !== "combo_gte"), ctx);
        if (staticOk) {
          const ct2 = a.trig.find((t) => t.type === "combo_gte");
          addFrom = ct2 ? comboTime(chart, ct2.n) : 0;
          if (addFrom !== Infinity && addFrom > 0) bounds.push(addFrom);
        }
      }
      const checks = [];
      for (let t = ct; t < chart.end; t += ct) { checks.push(t); bounds.push(t, Math.min(t + a.dur, chart.end)); }
      act.push({ i, ct, dur: a.dur, p: a.p, base: base / 1000, add: add / 1000, addFrom, checks,
        mult: 1 + (acc.seu[i] + leadSeu) / 1000, rate: m.rate / 1000 });
    }
    for (const s of specials) bounds.push(s.t0, Math.min(s.t1, chart.end));
    bounds.sort((a, b) => a - b);

    let sumBase = 0, sumSkill = 0;
    const vals = new Array(act.length), probs = new Array(act.length);
    const uptime = detail ? new Array(n).fill(0) : null;
    for (let b = 0; b < bounds.length - 1; b++) {
      const t0 = bounds[b], t1 = bounds[b + 1];
      if (t1 <= t0) continue;
      const w = weightBetween(chart, t0, t1);
      if (w <= 0) continue;
      let sup = 0;
      for (const s of specials) if (t0 >= s.t0 && t0 < s.t1) sup += s.sup;
      let k = 0;
      for (const a of act) {
        // last check at or before t0
        const idx = Math.floor((t0 + 1e-9) / a.ct);
        const c = idx * a.ct;
        if (idx < 1 || t0 >= c + a.dur) continue;
        let rate = a.rate;
        for (const s of specials) if (c >= s.t0 && c < s.t1) rate += s.rate;
        const p = Math.min(1, a.p * (1 + rate));
        const v = (t0 >= a.addFrom ? Math.max(a.base, a.add) : a.base) * (a.mult + sup);
        vals[k] = v; probs[k] = p; k++;
        if (uptime) uptime[a.i] += w * p;
      }
      // expected maximum of independent effects
      let e = 0;
      if (k) {
        const idxs = [];
        for (let j = 0; j < k; j++) idxs.push(j);
        idxs.sort((x, y) => vals[y] - vals[x]);
        let none = 1;
        for (const j of idxs) { e += vals[j] * probs[j] * none; none *= 1 - probs[j]; }
      }
      sumBase += w;
      sumSkill += w * e;
    }
    const scale = unit * (song.coef / 1000) * (1 + songBonus / 1000) * env.calib;
    const score = scale * (sumBase + sumSkill);
    if (!detail) return score;
    const totalW = chart.W[chart.W.length - 1] || 1;
    return {
      score, unit, raw, songBonus, stats, base: scale * sumBase, skill: scale * sumSkill,
      uptime: uptime.map((u) => u / totalW), specials,
      upgrade: env.upgrade, memory: env.memory, leadFlat, leadPct, pct: acc.pct, seu: acc.seu.map((x) => x + leadSeu),
    };
  }

  function rankFor(list, value) {
    let r = "";
    for (const [th, name] of list.slice().sort((a, b) => a[0] - b[0])) if (value >= th) r = name;
    return r;
  }

  window.HoloSim = {
    songById, loadChart, loadCharts, getChart, makeEnv, prepare, evaluate, boardEffects, upgradeBonus,
    posterPermil, rankFor, hasTimeTrigger, chartIndex,
  };
})();
