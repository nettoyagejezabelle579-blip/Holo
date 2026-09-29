/* Songs: every song with its cover, singers, difficulties and chart facts. */
(function () {
  "use strict";
  const H = window.Holo;
  const S = window.HoloSim;
  const G = window.HOLO_GAME;
  const { L, esc, fmt } = H;

  const TX = {
    en: {
      title: "Songs", search: "Search songs or singers…", all: "All", original: "Original", cover: "Cover",
      solo: "Solo", group: "Unit", every: "Everyone", sort: "Sort", newest: "Newest", name: "Title", level: "Expert level", notes: "Expert notes",
      singer: "Singer", released: "Released", length: "Length", coef: "Score coefficient", chart: "Chart data", yes: "yes", no: "not yet (notes spread evenly)",
      diff: "Difficulty", lv: "Level", noteCount: "Notes", specials: "Special skill timings", fever: "Fever (multi)", optimise: "Find best unit for this song",
      details: "Open in Team Details", talent: "Talent", songsN: "{n} songs", rating: "Counts for Score Rating", announced: "Announced songs",
      combo: "combo",
    },
    ja: {
      title: "楽曲", search: "楽曲名・歌唱で検索…", all: "すべて", original: "オリジナル", cover: "カバー",
      solo: "ソロ", group: "ユニット", every: "全員", sort: "並び替え", newest: "新しい順", name: "曲名", level: "EXPERTレベル", notes: "EXPERTノーツ",
      singer: "歌唱", released: "実装", length: "長さ", coef: "スコア係数", chart: "譜面データ", yes: "あり", no: "なし（ノーツを均等配置）",
      diff: "難易度", lv: "レベル", noteCount: "ノーツ", specials: "スペシャルスキル発動タイミング", fever: "フィーバー（マルチ）", optimise: "この曲の最適ユニットを探す",
      details: "編成詳細で開く", talent: "タレント", songsN: "{n}曲", rating: "スコアレーティング対象", announced: "発表済みの楽曲",
      combo: "コンボ",
    },
    zh: {
      title: "樂曲", search: "搜尋樂曲或演唱者…", all: "全部", original: "原創", cover: "翻唱",
      solo: "SOLO", group: "組合", every: "全員", sort: "排序", newest: "最新", name: "曲名", level: "Expert等級", notes: "Expert音符數",
      singer: "演唱者", released: "上線", length: "長度", coef: "分數係數", chart: "譜面資料", yes: "有", no: "無（音符平均分布）",
      diff: "難度", lv: "等級", noteCount: "音符數", specials: "特殊技能發動時機", fever: "Fever（多人）", optimise: "為此樂曲尋找最佳隊伍",
      details: "預覽細節", talent: "Holo成員", songsN: "{n} 首", rating: "列入分數評級", announced: "已公布的樂曲",
      combo: "連擊",
    },
  };
  const tx = (k, v) => { let s = (TX[H.lang] && TX[H.lang][k]) || TX.en[k]; if (v) for (const x in v) s = s.replace("{" + x + "}", v[x]); return s; };
  const root = document.getElementById("songs");
  const f = { q: "", cat: "", type: "", chr: "", sort: "newest" };
  const DIFFS = ["easy", "normal", "hard", "expert"];
  const date = (ms) => new Date(ms).toISOString().slice(0, 10);

  function list() {
    const q = f.q.trim().toLowerCase();
    let out = G.songs.filter((s) => {
      if (f.cat && s.cat !== f.cat) return false;
      if (f.type && s.singerType !== f.type) return false;
      if (f.chr && !s.chrs.includes(f.chr)) return false;
      if (q && !(s.title.en + " " + s.title.ja + " " + (s.title.zh || "") + " " + s.singer.en + " " + s.singer.ja + " " + (s.singer.zh || "")).toLowerCase().includes(q)) return false;
      return true;
    });
    const ex = (s) => (s.diff.expert || {});
    const cmp = {
      newest: (a, b) => b.start - a.start || a.order - b.order,
      name: (a, b) => L(a.title).localeCompare(L(b.title)),
      level: (a, b) => (ex(b).lv || 0) - (ex(a).lv || 0),
      notes: (a, b) => (ex(b).notes || 0) - (ex(a).notes || 0),
    }[f.sort];
    return out.sort(cmp);
  }

  function render() {
    const talents = Object.entries(H.talents).sort((a, b) => a[1].order - b[1].order);
    const songs = list();
    const ann = (window.HOLO_ANNOUNCED && window.HOLO_ANNOUNCED.songs) || [];
    root.innerHTML = `<h1 class="page-title">${esc(tx("title"))}</h1>
      <div class="toolbar">
        <input class="input search" id="s-q" type="search" placeholder="${esc(tx("search"))}" value="${esc(f.q)}">
        <span class="seg">${[["", tx("all")], ["original", tx("original")], ["cover", tx("cover")]].map(([v, l]) => `<button data-f="cat" data-v="${v}" aria-pressed="${f.cat === v}">${esc(l)}</button>`).join("")}</span>
        <span class="seg">${[["", tx("all")], ["solo", tx("solo")], ["group", tx("group")], ["all", tx("every")]].map(([v, l]) => `<button data-f="type" data-v="${v}" aria-pressed="${f.type === v}">${esc(l)}</button>`).join("")}</span>
        <select class="select" id="s-chr"><option value="">${esc(tx("talent"))}: ${esc(tx("all"))}</option>${talents.map(([id, t]) => `<option value="${esc(id)}" ${f.chr === id ? "selected" : ""}>${esc(L(t.name))}</option>`).join("")}</select>
        <select class="select" id="s-sort">${["newest", "name", "level", "notes"].map((k) => `<option value="${k}" ${f.sort === k ? "selected" : ""}>${esc(tx("sort"))}: ${esc(tx(k))}</option>`).join("")}</select>
      </div>
      ${ann.length ? `<div class="panel"><b>${esc(tx("announced"))}:</b> ${ann.map((a) => `<span class="chip">♪ ${esc(a.title)}</span>`).join(" ")}</div>` : ""}
      <div class="result-meta"><span>${esc(tx("songsN", { n: songs.length }))}</span></div>
      <div class="song-grid">${songs.map((s) => `<article class="song-tile" tabindex="0" data-id="${esc(s.id)}">
        ${H.jacketHTML(s)}
        <div class="song-body"><b>${esc(L(s.title))}</b><span class="muted small">${esc(L(s.singer))}</span>
          <div class="lv-row">${DIFFS.map((d) => s.diff[d] ? `<span class="lv lv-${d}">${s.diff[d].lv}</span>` : "").join("")}</div></div>
      </article>`).join("")}</div>`;
    H.renderFooter();
  }

  async function openSong(id) {
    const s = S.songById[id];
    if (!s) return;
    await S.loadChart(id);
    const raw = (window.HOLO_CHARTS || {})[id] || {};
    const ex = raw.expert;
    const modal = document.getElementById("modal-root");
    const mm = (sec) => Math.floor(sec / 60) + ":" + String(Math.round(sec % 60)).padStart(2, "0");
    modal.innerHTML = `<div class="modal-backdrop" id="sg-back"><div class="modal" role="dialog" aria-modal="true" style="max-width:820px">
      <div class="modal-head"><span class="spacer"></span><button class="icon-btn" id="sg-close">✕</button></div>
      <div class="modal-body" style="grid-template-columns:260px 1fr">
        <div>${H.jacketHTML(s, "lg")}</div>
        <div>
          <h2 class="detail-title">${esc(L(s.title))}</h2>
          <p class="detail-sub">${esc(L(s.singer))}${[s.title.en, s.title.ja, s.title.zh].filter((x, i, a) => x && x !== L(s.title) && a.indexOf(x) === i).map((x) => " · " + esc(x)).join("")}</p>
          <dl class="kv">
            <dt>${esc(tx("released"))}</dt><dd>${date(s.start)}</dd>
            <dt>${esc(tx("length"))}</dt><dd>${mm(s.sec)}</dd>
            <dt>${esc(tx("singer"))}</dt><dd>${s.chrs.map((c) => H.talents[c] ? esc(L(H.talents[c].name)) : "").filter(Boolean).join(", ") || esc(tx("every"))}</dd>
            <dt>${esc(tx("coef"))}</dt><dd>${s.coef}‰</dd>
            <dt>${esc(tx("rating"))}</dt><dd>${s.rating ? "✓" : "—"}</dd>
            <dt>${esc(tx("chart"))}</dt><dd>${S.chartIndex[id] ? esc(tx("yes")) : esc(tx("no"))}</dd>
          </dl>
          <table class="data"><thead><tr><th>${esc(tx("diff"))}</th><th class="num">${esc(tx("lv"))}</th><th class="num">${esc(tx("noteCount"))}</th></tr></thead>
            <tbody>${DIFFS.filter((d) => s.diff[d]).map((d) => `<tr><td><span class="lv lv-${d}">${d.toUpperCase()}</span></td><td class="num">${s.diff[d].lv}</td><td class="num">${fmt(s.diff[d].notes)}</td></tr>`).join("")}</tbody></table>
          ${ex ? `<div class="section"><h4>${esc(tx("specials"))} (EXPERT)</h4><div class="chips">${ex.sp.map((t, i) => `<span class="chip">${i + 1}: ${(t / 1000).toFixed(1)}s · ${ex.sc[i]} ${esc(tx("combo"))}</span>`).join("")}</div>
            ${ex.fv ? `<p class="small muted">${esc(tx("fever"))}: ${(ex.fv[0] / 1000).toFixed(1)}s – ${(ex.fv[1] / 1000).toFixed(1)}s</p>` : ""}</div>` : ""}
          <div class="chips" style="margin-top:12px">
            <a class="chip" href="../team/index.html?song=${esc(id)}&diff=expert">${esc(tx("optimise"))} →</a>
            <a class="chip" href="../team/details.html#s=${esc(id)}&d=expert">${esc(tx("details"))} →</a>
          </div>
        </div>
      </div></div></div>`;
    document.body.style.overflow = "hidden";
    history.replaceState(null, "", location.pathname + location.search + "#" + id);
  }
  function close() {
    document.getElementById("modal-root").innerHTML = "";
    document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname + location.search);
  }

  root.addEventListener("input", (e) => {
    if (e.target.id === "s-q") { f.q = e.target.value; const pos = e.target.selectionStart; render(); const q = document.getElementById("s-q"); q.focus(); q.setSelectionRange(pos, pos); }
  });
  root.addEventListener("change", (e) => {
    if (e.target.id === "s-chr") { f.chr = e.target.value; render(); }
    if (e.target.id === "s-sort") { f.sort = e.target.value; render(); }
  });
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-f]");
    if (b) { f[b.dataset.f] = b.dataset.v; render(); return; }
    const t = e.target.closest(".song-tile");
    if (t) openSong(t.dataset.id);
  });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.closest(".song-tile")) openSong(e.target.closest(".song-tile").dataset.id); });
  document.getElementById("modal-root").addEventListener("click", (e) => { if (e.target.id === "sg-back" || e.target.closest("#sg-close")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  H.renderHeader("songs", render);
  render();
  const hid = location.hash.slice(1);
  if (hid && S.songById[hid]) openSong(hid);
})();
