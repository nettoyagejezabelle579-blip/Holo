/* Team Optimizer: find the strongest unit from the player's own cards. */
(function () {
  "use strict";
  const H = window.Holo;
  const S = window.HoloSim;
  const O = window.HoloOpt;
  const U = window.HoloTeamUI;
  const G = window.HOLO_GAME;
  const { L, esc, fmt } = H;

  const TX = {
    en: {
      title: "Team Optimizer",
      intro: "Finds the unit that maximises your score from the cards you own, their levels and blooms, your holomem ranks (board) and memories.",
      tip: "Estimates assume ALL PERFECT (or AUTO) play. The exact in-game formula is not public, so scores are estimates — the ranking of units is what matters.",
      s1: "What kind of unit do you want?", m_best: "Best unit", m_best_d: "Search every combination of your cards for the highest-scoring unit.",
      m_core: "Build around cards", m_core_d: "Pick up to 5 cards (and optionally the leader). The rest of the unit is filled in for you.",
      m_pull: "Best card to pull", m_pull_d: "Pick up to 4 of your cards to keep. Every card you don't own is tried to see which one improves your unit the most.",
      s2: "What should be maximised?", t_score: "Score", t_score_d: "Highest Live score on one song.",
      t_event: "Event songs", t_event_d: "Highest average score over several songs (e.g. the current event songs).",
      t_rating: "Holomem Score Rating", t_rating_d: "Best top-3 song scores with one holomem as leader, with song recommendations.",
      t_pt: "Event Pt", t_pt_d: "Not available: the event point formula has not been published.",
      keepFresh: "Keep this data up to date for accurate results:", cards: "Cards", holomems: "Ranked holomems", memories: "Memories",
      s3: "Options", playMode: "Play", perfect: "ALL PERFECT", auto: "AUTO", life: "LIFE stays full", board: "Use holomem board", boardFull: "Treat all boards as fully unlocked",
      pool: "Card pool", poolOwned: "My cards", poolAll: "Every card at max level (theory)", effort: "Search effort", fast: "Fast", normal: "Normal", thorough: "Thorough",
      core: "Core cards", pickCore: "Choose core cards", lockLeader: "Leader", anyLeader: "Any (optimise)", keep: "Cards to keep",
      pullLv: "Assume the new card is", pullBloom: "Bloom",
      s4: "Holomem board", boardInfo: "Board bonuses come from the tiles unlocked on each holomem's board in My Data → Holomems. Holomems you haven't set up use auto setup with the points from their rank.",
      s5: "Input details", eventSongs: "Songs", addSong: "Add song", ratingLeader: "Leader holomem", latestEvent: "Use latest event songs",
      run: "Find best unit", running: "Searching…", cancel: "Cancel", results: "Result", alternatives: "Other strong units",
      noCards: "You have no cards yet. Add your cards in My Data first.", perSong: "Per song", avg: "Average", rating: "Rating (top 3)",
      gain: "Gain", pullResult: "Cards that would improve your unit the most", baseline: "Current best", withCard: "With this card",
      evals: "units evaluated", needCore: "Pick at least one core card.", chartNote: "* songs marked with * have no chart data; notes are spread evenly.",
      method: "How is the score estimated?",
    },
    ja: {
      title: "編成最適化",
      intro: "所持カード・レベル・開花・ホロメンランク（ボード）・メモリーから、スコアが最大になるユニットを探します。",
      tip: "推定はALL PERFECT（またはAUTO）前提です。ゲーム内の正確な計算式は非公開のため推定値です。ユニットの比較にご利用ください。",
      s1: "どんなユニットを作りますか？", m_best: "最強ユニット", m_best_d: "所持カードのすべての組み合わせから最高スコアのユニットを探します。",
      m_core: "指定カード中心", m_core_d: "最大5枚（とリーダー）を指定し、残りの枠を最適化します。",
      m_pull: "おすすめガチャカード", m_pull_d: "残したいカードを最大4枚選択。未所持のカードを1枚ずつ試し、最も強化できるカードを探します。",
      s2: "何を最大化しますか？", t_score: "スコア", t_score_d: "1曲のライブスコアを最大化。",
      t_event: "イベント楽曲", t_event_d: "複数曲（イベント楽曲など）の平均スコアを最大化。",
      t_rating: "ホロメンスコアレーティング", t_rating_d: "指定ホロメンをリーダーにした上位3曲の合計を最大化し、楽曲を提案します。",
      t_pt: "イベントPt", t_pt_d: "イベントPtの計算式が公開されていないため未対応。",
      keepFresh: "正確な結果のため、以下のデータを最新に保ってください：", cards: "カード", holomems: "ランク入力済み", memories: "メモリー",
      s3: "オプション", playMode: "プレイ", perfect: "ALL PERFECT", auto: "AUTO", life: "ライフ満タン", board: "ホロメンボードを使用", boardFull: "全ボードを完全解放として計算",
      pool: "カード範囲", poolOwned: "所持カード", poolAll: "全カード最大レベル（理論値）", effort: "探索量", fast: "高速", normal: "標準", thorough: "精密",
      core: "指定カード", pickCore: "指定カードを選択", lockLeader: "リーダー", anyLeader: "指定なし（最適化）", keep: "残すカード",
      pullLv: "新カードの想定", pullBloom: "開花",
      s4: "ホロメンボード", boardInfo: "ボード効果は所持データ→ホロメンで解放したマスから計算します。未設定のホロメンはランクのPtで自動設置した状態として計算します。",
      s5: "詳細入力", eventSongs: "楽曲", addSong: "楽曲を追加", ratingLeader: "リーダーのホロメン", latestEvent: "最新イベント楽曲を使用",
      run: "最適ユニットを探す", running: "探索中…", cancel: "中止", results: "結果", alternatives: "その他の強いユニット",
      noCards: "所持カードがありません。先に所持データでカードを登録してください。", perSong: "楽曲別", avg: "平均", rating: "レーティング（上位3曲）",
      gain: "上昇", pullResult: "ユニットを最も強化できるカード", baseline: "現在の最強", withCard: "このカード入り",
      evals: "ユニットを評価", needCore: "指定カードを1枚以上選んでください。", chartNote: "* 付きの楽曲は譜面データがないため、ノーツを均等配置して計算します。",
      method: "スコアの推定方法",
    },
  };
  const tx = (k) => (TX[H.lang] && TX[H.lang][k]) || TX.en[k];
  const root = document.getElementById("team");

  const latestSongs = U.songsSorted().filter((s) => S.chartIndex[s.id] || true).slice(0, 4).map((s) => s.id);
  const st = Object.assign({
    mode: "best", target: "score", play: "perfect", lifeFull: true, board: true, boardFull: false, pool: "owned",
    effort: "normal", core: [], coreLeader: "", keep: [], pullBloom: 0,
    song: latestSongs[0], diff: "expert", eventSongs: latestSongs.slice(), ratingChr: Object.keys(H.talents)[0],
  }, H.store.get("optimizer", {}));
  let running = null;
  let lastResult = null;
  const save = () => H.store.set("optimizer", st);

  function optCard(group, value, title, desc, disabled) {
    return `<button class="opt-card" data-group="${group}" data-value="${value}" aria-pressed="${st[group] === value}" ${disabled ? "disabled" : ""}>
      <strong>${esc(title)}</strong><span>${esc(desc)}</span></button>`;
  }
  function step(n, title, body, open) {
    return `<section class="step ${open ? "" : "collapsed"}"><h2><span class="num">${n}</span>${esc(title)}</h2><div class="step-body">${body}</div></section>`;
  }
  function seg(key, opts) {
    return `<span class="seg">${opts.map(([v, l]) => `<button data-set="${key}" data-value="${v}" aria-pressed="${String(st[key]) === String(v)}">${esc(l)}</button>`).join("")}</span>`;
  }
  function toggle(key, label) {
    return `<label class="check"><input type="checkbox" data-toggle="${key}" ${st[key] ? "checked" : ""}> ${esc(label)}</label>`;
  }
  function cardChips(ids) {
    return ids.length ? ids.map((id) => {
      const c = H.cardById[id];
      return `<span class="chip"><span class="dot" style="background:${esc(H.talents[c.chr].color)}"></span>${esc(L(H.talents[c.chr].short))} ${H.stars(c.rarity)} ${esc(L(c.title))}</span>`;
    }).join("") : `<span class="muted small">—</span>`;
  }
  function ownedIds() {
    return Object.keys(H.progress.cards).filter((id) => H.cardById[id] && !H.cardById[id].announced);
  }
  function poolIds() {
    return st.pool === "all" ? H.cards.filter((c) => !c.announced).map((c) => c.id) : ownedIds();
  }

  function render() {
    const p = H.progress;
    const leaderOpts = [["", tx("anyLeader")]].concat(
      O.leaderOptions(poolIds()).filter((l) => l.cardId).map((l) => [l.chr + ":" + l.cardId, U.leaderLabel(l)]),
      Object.keys(H.talents).map((chr) => [chr + ":", U.leaderLabel({ chr, cardId: null })]));
    const talentsSorted = Object.entries(H.talents).sort((a, b) => a[1].order - b[1].order);

    const s1 = `<div class="opt-grid">${optCard("mode", "best", tx("m_best"), tx("m_best_d"))}${optCard("mode", "core", tx("m_core"), tx("m_core_d"))}${optCard("mode", "pull", tx("m_pull"), tx("m_pull_d"))}</div>`;
    const s2 = `<div class="opt-grid">${optCard("target", "score", tx("t_score"), tx("t_score_d"))}${optCard("target", "event", tx("t_event"), tx("t_event_d"))}
      ${optCard("target", "rating", tx("t_rating"), tx("t_rating_d"))}${optCard("target", "pt", tx("t_pt"), tx("t_pt_d"), true)}</div>
      <div class="fresh"><span>${esc(tx("keepFresh"))}</span>
        <a class="chip" href="../my/index.html#cards">${esc(tx("cards"))}: ${ownedIds().length}</a>
        <a class="chip" href="../my/index.html#holomem">${esc(tx("holomems"))}: ${Object.values(p.ranks).filter((r) => r > 1).length}</a>
        <a class="chip" href="../my/index.html#memories">${esc(tx("memories"))}: ${p.memories || 0}</a></div>`;
    let s3 = `<div class="opt-rows">
      <div><span class="lbl">${esc(tx("playMode"))}</span>${seg("play", [["perfect", tx("perfect")], ["auto", tx("auto")]])}</div>
      <div><span class="lbl">${esc(tx("pool"))}</span>${seg("pool", [["owned", tx("poolOwned")], ["all", tx("poolAll")]])}</div>
      <div><span class="lbl">${esc(tx("effort"))}</span>${seg("effort", [["fast", tx("fast")], ["normal", tx("normal")], ["thorough", tx("thorough")]])}</div>
      <div>${toggle("lifeFull", tx("life"))}</div>`;
    if (st.mode === "core") {
      s3 += `<div><span class="lbl">${esc(tx("core"))}</span><button class="icon-btn" id="pick-core">${esc(tx("pickCore"))}</button> ${cardChips(st.core)}</div>
        <div><span class="lbl">${esc(tx("lockLeader"))}</span><select class="select" id="core-leader">${leaderOpts.map(([v, l]) => `<option value="${esc(v)}" ${st.coreLeader === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`;
    }
    if (st.mode === "pull") {
      s3 += `<div><span class="lbl">${esc(tx("keep"))}</span><button class="icon-btn" id="pick-keep">${esc(tx("pickCore"))}</button> ${cardChips(st.keep)}</div>
        <div><span class="lbl">${esc(tx("pullLv"))}</span>Lv max · ${esc(tx("pullBloom"))} ${seg("pullBloom", [[0, "0"], [1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"]])}</div>`;
    }
    s3 += `</div>`;
    const s4 = `<p class="muted">${esc(tx("boardInfo"))}</p><div class="opt-rows"><div>${toggle("board", tx("board"))}</div><div>${toggle("boardFull", tx("boardFull"))}</div></div>`;
    let s5 = "";
    if (st.target === "score") {
      s5 = U.songPickerHTML("song-pick", st.song, st.diff);
    } else if (st.target === "event") {
      s5 = `<div class="chips" style="margin-bottom:8px">${st.eventSongs.map((id) => `<span class="chip">${esc(L(S.songById[id].title))} <button class="link-btn" data-rm-song="${esc(id)}">✕</button></span>`).join("")}
        <button class="chip" id="latest-event">${esc(tx("latestEvent"))}</button></div>
        <p class="small muted">${esc(tx("addSong"))}:</p>${U.songPickerHTML("event-pick", null, st.diff)}`;
    } else if (st.target === "rating") {
      s5 = `<div class="opt-rows"><div><span class="lbl">${esc(tx("ratingLeader"))}</span><select class="select" id="rating-chr">${talentsSorted.map(([chr, t]) =>
        `<option value="${esc(chr)}" ${st.ratingChr === chr ? "selected" : ""}>${esc(L(t.name))}</option>`).join("")}</select></div>
        <div><span class="lbl">${esc(U.tx("difficulty"))}</span><span class="seg">${U.DIFFS.map((d) => `<button data-set="diff" data-value="${d}" aria-pressed="${st.diff === d}">${esc(U.tx(d))}</button>`).join("")}</span></div></div>`;
    }
    s5 += `<p class="small muted">${esc(tx("chartNote"))}</p>`;

    root.innerHTML = `<h1 class="page-title">${esc(tx("title"))}</h1>
      <p class="muted" style="max-width:820px">${esc(tx("intro"))}</p>
      <div class="notice">${esc(tx("tip"))} <a href="method.html">${esc(tx("method"))}</a></div>
      ${step(1, tx("s1"), s1, true)}${step(2, tx("s2"), s2, true)}${step(3, tx("s3"), s3, true)}${step(4, tx("s4"), s4, true)}${step(5, tx("s5"), s5, true)}
      <div class="run-bar">
        <button class="btn-primary" id="run" ${running ? "disabled" : ""}>${esc(running ? tx("running") : tx("run"))}</button>
        ${running ? `<button class="icon-btn" id="cancel">${esc(tx("cancel"))}</button>` : ""}
        <div class="progress ${running ? "" : "hidden"}"><div class="bar" id="bar"></div></div><span class="small muted" id="progress-text"></span>
      </div>
      <div id="results"></div>`;
    if (st.target === "score") U.bindSongPicker(root, "song-pick", (c) => { if (c.song) st.song = c.song; if (c.diff) st.diff = c.diff; save(); render(); });
    if (st.target === "event") U.bindSongPicker(root, "event-pick", (c) => {
      if (c.song && !st.eventSongs.includes(c.song)) st.eventSongs.push(c.song);
      if (c.diff) st.diff = c.diff;
      save(); render();
    });
    if (lastResult) showResult(lastResult);
    H.renderFooter();
  }

  root.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.group) { st[b.dataset.group] = b.dataset.value; save(); render(); }
    else if (b.dataset.set) { st[b.dataset.set] = isNaN(b.dataset.value) || b.dataset.set === "diff" ? b.dataset.value : Number(b.dataset.value); save(); render(); }
    else if (b.dataset.rmSong) { st.eventSongs = st.eventSongs.filter((x) => x !== b.dataset.rmSong); save(); render(); }
    else if (b.id === "latest-event") { st.eventSongs = latestSongs.slice(); save(); render(); }
    else if (b.id === "pick-core") {
      const r = await U.pickCards({ max: 5, selected: st.core, pool: poolIds() });
      if (r) { st.core = r; save(); } render();
    } else if (b.id === "pick-keep") {
      const r = await U.pickCards({ max: 4, selected: st.keep, pool: ownedIds() });
      if (r) { st.keep = r; save(); } render();
    } else if (b.id === "run") run();
    else if (b.id === "cancel" && running) running.cancelled = true;
  });
  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.toggle) { st[el.dataset.toggle] = el.checked; save(); }
    else if (el.id === "core-leader") { st.coreLeader = el.value; save(); }
    else if (el.id === "rating-chr") { st.ratingChr = el.value; save(); }
  });

  function progressFn(base, span) {
    return (f, text) => {
      const bar = document.getElementById("bar");
      if (bar) bar.style.width = ((base + f * span) * 100).toFixed(1) + "%";
      const t = document.getElementById("progress-text");
      if (t && text) t.textContent = text;
    };
  }
  function buildEnv() {
    const env = S.makeEnv(H.progress, { board: st.board, boardFull: st.boardFull, mode: st.play, lifeFull: st.lifeFull });
    return env;
  }
  function overridesForPool() {
    if (st.pool !== "all") return {};
    const o = {};
    for (const c of H.cards) if (!c.announced) o[c.id] = { lv: H.maxLevel(c), bloom: 5 };
    return o;
  }
  function parseLeader(v) {
    if (!v) return null;
    const [chr, cardId] = v.split(":");
    return { chr, cardId: cardId || null };
  }

  async function run() {
    const pool = poolIds();
    const res = document.getElementById("results");
    if (!pool.length) { res.innerHTML = `<div class="panel">${esc(tx("noCards"))}</div>`; return; }
    if (st.mode === "core" && !st.core.length) { res.innerHTML = `<div class="panel">${esc(tx("needCore"))}</div>`; return; }
    running = { cancelled: false };
    lastResult = null;
    render();
    const env = buildEnv();
    const overrides = overridesForPool();
    const base = { env, pool, overrides, effort: st.effort, signal: running };
    if (st.mode === "core") { base.lockMembers = st.core; base.lockLeader = parseLeader(st.coreLeader); }
    if (st.mode === "pull") base.lockMembers = st.keep;
    try {
      let result;
      if (st.target === "rating") result = await runRating(base);
      else {
        const songs = st.target === "event" ? st.eventSongs : [st.song];
        await S.loadCharts(songs);
        const charts = songs.map((id) => S.getChart(id, st.diff, st.play));
        if (st.mode === "pull") result = await runPull(base, charts, songs);
        else {
          const r = await O.optimize(Object.assign({}, base, { charts, onProgress: progressFn(0, 1) }));
          result = { kind: "team", songs, charts, r, env, overrides };
        }
      }
      lastResult = result;
    } finally {
      running = null;
      render();
    }
  }

  async function runRating(base) {
    const chr = st.ratingChr;
    const eligible = G.songs.filter((s) => s.rating && s.diff[st.diff]);
    // Pick the leader's own song (or any) to find a strong starting unit.
    const own = eligible.find((s) => s.chrs.includes(chr)) || eligible[0];
    await S.loadCharts([own.id]);
    const first = await O.optimize(Object.assign({}, base, { charts: [S.getChart(own.id, st.diff, st.play)], leaderChr: chr, effort: "fast", onProgress: progressFn(0, 0.2) }));
    if (!first.best) return { kind: "rating", rows: [] };
    // Screen every eligible song with that unit, then optimise the most promising ones.
    await S.loadCharts(eligible.map((s) => s.id));
    const team = { leader: first.best.leader, members: first.best.ids.map((id) => S.prepare(base.env, id, base.overrides[id])) };
    const screened = eligible.map((s) => ({ s, v: S.evaluate(base.env, team, S.getChart(s.id, st.diff, st.play)) })).sort((a, b) => b.v - a.v).slice(0, 6);
    const rows = [];
    for (let i = 0; i < screened.length; i++) {
      if (running.cancelled) break;
      const s = screened[i].s;
      const chart = S.getChart(s.id, st.diff, st.play);
      const r = await O.optimize(Object.assign({}, base, { charts: [chart], leaderChr: chr, effort: "fast", onProgress: progressFn(0.2 + (0.8 * i) / screened.length, 0.8 / screened.length) }));
      if (r.best) rows.push({ song: s, chart, best: r.best });
    }
    rows.sort((a, b) => b.best.score - a.best.score);
    return { kind: "rating", rows, env: base.env, overrides: base.overrides, chr };
  }

  async function runPull(base, charts, songs) {
    const owned = new Set(base.pool);
    const baseline = await O.optimize(Object.assign({}, base, { charts, effort: "fast", onProgress: progressFn(0, 0.15) }));
    const candidates = H.cards.filter((c) => !c.announced && !owned.has(c.id));
    const rows = [];
    const hypo = { lv: 0, bloom: st.pullBloom };
    for (let i = 0; i < candidates.length; i++) {
      if (running.cancelled) break;
      const c = candidates[i];
      const overrides = Object.assign({}, base.overrides, { [c.id]: { lv: H.maxLevel(c), bloom: st.pullBloom } });
      const r = await O.optimize(Object.assign({}, base, {
        charts, overrides, pool: base.pool.concat(c.id), lockMembers: (base.lockMembers || []).concat(c.id),
        effort: "fast", onProgress: progressFn(0.15 + (0.85 * i) / candidates.length, 0.85 / candidates.length),
      }));
      // The outfit could also be the best leader even if the card is not a member.
      if (r.best) rows.push({ card: c, best: r.best, overrides });
    }
    const b = baseline.best ? baseline.best.score : 0;
    rows.forEach((r) => { r.gain = r.best.score - b; });
    rows.sort((a, b2) => b2.gain - a.gain);
    return { kind: "pull", baseline, rows: rows.slice(0, 15), songs, charts, env: base.env, hypo };
  }

  function detailsLink(leader, ids, song, diff) {
    return `details.html#${U.encodeTeam({ song, diff, mode: st.play, leader, members: ids })}`;
  }
  function teamBlock(env, overrides, leader, ids, charts, songs, title) {
    const team = { leader, members: ids.map((id) => S.prepare(env, id, overrides && overrides[id])) };
    const details = charts.map((c) => S.evaluate(env, team, c, true));
    const avg = details.reduce((a, d) => a + d.score, 0) / details.length;
    const d0 = details[0];
    const song = charts[0].song;
    const hypo = {};
    for (const id of ids) if (overrides && overrides[id] && !H.progress.cards[id]) hypo[id] = overrides[id];
    return `<div class="panel result">
      ${title ? `<h3>${title}</h3>` : ""}
      <div class="result-head">
        <div><div class="small muted">${esc(charts.length > 1 ? tx("avg") : U.tx("estScore"))}</div><div class="big">${fmt(Math.round(avg))}</div>
          <div class="small">${esc(U.tx("scoreRank"))}: <b>${esc(U.scoreRank(song, avg))}</b></div></div>
        <div><div class="small muted">${esc(U.tx("unitScore"))}</div><div class="big">${fmt(Math.round(d0.unit))}</div>
          <div class="small">${esc(S.rankFor(G.powerRanks, d0.unit))}</div></div>
        <a class="icon-btn" href="${detailsLink(leader, ids, songs[0], charts[0].diff)}">${esc(U.tx("openDetails"))} →</a>
      </div>
      ${U.teamHTML(leader, ids, { stats: d0.stats, hypo })}
      ${charts.length > 1 ? `<table class="data small-table"><thead><tr><th>${esc(tx("perSong"))}</th><th class="num">${esc(U.tx("estScore"))}</th></tr></thead><tbody>
        ${charts.map((c, i) => `<tr><td>${esc(L(c.song.title))} ${c.synthetic ? "*" : ""}</td><td class="num">${fmt(Math.round(details[i].score))}</td></tr>`).join("")}</tbody></table>` : ""}
    </div>`;
  }

  function showResult(r) {
    const el = document.getElementById("results");
    if (!el) return;
    if (r.kind === "team") {
      if (!r.r.best) { el.innerHTML = `<div class="panel">${esc(tx("noCards"))}</div>`; return; }
      el.innerHTML = `<h2>${esc(tx("results"))}</h2>` +
        teamBlock(r.env, r.overrides, r.r.best.leader, r.r.best.ids, r.charts, r.songs) +
        (r.r.alternatives.length ? `<h3>${esc(tx("alternatives"))}</h3>` + r.r.alternatives.map((a) => teamBlock(r.env, r.overrides, a.leader, a.ids, r.charts, r.songs)).join("") : "") +
        `<p class="small muted">${fmt(r.r.evals)} ${esc(tx("evals"))}</p>`;
    } else if (r.kind === "rating") {
      const top = r.rows.slice(0, 3);
      const sum = top.reduce((a, x) => a + x.best.score, 0);
      el.innerHTML = `<h2>${esc(tx("results"))} — ${esc(L(H.talents[r.chr].name))}</h2>
        <div class="panel"><div class="small muted">${esc(tx("rating"))}</div><div class="big">${fmt(Math.round(sum))}</div></div>` +
        r.rows.map((x, i) => teamBlock(r.env, r.overrides, x.best.leader, x.best.ids, [x.chart], [x.song.id], `${i + 1}. ${esc(L(x.song.title))}`)).join("");
    } else if (r.kind === "pull") {
      const b = r.baseline.best;
      el.innerHTML = `<h2>${esc(tx("pullResult"))}</h2>
        ${b ? teamBlock(r.env, {}, b.leader, b.ids, r.charts, r.songs, esc(tx("baseline"))) : ""}
        <div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>${esc(H.t("cards"))}</th><th class="num">${esc(tx("gain"))}</th><th class="num">${esc(U.tx("estScore"))}</th><th></th></tr></thead><tbody>
        ${r.rows.map((x, i) => `<tr><td>${i + 1}</td><td><span class="swatch" style="background:${esc(H.talents[x.card.chr].color)}"></span>${H.stars(x.card.rarity)} ${esc(L(x.card.title))} <span class="muted">${esc(L(H.talents[x.card.chr].name))}</span></td>
          <td class="num"><b>${x.gain >= 0 ? "+" : ""}${fmt(Math.round(x.gain))}</b> <span class="muted">(${b ? ((x.gain / b.score) * 100).toFixed(1) : 0}%)</span></td>
          <td class="num">${fmt(Math.round(x.best.score))}</td>
          <td><a href="${detailsLink(x.best.leader, x.best.ids, r.songs[0], r.charts[0].diff)}">${esc(U.tx("openDetails"))}</a></td></tr>`).join("")}
        </tbody></table></div>
        ${r.rows[0] ? teamBlock(r.env, r.rows[0].overrides, r.rows[0].best.leader, r.rows[0].best.ids, r.charts, r.songs, esc(tx("withCard")) + ": " + esc(L(r.rows[0].card.title))) : ""}`;
    }
  }

  H.renderHeader("optimizer", render);
  render();
})();
