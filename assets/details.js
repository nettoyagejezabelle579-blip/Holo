/* Team Details: build a unit by hand and see its estimated score breakdown. */
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
      title: "Team Details", intro: "Build a unit by hand and see its Unit Score, estimated Live score and how each member contributes.",
      leader: "Leader", members: "Members (formation order)", change: "Change members", playMode: "Play",
      perfect: "ALL PERFECT", auto: "AUTO", board: "Use holomem board", life: "LIFE stays full",
      breakdown: "Score breakdown", baseScore: "Notes (no skills)", skillScore: "From skills", songBonus: "Song bonus (board)",
      upgrade: "Member Upgrade Bonus", memory: "Memories", member: "Member", uptime: "Active uptime", special: "Special",
      specialAt: "fires at", support: "Score Support", rate: "Skill rate", empty: "Pick a leader and members to see the estimate.",
      notOwned: "not owned: treated as max level, bloom 0", moveUp: "Move left", optimiseOrder: "Best formation order",
      chart: "Chart", notes: "notes", synthetic: "no chart data, notes spread evenly",
      calibrate: "Calibrate with your real score", calibHelp: "Play this exact unit and song, then enter your in-game score. Every estimate on the site is rescaled by the same factor.",
      apply: "Apply", reset: "Reset", factor: "Current factor",
      maximum: "Maximum", maxHelp: "all active skills fire", spread: "2,000 simulated plays", worst: "Worst", typical: "Typical (middle 80%)",
      median: "Median", bestSeen: "Best seen",
    },
    ja: {
      title: "編成詳細", intro: "ユニットを手動で組み、ユニットスコア・推定スコア・各メンバーの貢献を確認できます。",
      leader: "リーダー", members: "メンバー（編成順）", change: "メンバーを変更", playMode: "プレイ",
      perfect: "ALL PERFECT", auto: "AUTO", board: "ホロメンボードを使用", life: "ライフ満タン",
      breakdown: "スコア内訳", baseScore: "ノーツ（スキルなし）", skillScore: "スキル分", songBonus: "楽曲ボーナス（ボード）",
      upgrade: "メンバー育成ボーナス", memory: "メモリー", member: "メンバー", uptime: "アクティブ発動率", special: "スペシャル",
      specialAt: "発動", support: "スコアサポート", rate: "発動率", empty: "リーダーとメンバーを選ぶと推定値が表示されます。",
      notOwned: "未所持：最大レベル・開花0として計算", moveUp: "左へ", optimiseOrder: "最適な編成順",
      chart: "譜面", notes: "ノーツ", synthetic: "譜面データなし：ノーツを均等配置",
      calibrate: "実際のスコアで補正", calibHelp: "このユニットとこの楽曲で実際にプレイしたスコアを入力すると、サイト全体の推定値を同じ倍率で補正します。",
      apply: "適用", reset: "リセット", factor: "現在の倍率",
      maximum: "最大", maxHelp: "アクティブスキルが全発動", spread: "2,000回のシミュレーション", worst: "最低", typical: "通常（中央80%）",
      median: "中央値", bestSeen: "最高記録",
    },
  };
  const tx = (k) => (TX[H.lang] && TX[H.lang][k]) || TX.en[k];
  const root = document.getElementById("details");

  const st = Object.assign({ song: U.songsSorted()[0].id, diff: "expert", mode: "perfect", leader: null, members: [], board: true, lifeFull: true },
    H.store.get("details", {}), U.decodeTeam(location.hash.slice(1)));
  const save = () => {
    H.store.set("details", st);
    history.replaceState(null, "", location.pathname + "#" + U.encodeTeam(st));
  };

  function leaderOptions() {
    const owned = Object.keys(H.progress.cards).concat(st.leader && st.leader.cardId ? [st.leader.cardId] : []);
    const outfits = O.leaderOptions(owned).filter((l) => l.cardId);
    const plain = Object.keys(H.talents).map((chr) => ({ chr, cardId: null }));
    return outfits.concat(plain);
  }

  async function render() {
    await S.loadChart(st.song);
    const song = S.songById[st.song];
    const chart = S.getChart(st.song, st.diff, st.mode);
    const env = S.makeEnv(H.progress, { board: st.board, mode: st.mode, lifeFull: st.lifeFull });
    const lk = st.leader ? st.leader.chr + ":" + (st.leader.cardId || "") : "";
    let result = null;
    if (st.members.length) {
      const team = { leader: st.leader, members: st.members.map((id) => S.prepare(env, id)) };
      result = S.evaluate(env, team, chart, true);
      result.spread = S.simulate(env, team, chart, 2000);
    }
    root.innerHTML = `<h1 class="page-title">${esc(tx("title"))}</h1><p class="muted">${esc(tx("intro"))}</p>
      <div class="details-layout">
        <div class="panel">
          ${U.songPickerHTML("d-song", st.song, st.diff, { size: 6 })}
          <p class="small muted">${esc(tx("chart"))}: ${chart.notes} ${esc(tx("notes"))} · ${song.sec}s${chart.synthetic ? " · " + esc(tx("synthetic")) : ""}</p>
          <div class="opt-rows">
            <div><span class="lbl">${esc(tx("playMode"))}</span><span class="seg">${[["perfect", tx("perfect")], ["auto", tx("auto")]].map(([v, l]) => `<button data-mode="${v}" aria-pressed="${st.mode === v}">${esc(l)}</button>`).join("")}</span></div>
            <div><label class="check"><input type="checkbox" data-toggle="board" ${st.board ? "checked" : ""}> ${esc(tx("board"))}</label>
              <label class="check"><input type="checkbox" data-toggle="lifeFull" ${st.lifeFull ? "checked" : ""}> ${esc(tx("life"))}</label></div>
            <div><span class="lbl">${esc(tx("leader"))}</span><select class="select" id="d-leader"><option value="">—</option>${leaderOptions().map((l) => {
              const v = l.chr + ":" + (l.cardId || "");
              return `<option value="${esc(v)}" ${v === lk ? "selected" : ""}>${esc(U.leaderLabel(l))}</option>`;
            }).join("")}</select></div>
            <div><span class="lbl">${esc(tx("members"))}</span><button class="icon-btn" id="d-pick">${esc(tx("change"))}</button>
              <button class="icon-btn" id="d-order" ${st.members.length > 1 ? "" : "disabled"}>${esc(tx("optimiseOrder"))}</button></div>
          </div>
        </div>
        <div>${result ? resultHTML(result, chart, env) : `<div class="panel muted">${esc(tx("empty"))}</div>`}</div>
      </div>`;
    U.bindSongPicker(root, "d-song", (c) => { if (c.song) st.song = c.song; if (c.diff) st.diff = c.diff; save(); render(); });
    H.renderFooter();
  }

  function resultHTML(r, chart, env) {
    const song = chart.song;
    const rows = st.members.map((id, i) => {
      const c = H.cardById[id];
      const s = r.stats[i];
      const sp = r.specials.find((x) => x.slot === i);
      const own = H.progress.cards[id];
      return `<tr><td>${i + 1}</td><td>${esc(L(c.title))}<br><span class="muted small">${esc(L(H.talents[c.chr].name))} · ${own ? `Lv ${own.lv} ✿${own.bloom}` : esc(tx("notOwned"))}</span></td>
        <td class="num">${fmt(Math.round(s[0]))}</td><td class="num">${fmt(Math.round(s[1]))}</td><td class="num">${fmt(Math.round(s[2]))}</td>
        <td class="num"><b>${fmt(Math.round(s[0] + s[1] + s[2]))}</b></td>
        <td class="num">${(r.uptime[i] * 100).toFixed(1)}%</td>
        <td>${sp ? `${sp.t0.toFixed(1)}s–${sp.t1.toFixed(1)}s${sp.sup ? ` · ${esc(tx("support"))} ${Math.round(sp.sup * 100)}%` : ""}${sp.rate ? ` · ${esc(tx("rate"))} +${Math.round(sp.rate * 100)}%` : ""}` : "—"}</td>
        <td>${i > 0 ? `<button class="link-btn" data-up="${i}" title="${esc(tx("moveUp"))}">◀</button>` : ""}</td></tr>`;
    }).join("");
    return `<div class="panel result">
        <div class="result-head">
          <div><div class="small muted">${esc(U.tx("estScore"))} (${esc(H.lang === "ja" ? "平均" : "average")})</div><div class="big">${fmt(Math.round(r.score))}</div>
            <div class="small">${esc(U.tx("scoreRank"))}: <b>${esc(U.scoreRank(song, r.score))}</b></div></div>
          <div><div class="small muted">${esc(tx("maximum"))}</div><div class="big">${fmt(Math.round(r.spread.max))}</div>
            <div class="small">${esc(U.scoreRank(song, r.spread.max))} · <span class="muted">${esc(tx("maxHelp"))}</span></div></div>
          <div><div class="small muted">${esc(U.tx("unitScore"))}</div><div class="big">${fmt(Math.round(r.unit))}</div>
            <div class="small">${esc(S.rankFor(G.powerRanks, r.unit))}</div></div>
        </div>
        <div class="spread"><span class="small muted">${esc(tx("spread"))}:</span>
          <span>${esc(tx("worst"))} <b>${fmt(Math.round(r.spread.min))}</b></span>
          <span>${esc(tx("typical"))} <b>${fmt(Math.round(r.spread.p10))} – ${fmt(Math.round(r.spread.p90))}</b></span>
          <span>${esc(tx("median"))} <b>${fmt(Math.round(r.spread.median))}</b></span>
          <span>1% <b>≥ ${fmt(Math.round(r.spread.p99))}</b></span>
          <span>${esc(tx("bestSeen"))} <b>${fmt(Math.round(r.spread.best))}</b></span>
          <div class="spread-bar"><i style="left:${(r.spread.p10 / r.spread.max * 100).toFixed(1)}%;width:${((r.spread.p90 - r.spread.p10) / r.spread.max * 100).toFixed(1)}%"></i>
            <b style="left:${(r.score / r.spread.max * 100).toFixed(1)}%"></b></div></div>
        ${U.teamHTML(st.leader, st.members, { stats: r.stats })}
        <div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>${esc(tx("member"))}</th><th class="num">P</th><th class="num">T</th><th class="num">S</th><th class="num">Σ</th>
          <th class="num">${esc(tx("uptime"))}</th><th>${esc(tx("special"))}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
        <h3>${esc(tx("breakdown"))}</h3>
        <dl class="kv">
          <dt>${esc(tx("baseScore"))}</dt><dd>${fmt(Math.round(r.base))}</dd>
          <dt>${esc(tx("skillScore"))}</dt><dd>${fmt(Math.round(r.skill))} (${((r.skill / r.base) * 100).toFixed(1)}%)</dd>
          <dt>${esc(tx("upgrade"))}</dt><dd>+${(r.upgrade / 100).toFixed(2)}%</dd>
          <dt>${esc(tx("memory"))}</dt><dd>+${(r.memory / 10).toFixed(1)}%</dd>
          <dt>${esc(tx("songBonus"))}</dt><dd>+${(r.songBonus / 10).toFixed(1)}%</dd>
        </dl>
        <h3>${esc(tx("calibrate"))}</h3>
        <p class="small muted">${esc(tx("calibHelp"))}</p>
        <div class="opt-rows"><div><input class="input" id="calib-score" type="number" min="1" placeholder="1234567" style="width:160px">
          <button class="icon-btn" id="calib-apply" data-est="${r.score}">${esc(tx("apply"))}</button>
          <button class="icon-btn" id="calib-reset">${esc(tx("reset"))}</button>
          <span class="small muted">${esc(tx("factor"))}: ×${(H.store.get("calibration", 1) || 1).toFixed(3)}</span></div></div>
      </div>`;
  }

  root.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.mode) { st.mode = b.dataset.mode; save(); render(); }
    else if (b.id === "d-pick") {
      const pool = H.cards.filter((c) => !c.announced).map((c) => c.id);
      const r = await U.pickCards({ max: 5, selected: st.members, pool });
      if (r) { st.members = r; save(); }
      render();
    } else if (b.dataset.up) {
      const i = Number(b.dataset.up);
      [st.members[i - 1], st.members[i]] = [st.members[i], st.members[i - 1]];
      save(); render();
    } else if (b.id === "calib-apply") {
      const real = Number(document.getElementById("calib-score").value);
      const cur = H.store.get("calibration", 1) || 1;
      const est = Number(b.dataset.est) / cur;
      if (real > 0 && est > 0) { H.store.set("calibration", real / est); render(); }
    } else if (b.id === "calib-reset") {
      H.store.set("calibration", 1); render();
    } else if (b.id === "d-order") {
      const chart = S.getChart(st.song, st.diff, st.mode);
      const env = S.makeEnv(H.progress, { board: st.board, mode: st.mode, lifeFull: st.lifeFull });
      let best = st.members, bestS = -1;
      for (const p of O.permutations(st.members)) {
        const s = S.evaluate(env, { leader: st.leader, members: p.map((id) => S.prepare(env, id)) }, chart);
        if (s > bestS) { bestS = s; best = p; }
      }
      st.members = best; save(); render();
    }
  });
  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.id === "d-leader") {
      const [chr, cardId] = el.value.split(":");
      st.leader = el.value ? { chr, cardId: cardId || null } : null;
      save(); render();
    } else if (el.dataset.toggle) { st[el.dataset.toggle] = el.checked; save(); render(); }
  });
  window.addEventListener("hashchange", () => { Object.assign(st, U.decodeTeam(location.hash.slice(1))); render(); });

  H.renderHeader("details", render);
  render();
})();
