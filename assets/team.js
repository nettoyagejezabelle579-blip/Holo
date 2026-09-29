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
      t_pt: "Event Pt", t_pt_d: "Most event points on an event song: score × event card bonuses (+30% per event card, +30% new ★5, Bloom bonus).",
      t_event_d2: "Highest score on an event song, including the +10% event card bonus.",
      event: "Event", eventSong: "Song", allEventSongs: "All event songs (average)", bonusHave: "You own the +10% bonus card for this song:",
      bonusMissing: "You don't own the card that gives +10% on this song:", ptEstimate: "Event Pt (relative)", ptNote: "score × (1 + event card bonus); the absolute point formula is not public",
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
      timeline: "Skill timeline", goal: "Optimise for",
      planBoards: "Plan my boards for this unit", planning: "Planning boards…", planTitle: "Board plan", planNow: "Current boards", planAfter: "Optimised",
      planMats: "Materials needed", planTiles: "+{a} tiles", planRemoved: "−{r} tiles (reset)", planConnect: "{c} Connect cards", planPts: "Board Pt",
      planSave: "Save board to My Data", planSaveAll: "Save all boards to My Data", planSaved: "Saved ✓", planNone: "Your boards are already the best this planner can find for this unit.",
      planHelp: "Boards of the holomems in this unit are re-planned from scratch with their rank points (reset the board in game, then unlock the green tiles). Other boards keep your tiles and only spend leftover points on support/song tiles. Cube stock is not checked. Green ring = new tile, red ring = tile removed by the reset.",
      planScore: "score with this unit", teamBoard: "in unit",
      planOthers: "Also re-plan other holomems' boards for support tiles (helps every unit, replaces their leader/member tiles)", goalAvg: "Average score", goalMax: "Maximum score",
      goalHelp: "Average = what you get on a typical play (active skills fire by chance). Maximum = every active skill fires.",
      average: "Average", maximum: "Maximum", spread: "Over {n} simulated plays", typical: "Typical (middle 80%)", top10: "Top 10%", bestSeen: "Best seen",
      maxHelp: "all active skills fire",
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
      t_pt: "イベントPt", t_pt_d: "イベント楽曲で最も多くのPtを獲得：スコア×イベント特効（1枚+30%、新★5+30%、開花ボーナス）。",
      t_event_d2: "イベント楽曲のスコアを最大化（特効カードの+10%を含む）。",
      event: "イベント", eventSong: "楽曲", allEventSongs: "全イベント楽曲（平均）", bonusHave: "この楽曲の+10%特効カードを所持しています：",
      bonusMissing: "この楽曲で+10%のスコア特効を持つカードを所持していません：", ptEstimate: "イベントPt（相対値）", ptNote: "スコア×(1+特効ボーナス)。Ptの絶対値の計算式は非公開",
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
      timeline: "スキルタイムライン", goal: "最適化の基準",
      planBoards: "このユニット向けにボードを計画", planning: "ボードを計画中…", planTitle: "ボード計画", planNow: "現在のボード", planAfter: "最適化後",
      planMats: "必要素材", planTiles: "+{a}マス", planRemoved: "−{r}マス（リセット）", planConnect: "コネクト{c}枚", planPts: "ボードPt",
      planSave: "所持データに保存", planSaveAll: "すべてのボードを所持データに保存", planSaved: "保存しました ✓", planNone: "現在のボードはこのユニットにとって既に最適です。",
      planHelp: "このユニットのホロメンのボードはランクPtで一から計画します（ゲーム内でリセットして緑のマスを解放）。他のボードは現在のマスを残し、余ったPtでサポート・楽曲マスのみ追加します。キューブの所持数は確認しません。緑枠＝新規解放、赤枠＝リセットで外れるマス。",
      planScore: "このユニットのスコア", teamBoard: "ユニット内",
      planOthers: "他のホロメンのボードもサポート効果中心に再計画（全ユニットに有効、リーダー/メンバー効果は外れます）", goalAvg: "平均スコア", goalMax: "最大スコア",
      goalHelp: "平均＝通常のプレイで得られるスコア（アクティブスキルは確率で発動）。最大＝アクティブスキルがすべて発動した場合。",
      average: "平均", maximum: "最大", spread: "{n}回のシミュレーション", typical: "通常（中央80%）", top10: "上位10%", bestSeen: "最高記録",
      maxHelp: "アクティブスキルが全発動",
    },
  };
  const tx = (k) => (TX[H.lang] && TX[H.lang][k]) || TX.en[k];
  const root = document.getElementById("team");

  const latestSongs = U.songsSorted().filter((s) => S.chartIndex[s.id] || true).slice(0, 4).map((s) => s.id);
  const st = Object.assign({
    mode: "best", target: "score", play: "perfect", lifeFull: true, board: true, boardFull: false, pool: "owned",
    effort: "normal", core: [], coreLeader: "", keep: [], pullBloom: 0, luck: "avg",
    song: latestSongs[0], diff: "expert", eventSongs: latestSongs.slice(), ratingChr: Object.keys(H.talents)[0],
    eventId: (S.EVENTS.events[0] || {}).id, eventSong: "all",
  }, H.store.get("optimizer", {}));
  const qs = new URLSearchParams(location.search);
  if (qs.get("song") && S.songById[qs.get("song")]) { st.song = qs.get("song"); st.target = "score"; if (qs.get("diff")) st.diff = qs.get("diff"); }
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
    const s2 = `<div class="opt-grid">${optCard("target", "score", tx("t_score"), tx("t_score_d"))}${optCard("target", "event", tx("t_event"), tx("t_event_d2"))}
      ${optCard("target", "rating", tx("t_rating"), tx("t_rating_d"))}${optCard("target", "pt", tx("t_pt"), tx("t_pt_d"))}</div>
      <div class="fresh"><span>${esc(tx("keepFresh"))}</span>
        <a class="chip" href="../my/index.html#cards">${esc(tx("cards"))}: ${ownedIds().length}</a>
        <a class="chip" href="../my/index.html#holomem">${esc(tx("holomems"))}: ${Object.values(p.ranks).filter((r) => r > 1).length}</a>
        <a class="chip" href="../my/index.html#memories">${esc(tx("memories"))}: ${p.memories || 0}</a></div>`;
    let s3 = `<div class="opt-rows">
      <div><span class="lbl">${esc(tx("goal"))}</span>${seg("luck", [["avg", tx("goalAvg")], ["max", tx("goalMax")]])}
        <span class="small muted">${esc(tx("goalHelp"))}</span></div>
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
    } else if (st.target === "event" || st.target === "pt") {
      const ev = S.EVENTS.events.find((e) => e.id === st.eventId) || S.EVENTS.events[0];
      if (ev) {
        const songIds = ev.songs.map((x) => x.song);
        if (st.eventSong !== "all" && !songIds.includes(st.eventSong)) st.eventSong = "all";
        const shown = st.eventSong === "all" ? ev.songs : ev.songs.filter((x) => x.song === st.eventSong);
        s5 = `<div class="opt-rows"><div><span class="lbl">${esc(tx("event"))}</span><span class="seg">${S.EVENTS.events.map((e) =>
            `<button data-event="${esc(e.id)}" aria-pressed="${e.id === ev.id}">${esc(L(e.name))} <span class="small">${esc(e.start.slice(5))}</span></button>`).join("")}</span></div></div>
          <div class="event-songs">
            <button class="event-song ${st.eventSong === "all" ? "on" : ""}" data-esong="all"><div class="jacket-stack">${ev.songs.slice(0, 4).map((x) => H.jacketHTML(S.songById[x.song], "xs")).join("")}</div><b>${esc(tx("allEventSongs"))}</b></button>
            ${ev.songs.map((x) => { const so = S.songById[x.song]; return `<button class="event-song ${st.eventSong === x.song ? "on" : ""}" data-esong="${esc(x.song)}">${H.jacketHTML(so, "sm")}<span><b>${esc(L(so.title))}</b><br><span class="small muted">${esc(L(so.singer))}</span></span></button>`; }).join("")}
          </div>
          <div class="opt-rows"><div><span class="lbl">${esc(U.tx("difficulty"))}</span><span class="seg">${U.DIFFS.map((d) => { const so = S.songById[shown[0].song]; return `<button data-set="diff" data-value="${d}" aria-pressed="${st.diff === d}">${esc(U.tx(d))} ${so.diff[d] ? so.diff[d].lv : ""}</button>`; }).join("")}</span></div></div>
          ${shown.map((x) => {
            const owned = x.cards.filter((id) => H.progress.cards[id]);
            const c = H.cardById[x.cards[0]];
            return `<div class="bonus-box ${owned.length ? "have" : "missing"}"><p>${esc(L(S.songById[x.song].title))}: ${esc(owned.length ? tx("bonusHave") : tx("bonusMissing"))}</p>
              <div class="bonus-card">${c ? H.artHTML(c, { noNew: true }) : ""}<div>${c ? `<span style="color:var(--star)">${H.stars(c.rarity)}</span><br><b>${esc(L(c.title))}</b><br><span class="muted">${esc(L(H.talents[c.chr].name))}</span>` : ""}</div></div></div>`;
          }).join("")}`;
      }
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

    if (lastResult) showResult(lastResult);
    H.renderFooter();
  }

  root.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.group) { st[b.dataset.group] = b.dataset.value; save(); render(); }
    else if (b.dataset.set) { st[b.dataset.set] = isNaN(b.dataset.value) || b.dataset.set === "diff" ? b.dataset.value : Number(b.dataset.value); save(); render(); }
    else if (b.dataset.event) { st.eventId = b.dataset.event; st.eventSong = "all"; save(); render(); }
    else if (b.dataset.esong) { st.eventSong = b.dataset.esong; save(); render(); }
    else if (b.id === "pick-core") {
      const r = await U.pickCards({ max: 5, selected: st.core, pool: poolIds() });
      if (r) { st.core = r; save(); } render();
    } else if (b.id === "pick-keep") {
      const r = await U.pickCards({ max: 4, selected: st.keep, pool: ownedIds() });
      if (r) { st.keep = r; save(); } render();
    } else if (b.id === "run") run();
    else if (b.id === "cancel" && running) running.cancelled = true;
    else if (b.dataset.plan != null) runPlan(Number(b.dataset.plan), b);
    else if (b.dataset.saveBoard) {
      e.preventDefault();
      const pr = plans[b.dataset.planId];
      window.HoloBoardPlan.save(b.dataset.saveBoard, pr.boards[b.dataset.saveBoard]);
      b.textContent = tx("planSaved"); b.disabled = true;
    } else if (b.dataset.saveAll != null) {
      const pr = plans[b.dataset.saveAll];
      for (const chr in pr.boards) window.HoloBoardPlan.save(chr, pr.boards[chr]);
      root.querySelectorAll(`[data-plan-id="${b.dataset.saveAll}"]`).forEach((x) => { x.textContent = tx("planSaved"); x.disabled = true; });
      b.textContent = tx("planSaved"); b.disabled = true;
    }
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
    const base = { env, pool, overrides, effort: st.effort, signal: running, luck: st.luck };
    if (st.mode === "core") { base.lockMembers = st.core; base.lockLeader = parseLeader(st.coreLeader); }
    if (st.mode === "pull") base.lockMembers = st.keep;
    try {
      let result;
      if (st.target === "rating") result = await runRating(base);
      else {
        let songs = [st.song];
        if (st.target === "event" || st.target === "pt") {
          const ev = S.EVENTS.events.find((e) => e.id === st.eventId) || S.EVENTS.events[0];
          songs = st.eventSong === "all" ? ev.songs.map((x) => x.song) : [st.eventSong];
          if (st.target === "pt") base.objective = "eventpt";
        }
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

  const plans = {};
  async function runPlan(i, btn) {
    const t = planTargets[i];
    const out = document.getElementById("plan-" + i);
    if (!t || !out) return;
    btn.disabled = true;
    out.innerHTML = `<div class="progress" style="margin:8px 0"><div class="bar" id="pbar-${i}"></div></div><span class="small muted" id="ptext-${i}">${esc(tx("planning"))}</span>`;
    const res = await window.HoloBoardPlan.plan({
      team: { leader: t.leader, ids: t.ids }, charts: t.charts, luck: st.luck,
      resetOthers: !!(root.querySelector(`[data-plan-others="${i}"]`) || {}).checked,
      opts: { mode: st.play, lifeFull: st.lifeFull },
      onProgress: (f, text) => { const b2 = document.getElementById("pbar-" + i); if (b2) b2.style.width = (f * 100).toFixed(1) + "%"; const tt = document.getElementById("ptext-" + i); if (tt) tt.textContent = text; },
    });
    plans[i] = res;
    btn.disabled = false;
    out.innerHTML = planHTML(res, i);
  }
  function planHTML(res, i) {
    const n = (v) => fmt(Math.round(v));
    const gain = res.before ? (res.after / res.before - 1) * 100 : 0;
    const chrs = Object.keys(res.boards).sort((a, b) => (res.boards[b].team - res.boards[a].team) || res.boards[b].added.length - res.boards[a].added.length);
    const mats = Object.entries(res.materials).sort();
    return `<div class="plan">
      <h3>${esc(tx("planTitle"))}</h3>
      <div class="plan-head"><span>${esc(tx("planNow"))} <b>${n(res.before)}</b></span> → <span>${esc(tx("planAfter"))} <b class="big-inline">${n(res.after)}</b></span>
        <b style="color:#22a35a">${gain >= 0 ? "+" : ""}${gain.toFixed(2)}%</b> <span class="small muted">(${esc(tx("planScore"))})</span>
        ${chrs.length ? `<button class="icon-btn" data-save-all="${i}">${esc(tx("planSaveAll"))}</button>` : ""}</div>
      <p class="small muted">${esc(tx("planHelp"))}</p>
      ${mats.length ? `<div class="chips"><span class="small muted">${esc(tx("planMats"))}:</span>${mats.map(([id, q]) => `<span class="chip">${esc(L((G.materials || {})[id] || { en: id }))} ${fmt(q)}</span>`).join("")}</div>` : ""}
      ${chrs.length ? chrs.map((chr) => {
        const bd = res.boards[chr];
        const tl = H.talents[chr];
        const cc = Object.keys(bd.connect).length;
        return `<details class="plan-board" ${bd.team ? "open" : ""}><summary>
          <span class="avatar" style="background:linear-gradient(135deg,${esc(tl.color)},${esc(tl.color2)})">${esc(L(tl.short).slice(0, 2))}</span>
          <b>${esc(L(tl.name))}</b> ${bd.team ? `<span class="pill on">${esc(tx("teamBoard"))}</span>` : ""}
          <span class="pill">${esc(tx("planTiles").replace("{a}", bd.added.length))}</span>
          ${bd.removed.length ? `<span class="pill">${esc(tx("planRemoved").replace("{r}", bd.removed.length))}</span>` : ""}
          ${cc ? `<span class="pill">${esc(tx("planConnect").replace("{c}", cc))}</span>` : ""}
          <span class="small muted" style="margin-left:auto">${esc(tx("planPts"))} ${bd.spent}/${bd.points}</span>
          <button class="icon-btn" data-save-board="${esc(chr)}" data-plan-id="${i}">${esc(tx("planSave"))}</button></summary>
          ${U.boardMiniHTML(chr, bd)}
          ${cc ? `<div class="chips" style="margin-top:6px">${Object.entries(bd.connect).map(([k, id]) => `<span class="chip">${esc(k)}: ${H.stars(H.cardById[id].rarity)} ${esc(L(H.talents[H.cardById[id].chr].short))} · ${esc(L(H.cardById[id].title))}</span>`).join("")}</div>` : ""}
        </details>`;
      }).join("") : `<p>${esc(tx("planNone"))}</p>`}
    </div>`;
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
  const planTargets = [];
  function teamBlock(env, overrides, leader, ids, charts, songs, title) {
    const planIdx = planTargets.push({ leader, ids, charts }) - 1;
    const team = { leader, members: ids.map((id) => S.prepare(env, id, overrides && overrides[id])) };
    const details = charts.map((c) => S.evaluate(env, team, c, true));
    const maxes = charts.map((c) => S.evaluate(env, team, c, false, "max"));
    const avg = details.reduce((a, d) => a + d.score, 0) / details.length;
    const max = maxes.reduce((a, v) => a + v, 0) / maxes.length;
    const spread = charts.length === 1 ? S.simulate(env, team, charts[0], 1000) : null;
    const d0 = details[0];
    const song = charts[0].song;
    const hypo = {};
    for (const id of ids) if (overrides && overrides[id] && !H.progress.cards[id]) hypo[id] = overrides[id];
    const n = (v) => fmt(Math.round(v));
    const ptB = charts.map((c) => S.eventPtBonus(env, team, c.songId));
    const ptBlock = ptB.some((b) => b > 0) || st.target === "pt" ? `<div class="spread"><span><b>${esc(tx("ptEstimate"))}</b>: ${n(details.reduce((a, d, i) => a + d.score * (1 + ptB[i]), 0) / details.length)}</span>
      <span>+${Math.round(Math.max(...ptB) * 100)}%</span><span class="small muted">${esc(tx("ptNote"))}</span></div>` : "";
    return `<div class="panel result">
      ${title ? `<h3>${title}</h3>` : ""}
      <div class="result-head">
        ${charts.length === 1 ? `<div class="song-current">${H.jacketHTML(song, "sm")}<div><b>${esc(L(song.title))}</b><br><span class="small muted">${esc(U.tx(charts[0].diff))} ${song.diff[charts[0].diff] ? song.diff[charts[0].diff].lv : ""}</span></div></div>` :
          `<div class="song-current">${charts.slice(0, 4).map((c) => H.jacketHTML(c.song, "xs")).join("")}</div>`}
        <div><div class="small muted">${esc(tx("average"))}${charts.length > 1 ? " · " + esc(tx("avg")) : ""}</div><div class="big">${n(avg)}</div>
          <div class="small">${esc(U.tx("scoreRank"))}: <b>${esc(U.scoreRank(song, avg))}</b></div></div>
        <div><div class="small muted">${esc(tx("maximum"))}</div><div class="big">${n(max)}</div>
          <div class="small">${esc(U.scoreRank(song, max))} · <span class="muted">${esc(tx("maxHelp"))}</span></div></div>
        <div><div class="small muted">${esc(U.tx("unitScore"))}</div><div class="big">${n(d0.unit)}</div>
          <div class="small">${esc(S.rankFor(G.powerRanks, d0.unit))}</div></div>
        <a class="icon-btn" href="${detailsLink(leader, ids, songs[0], charts[0].diff)}">${esc(U.tx("openDetails"))} →</a>
      </div>
      ${spread ? `<div class="spread"><span class="small muted">${esc(tx("spread").replace("{n}", fmt(spread.runs)))}:</span>
        <span>${esc(tx("typical"))} <b>${n(spread.p10)} – ${n(spread.p90)}</b></span>
        <span>${esc(tx("top10"))} <b>≥ ${n(spread.p90)}</b></span>
        <span>${esc(tx("bestSeen"))} <b>${n(spread.best)}</b></span>
        <div class="spread-bar"><i style="left:${(spread.p10 / max * 100).toFixed(1)}%;width:${((spread.p90 - spread.p10) / max * 100).toFixed(1)}%"></i>
          <b style="left:${(avg / max * 100).toFixed(1)}%" title="${esc(tx("average"))}"></b></div></div>` : ""}
      ${U.teamHTML(leader, ids, { stats: d0.stats, hypo })}
      ${U.breakdownHTML(d0, leader)}
      ${ptBlock}
      <details class="tl-details" ${title ? "" : "open"}><summary>${esc(tx("timeline"))}</summary>${U.timelineHTML(d0, ids)}</details>
      ${st.pool === "owned" ? `<div><button class="icon-btn" data-plan="${planIdx}">🧩 ${esc(tx("planBoards"))}</button>
        <label class="check small"><input type="checkbox" data-plan-others="${planIdx}"> ${esc(tx("planOthers"))}</label><div id="plan-${planIdx}"></div></div>` : ""}
      ${charts.length > 1 ? `<table class="data small-table"><thead><tr><th>${esc(tx("perSong"))}</th><th class="num">${esc(tx("average"))}</th><th class="num">${esc(tx("maximum"))}</th></tr></thead><tbody>
        ${charts.map((c, i) => `<tr><td>${esc(L(c.song.title))} ${c.synthetic ? "*" : ""}</td><td class="num">${n(details[i].score)}</td><td class="num">${n(maxes[i])}</td></tr>`).join("")}</tbody></table>` : ""}
    </div>`;
  }

  function showResult(r) {
    const el = document.getElementById("results");
    if (!el) return;
    planTargets.length = 0;
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
