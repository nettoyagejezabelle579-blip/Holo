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
  // Share of each note code over the 175 parsed charts (for songs without chart data).
  const SYNTH_MIX = [88179, 10344, 17194, 15045, 2149, 27932, 9935].map((v, _, a) => v / a.reduce((x, y) => x + y, 0));
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
  const EVENTS = window.HOLO_EVENTS || { rules: { scoreBonus: 0.1, ptPerCard: 0.3, ptNewCard: 0.3, ptBloomPerStage: 0.06 }, events: [] };
  // The newest event that uses this song (with its bonus cards), or null.
  function eventSong(songId) {
    for (const e of EVENTS.events) for (const s of e.songs) if (s.song === songId) return Object.assign({ eventId: e.id }, s);
    return null;
  }
  function eventOf(songId) {
    return EVENTS.events.find((e) => e.songs.some((s) => s.song === songId)) || null;
  }
  // Event badge/point multiplier for a unit (in-game 獲得加成): +30% per event card in the unit,
  // +30% when the leader is an event holomem, plus a Bloom bonus for every event holomem card.
  function eventPtBonus(env, team, songId, detail) {
    const e = eventOf(songId);
    if (!e) return detail ? { total: 0 } : 0;
    const cards = new Set(e.songs.flatMap((s) => s.cards));
    const holomems = new Set(e.songs.map((s) => s.chr));
    const r = EVENTS.rules;
    let member = 0, bloom = 0;
    for (const m of team.members) {
      if (cards.has(m.id)) member += r.ptPerCard;
      if (holomems.has(m.chr)) bloom += ((r.ptBloom || {})[H.cardById[m.id].rarity] || [])[m.bloom || 0] || 0;
    }
    const holomem = team.leader && holomems.has(team.leader.chr) ? r.ptHolomem || 0 : 0;
    const total = member + holomem + bloom;
    return detail ? { total, member, holomem, bloom } : total;
  }
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
      // The listed note count includes hold ticks/relays (0.10 each), so use the average note-type mix
      // of all parsed charts (tap 51%, flick 6%, hold start 10%, hold end 9%, flick end 1%, tick 16%, relay 6%).
      const mix = SYNTH_MIX, got = mix.map(() => 0);
      for (let i = 0; i < n; i++) {
        times.push(start + ((end - start) * i) / Math.max(1, n - 1));
        let pick = 0, gap = -Infinity;
        for (let k = 0; k < mix.length; k++) { const g = mix[k] * (i + 1) - got[k]; if (g > gap) { gap = g; pick = k; } }
        got[pick]++;
        codes.push(pick);
      }
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
      // Evenly spread notes still score ~7% above real charts (checked on 14 charted songs):
      // real charts put fewer notes inside skill windows, so scale synthetic notes down to match.
      W.push(W[W.length - 1] + (judge / 1000) * (1 + bonus / 1000) * (synthetic ? 0.935 : 1));
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
  // Board source setting → makeEnv options.
  function boardOpts(src) {
    return { board: src !== "off", boardFull: src === "full", boardRole: !src || src === "role" };
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
  // boardOverride: optional {chr: [effects]} (used by the board planner to try variations quickly).
  // Support-type (all units) and song-type parts of one board.
  function supportPart(chr, effs) {
    const g = [0, 0, 0], grp = {}, content = [];
    for (const e of effs) {
      const v = e.v;
      if (e.node === "all_member") {
        if (e.type === "all_parameter_up") { g[0] += v; g[1] += v; g[2] += v; }
        else if (e.type === "performance_up") g[0] += v;
        else if (e.type === "technique_up") g[1] += v;
        else if (e.type === "sense_up") g[2] += v;
        else if (e.type === "all_parameter_up_for_character_grouping" && e.grp) grp[e.grp] = (grp[e.grp] || 0) + v;
      } else if (e.node === "content" && e.type.startsWith("live_score_bonus")) {
        content.push({ chr, singerType: e.singerType || "all", v });
      }
    }
    return { g, grp, content };
  }
  // Member-type part of one board (applies to that holomem's card in the unit).
  function cardPart(effs) {
    const flat = [0, 0, 0], pct = [0, 0, 0];
    let rate = 0, ctShort = 0, seu = 0;
    for (const e of effs || []) {
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
    return { flat, pct, rate, ctShort, seu };
  }

  // opts: { board: bool, boardFull: bool, boardRole: bool, mode: "perfect"|"auto", lifeFull: bool }
  //   boardRole: every board is planned for the holomem's role in the unit being scored (leader /
  //   member / not in the unit) from its rank points, instead of the boards saved in My Data.
  // boardOverride: optional {chr: [effects]} (used by the board planner to try variations quickly).
  function makeEnv(progress, opts, boardOverride) {
    opts = Object.assign({ board: true, mode: "perfect", lifeFull: true }, opts || {});
    let board = boardOverride || null, role = null, supBoard;
    if (!board && opts.board && opts.boardRole && !opts.boardFull) {
      const B = window.HoloBoard;
      role = { eff: { leader: {}, member: {}, support: {} }, sup: { leader: {}, member: {}, support: {} }, lead: {} };
      for (const chr in H.talents) {
        for (const r of ["leader", "member", "support"]) {
          const eff = B.effects(chr, B.roleSetup(progress, chr, r), progress);
          role.eff[r][chr] = eff;
          role.sup[r][chr] = supportPart(chr, eff);
        }
        // The leader's own card uses the leader board's member tiles (difference to the member board).
        const a = cardPart(role.eff.leader[chr]), b = cardPart(role.eff.member[chr]);
        role.lead[chr] = { flat: a.flat.map((x, i) => x - b.flat[i]), pct: a.pct.map((x, i) => x - b.pct[i]),
          rate: a.rate - b.rate, ctShort: a.ctShort - b.ctShort, seu: a.seu - b.seu };
      }
      board = role.eff.member; // member tiles for prepare()
      supBoard = role.eff.support; // every board is a support board unless its holomem is in the unit
    } else {
      board = board || boardEffects(progress, opts);
      supBoard = board;
    }
    // Support-type board tiles apply to every unit.
    const gFlat = [0, 0, 0];
    const grpRaw = {};
    const content = []; // [{chr, singerType, v}]
    for (const chr in supBoard) {
      const p = supportPart(chr, supBoard[chr]);
      for (let k = 0; k < 3; k++) gFlat[k] += p.g[k];
      for (const g in p.grp) grpRaw[g] = (grpRaw[g] || 0) + p.grp[g];
      content.push(...p.content);
    }
    const grpCap = (G.boardLimits || {}).all_parameter_up_for_character_grouping || 900;
    const grpFlat = {};
    for (const g in grpRaw) grpFlat[g] = Math.min(grpCap, grpRaw[g]);
    return {
      progress, opts, board, gFlat, grpFlat, grpRaw, grpCap, content, role, leadAdj: new Map(),
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
    const { flat, pct, rate, ctShort, seu } = cardPart(env.board[card.chr]);
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
        // "When X is included as a singer": all-hololive songs list no singers, so it only counts on songs X is credited on.
        case "music_character": if (!t.chrs.some((c) => ctx.songChrs.has(c))) return false; break;
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
  function applyEffects(effs, members, selfIdx, order, acc, bucket) {
    for (const e of effs) {
      const who = recipients(members, e.tgt, selfIdx, order);
      const pct = PCT[e.type];
      const tgt = acc[bucket];
      for (const i of who) {
        if (pct) { tgt[i][0] += e.v * pct[0]; tgt[i][1] += e.v * pct[1]; tgt[i][2] += e.v * pct[2]; }
        else if (e.type === "live_active_skill_effect_up_permil_up") acc.seu[i] += e.v;
      }
    }
  }

  // Boards planned for this unit's roles: the holomems in the unit use their leader/member board
  // (its support/song tiles replace the support board's), the leader's card gets the leader board's member tiles.
  function roleBoards(env, members, leaderChr) {
    const R = env.role;
    const chrs = new Set(members.map((m) => m.chr));
    if (leaderChr) chrs.add(leaderChr);
    const gFlat = env.gFlat.slice(), grp = Object.assign({}, env.grpRaw);
    const content = env.content.filter((c) => !chrs.has(c.chr));
    for (const chr of chrs) {
      const a = R.sup[chr === leaderChr ? "leader" : "member"][chr], b = R.sup.support[chr];
      if (!a || !b) continue;
      for (let k = 0; k < 3; k++) gFlat[k] += a.g[k] - b.g[k];
      for (const g in a.grp) grp[g] = (grp[g] || 0) + a.grp[g];
      for (const g in b.grp) grp[g] = (grp[g] || 0) - b.grp[g];
      content.push(...a.content);
    }
    const grpFlat = {};
    for (const g in grp) grpFlat[g] = Math.min(env.grpCap, grp[g]);
    const out = leaderChr && R.lead[leaderChr] ? members.map((m) => {
      if (m.chr !== leaderChr) return m;
      let x = env.leadAdj.get(m);
      if (!x) {
        const d = R.lead[leaderChr];
        x = Object.assign({}, m, { flat: m.flat.map((v, i) => v + d.flat[i]), pct: m.pct.map((v, i) => v + d.pct[i]),
          rate: m.rate + d.rate, ctShort: m.ctShort + d.ctShort, seu: m.seu + d.seu });
        env.leadAdj.set(m, x);
      }
      return x;
    }) : members;
    return { members: out, gFlat, grpFlat, content };
  }

  // Song (yellow) board tiles: solo → "solo songs by X", group → "unit songs featuring X",
  // all → "when playing all-hololive (全体) songs" (no singer condition).
  function songTileApplies(singerType, chr, song) {
    if (singerType === "all") return song.singerType === "all";
    return singerType === song.singerType && song.chrs.includes(chr);
  }

  // ---------- evaluation ----------
  // team = { leader: { chr, cardId|null }, members: [prepared member ×1..5] }
  // luck: "avg" (expected score, default) | "max" (every active check succeeds) | function () -> [0,1) (one random play)
  function evaluate(env, team, chart, detail, luck) {
    luck = luck || "avg";
    const rolls = typeof luck === "function" ? new Map() : null;
    let members = team.members;
    const n = members.length;
    const song = chart.song;
    const leaderChr = team.leader ? team.leader.chr : null;
    let gFlat = env.gFlat, grpFlat = env.grpFlat, content = env.content;
    if (env.role) ({ members, gFlat, grpFlat, content } = roleBoards(env, members, leaderChr));
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
    const acc = { out: members.map(() => [0, 0, 0]), pas: members.map(() => [0, 0, 0]), seu: members.map((m) => m.seu) };

    // Leader outfit skill
    const lead = team.leader && team.leader.cardId ? G.sim[team.leader.cardId].leader : null;
    if (lead) {
      if (trigOk(lead.trig, ctx)) applyEffects(lead.eff, members, -1, order, acc, "out");
      if (lead.add.length && trigOk(lead.addTrig, ctx)) applyEffects(lead.add, members, -1, order, acc, "out");
    }
    // Passive skills
    for (let i = 0; i < n; i++) {
      const p = members[i].passive;
      if (p && trigOk(p.trig, ctx)) applyEffects(p.eff, members, i, order, acc, "pas");
    }
    // Leader-type board tiles of the leader talent
    const leadFlat = [0, 0, 0], leadPct = [0, 0, 0];
    let leadSeu = 0;
    if (leaderChr) {
      for (const e of (env.role ? env.role.eff.leader[leaderChr] : env.board[leaderChr]) || []) {
        if (e.node !== "leader") continue;
        if (e.songTrig === "music_skill_tree_character" && !ctx.songChrs.has(leaderChr)) continue;
        const v = e.v;
        if (e.type === "all_parameter_up") { leadFlat[0] += v; leadFlat[1] += v; leadFlat[2] += v; }
        else if (e.type === "performance_up") leadFlat[0] += v;
        else if (e.type === "technique_up") leadFlat[1] += v;
        else if (e.type === "sense_up") leadFlat[2] += v;
        else if (PCT[e.type]) { leadPct[0] += v * PCT[e.type][0]; leadPct[1] += v * PCT[e.type][1]; leadPct[2] += v * PCT[e.type][2]; }
        else if (e.type === "live_active_skill_effect_up_permil_up") leadSeu += v;
      }
    }

    // Final member stats and Unit Score. Every percentage bonus applies to the card's own
    // (level + bloom) stats; flat board bonuses are added on top.
    let unit = 0;
    const stats = detail ? [] : null;
    const parts = detail ? { member: 0, board: 0, passive: 0, memory: 0, upgrade: 0, outfit: 0 } : null;
    const upg = env.upgrade / 10; // permyriad -> permil
    for (let i = 0; i < n; i++) {
      const m = members[i];
      const row = detail ? [0, 0, 0] : null;
      for (let k = 0; k < 3; k++) {
        const b = m.base[k];
        let flat = m.flat[k] + gFlat[k] + leadFlat[k];
        for (const g of m.groups) flat += grpFlat[g] || 0;
        const boardPct = m.pct[k] + leadPct[k];
        const v = b + flat + b * (boardPct + acc.pas[i][k] + acc.out[i][k] + env.memory + upg) / 1000;
        unit += v;
        if (row) {
          row[k] = v;
          parts.member += b; parts.board += flat + b * boardPct / 1000; parts.passive += b * acc.pas[i][k] / 1000;
          parts.memory += b * env.memory / 1000; parts.upgrade += b * upg / 1000; parts.outfit += b * acc.out[i][k] / 1000;
        }
      }
      if (stats) stats.push(row);
    }
    const raw = unit;

    // Song bonus from content-type board tiles (capped)
    let songBonus = 0;
    for (const c of content) {
      if (!songTileApplies(c.singerType, c.chr, song)) continue;
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
        // Score Support X%: the Active Score UP in effect counts X% of its value (120% → ×1.2), matching
        // holodori.best; several supports at once add their excess over 100%.
        if (e.type === "score_up_effect_up_permil_up") sup += e.v - 1000;
        else if (e.type === "live_active_skill_activation_probability_up_permil_up") rate += e.v;
      }
      const supPct = effs.filter((e) => e.type === "score_up_effect_up_permil_up").reduce((a, e) => a + e.v, 0) / 1000;
      specials.push({ slot: i, t0, t1: t0 + s.dur, sup: sup / 1000, supPct, rate: rate / 1000 });
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
        let p = Math.min(1, a.p * (1 + rate));
        if (luck === "max") p = p > 0 ? 1 : 0;
        else if (rolls) {
          const key = a.i * 10000 + idx;
          let hit = rolls.get(key);
          if (hit === undefined) { hit = luck() < p; rolls.set(key, hit); }
          p = hit ? 1 : 0;
        }
        if (!p) continue;
        const v = (t0 >= a.addFrom ? Math.max(a.base, a.add) : a.base) * a.mult * (1 + sup);
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
    // Event song bonus: +10% when the song's event bonus card is in the unit.
    const ev = env.opts.event === false ? null : eventSong(song.id);
    const eventBonus = ev && members.some((m) => ev.cards.includes(m.id)) ? EVENTS.rules.scoreBonus : 0;
    const scale = unit * (song.coef / 1000) * (1 + songBonus / 1000) * (1 + eventBonus) * env.calib;
    const score = scale * (sumBase + sumSkill);
    if (!detail) return score;
    const totalW = chart.W[chart.W.length - 1] || 1;
    // Split the skill part into actives alone and what the special skills add on top.
    let activeOnly = 0;
    for (let b = 0; b < bounds.length - 1; b++) {
      const t0 = bounds[b], t1 = bounds[b + 1];
      if (t1 <= t0) continue;
      const w = weightBetween(chart, t0, t1);
      if (w <= 0) continue;
      const vs = [], ps = [];
      for (const a of act) {
        const idx = Math.floor((t0 + 1e-9) / a.ct), c = idx * a.ct;
        if (idx < 1 || t0 >= c + a.dur) continue;
        let p = Math.min(1, a.p * (1 + a.rate));
        if (luck === "max") p = p > 0 ? 1 : 0;
        vs.push((t0 >= a.addFrom ? Math.max(a.base, a.add) : a.base) * a.mult); ps.push(p);
      }
      const idxs = vs.map((_, j) => j).sort((x, y) => vs[y] - vs[x]);
      let e = 0, none = 1;
      for (const j of idxs) { e += vs[j] * ps[j] * none; none *= 1 - ps[j]; }
      activeOnly += w * e;
    }
    return {
      parts, eventBonus, event: ev, activePct: activeOnly / sumBase, specialPct: (sumSkill - activeOnly) / sumBase,
      timeline: act.map((a) => ({ i: a.i, ct: a.ct, dur: a.dur, p: a.p, checks: a.checks, value: Math.max(a.base, a.add) * a.mult })), end: chart.end,
      score, unit, raw, songBonus, stats, base: scale * sumBase, skill: scale * sumSkill,
      uptime: uptime.map((u) => u / totalW), specials,
      upgrade: env.upgrade, memory: env.memory, leadFlat, leadPct, seu: acc.seu.map((x) => x + leadSeu),
    };
  }

  // Score spread over many random plays of one unit: average, typical range and best/worst seen,
  // plus the theoretical maximum (every active skill check succeeds).
  function simulate(env, team, chart, runs) {
    runs = runs || 2000;
    let seed = 20260929;
    const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const scores = [];
    for (let i = 0; i < runs; i++) scores.push(evaluate(env, team, chart, false, rng));
    scores.sort((a, b) => a - b);
    const q = (f) => scores[Math.min(scores.length - 1, Math.floor(f * scores.length))];
    return {
      runs, mean: evaluate(env, team, chart), max: evaluate(env, team, chart, false, "max"),
      min: scores[0], p10: q(0.1), median: q(0.5), p90: q(0.9), p99: q(0.99), best: scores[scores.length - 1],
    };
  }

  function rankFor(list, value) {
    let r = "";
    for (const [th, name] of list.slice().sort((a, b) => a[0] - b[0])) if (value >= th) r = name;
    return r;
  }

  window.HoloSim = {
    songById, loadChart, loadCharts, getChart, makeEnv, boardOpts, songTileApplies, prepare, evaluate, simulate, EVENTS, eventSong, eventOf, eventPtBonus, boardEffects, upgradeBonus,
    posterPermil, rankFor, hasTimeTrigger, chartIndex,
  };
})();
