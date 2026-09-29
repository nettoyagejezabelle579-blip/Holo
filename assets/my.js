/* My Data: the player's box (cards, level, bloom), holomem ranks, memories, backup. */
(function () {
  "use strict";
  const H = window.Holo;
  const S = window.HoloSim;
  const G = window.HOLO_GAME;
  const { L, esc, fmt } = H;

  const TX = {
    en: {
      title: "My Data", intro: "Enter what you own in the game. The Team Optimizer only uses these cards, levels, blooms and ranks.",
      tabCards: "Cards", tabHolomem: "Holomems", tabMemories: "Memories", tabBackup: "Backup",
      owned: "Owned", level: "Level", bloom: "Bloom", lb: "Limit break", search: "Search by name",
      onlyOwned: "Owned only", all: "All", allMax: "Set owned to max level", markStar3: "Own every ★3", clearAll: "Clear all cards",
      rank: "Holomem Rank", board: "Board", boardAuto: "auto from rank", boardManual: "manual %", setAllRanks: "Set every rank to",
      memories: "Memories owned", memoriesHelp: "Memories on the Memory Stand raise every Unit parameter.",
      bonus: "Unit parameters", upgrade: "Member Upgrade Bonus", upgradeHelp: "Every owned card at Lv 20+ adds to this (max 50%).",
      export: "Download backup", import: "Restore from file", copy: "Copy as text", paste: "Import from text",
      pasteHere: "Paste backup text here", imported: "Imported!", copied: "Copied!", confirmClear: "Remove every owned card?",
      summaryCards: "Cards", summaryHolomem: "Ranked holomems", summaryMem: "Memories", summaryUpgrade: "Upgrade bonus",
      points: "Board pts", confirmMark: "Mark all ★3 cards as owned at max level?",
    },
    ja: {
      title: "所持データ", intro: "ゲーム内の所持状況を入力してください。編成最適化はここのカード・レベル・開花・ランクだけを使います。",
      tabCards: "カード", tabHolomem: "ホロメン", tabMemories: "メモリー", tabBackup: "バックアップ",
      owned: "所持", level: "レベル", bloom: "開花", lb: "限界突破", search: "名前で検索",
      onlyOwned: "所持のみ", all: "すべて", allMax: "所持カードを最大レベルに", markStar3: "★3をすべて所持に", clearAll: "カードをすべて解除",
      rank: "ホロメンランク", board: "ボード", boardAuto: "ランクから自動", boardManual: "手動 %", setAllRanks: "すべてのランクを",
      memories: "所持メモリー", memoriesHelp: "メモリースタンドのメモリーはユニットの全パラメータを上げます。",
      bonus: "ユニットパラメータ", upgrade: "メンバー育成ボーナス", upgradeHelp: "Lv20以上の所持カードごとに加算（最大50%）。",
      export: "バックアップをダウンロード", import: "ファイルから復元", copy: "テキストでコピー", paste: "テキストから読み込み",
      pasteHere: "バックアップのテキストを貼り付け", imported: "読み込みました", copied: "コピーしました", confirmClear: "所持カードをすべて解除しますか？",
      summaryCards: "カード", summaryHolomem: "ランク入力済み", summaryMem: "メモリー", summaryUpgrade: "育成ボーナス",
      points: "ボードPt", confirmMark: "★3カードをすべて最大レベルで所持にしますか？",
    },
  };
  const tx = (k) => (TX[H.lang] && TX[H.lang][k]) || TX.en[k];

  const root = document.getElementById("my");
  let tab = location.hash.slice(1) || "cards";
  const filt = { q: "", rarity: "", own: "all" };

  function summary() {
    const p = H.progress;
    const ranked = Object.values(p.ranks).filter((r) => r > 1).length;
    return `<div class="chips" style="margin:6px 0 14px">
      <a class="chip" href="#cards">${esc(tx("summaryCards"))}: ${Object.keys(p.cards).length}</a>
      <a class="chip" href="#holomem">${esc(tx("summaryHolomem"))}: ${ranked}</a>
      <a class="chip" href="#memories">${esc(tx("summaryMem"))}: ${p.memories || 0} / ${G.posterCount}</a>
      <span class="chip">${esc(tx("summaryUpgrade"))}: ${(S.upgradeBonus(p) / 100).toFixed(2)}%</span></div>`;
  }

  function tabs() {
    return `<div class="tabs">${["cards", "holomem", "memories", "backup"].map((k) =>
      `<a href="#${k}" class="tab ${tab === k ? "active" : ""}">${esc(tx("tab" + k[0].toUpperCase() + k.slice(1)))}</a>`).join("")}</div>`;
  }

  // ---------- cards ----------
  function cardList() {
    const q = filt.q.trim().toLowerCase();
    return H.cards.filter((c) => {
      if (c.announced) return false;
      if (filt.rarity && String(c.rarity) !== filt.rarity) return false;
      if (filt.own === "owned" && !H.owned.has(c.id)) return false;
      if (filt.own === "not" && H.owned.has(c.id)) return false;
      if (q) {
        const tl = H.talents[c.chr];
        const txt = [c.title.en, c.title.ja, tl.name.en, tl.name.ja, tl.short.en, tl.short.ja].join(" ").toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => H.talents[a.chr].order - H.talents[b.chr].order || b.rarity - a.rarity);
  }
  function cardTile(c) {
    const own = H.progress.cards[c.id];
    const max = H.maxLevel(c);
    const lv = own ? own.lv : 1;
    const bloom = own ? own.bloom : 0;
    const lims = H.D.limits[c.limitGroup] || [];
    const lb = H.limitBreakFor(c, lv);
    const tl = H.talents[c.chr];
    return `<article class="my-card ${own ? "" : "not-owned"}" data-id="${esc(c.id)}">
      <div class="my-card-top">${H.artHTML(c, { noNew: true })}
        <div class="my-card-info"><strong>${esc(L(c.title))}</strong><span class="muted small">${esc(L(tl.name))}</span>
          <span style="color:var(--star)">${H.stars(c.rarity)}</span></div></div>
      <label class="own-row"><input type="checkbox" data-act="own" ${own ? "checked" : ""}> ${esc(tx("owned"))}</label>
      <div class="slider-row"><span>${esc(tx("level"))}</span><b>Lv ${lv} · ${esc(tx("lb"))} ${lb}</b></div>
      <div class="lb-track"><input type="range" data-act="lv" min="1" max="${max}" value="${lv}" ${own ? "" : "disabled"}>
        <div class="lb-dots">${lims.slice(0, -1).map((x) => `<i style="left:${((x - 1) / (max - 1)) * 100}%"></i>`).join("")}</div></div>
      <div class="slider-row"><span>${esc(tx("bloom"))}</span><b>${bloom}</b></div>
      <input type="range" data-act="bloom" min="0" max="5" value="${bloom}" ${own ? "" : "disabled"}>
    </article>`;
  }
  function renderCards() {
    const list = cardList();
    return `<div class="toolbar">
        <input class="input search" id="my-q" type="search" placeholder="${esc(tx("search"))}" value="${esc(filt.q)}">
        <div class="seg">${["", "5", "4", "3"].map((r) => `<button data-rarity="${r}" aria-pressed="${filt.rarity === r}">${r ? "★" + r : esc(tx("all"))}</button>`).join("")}</div>
        <div class="seg">${[["all", tx("all")], ["owned", tx("onlyOwned")], ["not", "✕ " + tx("owned")]].map(([k, l]) => `<button data-own="${k}" aria-pressed="${filt.own === k}">${esc(l)}</button>`).join("")}</div>
        <button class="icon-btn" id="all-max">${esc(tx("allMax"))}</button>
        <button class="icon-btn" id="mark-3">${esc(tx("markStar3"))}</button>
        <button class="icon-btn" id="clear-all">${esc(tx("clearAll"))}</button>
      </div>
      <div class="my-grid">${list.map(cardTile).join("")}</div>`;
  }

  // ---------- holomems ----------
  function renderHolomem() {
    const prods = Object.entries(H.D.productions).sort((a, b) => a[1].order - b[1].order);
    const talents = Object.entries(H.talents).sort((a, b) => a[1].order - b[1].order);
    return `<div class="toolbar"><span>${esc(tx("setAllRanks"))}</span>
        <input class="input" id="all-rank" type="number" min="1" max="50" value="20" style="width:80px">
        <button class="icon-btn" id="apply-all-rank">OK</button>
        <span class="small muted">${esc(tx("board"))}: ${esc(tx("boardAuto"))} / ${esc(tx("boardManual"))}</span></div>
      ${prods.map(([pid, p]) => `<h3>${esc(L(p.name))}</h3><div class="rank-grid">` + talents.filter(([, t]) => t.production === pid).map(([chr, t]) => {
        const r = H.progress.ranks[chr] || 1;
        const manual = H.progress.boardPct[chr];
        const frac = S.boardFraction(H.progress, chr);
        const pts = G.rankPoints[r - 1] || 0;
        return `<div class="rank-card" data-chr="${esc(chr)}">
          <div class="rank-head"><span class="avatar" style="background:linear-gradient(135deg,${esc(t.color)},${esc(t.color2)})">${esc(L(t.short).slice(0, 2))}</span>
            <div><strong>${esc(L(t.name))}</strong><div class="small muted">${esc(tx("rank"))} <b>${r}</b> · ${esc(tx("points"))} ${pts} · ${esc(tx("board"))} ${Math.round(frac * 100)}%</div></div></div>
          <div class="rank-ctl"><button class="icon-btn" data-rank="-1">−</button>
            <input type="range" min="1" max="50" value="${r}" data-act="rank">
            <button class="icon-btn" data-rank="1">+</button></div>
          <label class="small muted">${esc(tx("boardManual"))} <input class="input" type="number" min="0" max="100" data-act="boardpct" value="${manual == null ? "" : esc(manual)}" placeholder="auto" style="width:90px;min-height:28px;padding:2px 6px"></label>
        </div>`;
      }).join("") + `</div>`).join("")}`;
  }

  // ---------- memories ----------
  function renderMemories() {
    const n = H.progress.memories || 0;
    return `<div class="panel">
      <h2>${esc(tx("memories"))}</h2>
      <p class="muted">${esc(tx("memoriesHelp"))}</p>
      <div class="controls"><input type="range" id="mem" min="0" max="${G.posterCount}" value="${n}" style="flex:1">
        <b>${n} / ${G.posterCount}</b></div>
      <p>${esc(tx("bonus"))}: <b>+${(S.posterPermil(n) / 10).toFixed(1)}%</b></p>
    </div>
    <div class="panel"><h2>${esc(tx("upgrade"))}</h2><p class="muted">${esc(tx("upgradeHelp"))}</p>
      <p><b>+${(S.upgradeBonus(H.progress) / 100).toFixed(2)}%</b> / 50%</p></div>`;
  }

  // ---------- backup ----------
  function renderBackup() {
    return `<div class="panel"><h2>${esc(tx("tabBackup"))}</h2>
      <div class="chips">
        <button class="chip" id="bk-export">${esc(tx("export"))}</button>
        <label class="chip">${esc(tx("import"))}<input type="file" id="bk-file" accept="application/json" hidden></label>
        <button class="chip" id="bk-copy">${esc(tx("copy"))}</button>
      </div>
      <textarea class="input" id="bk-text" rows="6" style="width:100%;margin-top:10px;font-family:monospace" placeholder="${esc(tx("pasteHere"))}"></textarea>
      <button class="icon-btn" id="bk-paste">${esc(tx("paste"))}</button> <span id="bk-msg" class="muted"></span></div>`;
  }

  function render() {
    root.innerHTML = `<h1 class="page-title">${esc(tx("title"))}</h1><p class="muted">${esc(tx("intro"))}</p>${summary()}${tabs()}
      <div id="tab-body">${tab === "holomem" ? renderHolomem() : tab === "memories" ? renderMemories() : tab === "backup" ? renderBackup() : renderCards()}</div>`;
    H.renderFooter();
  }

  function refreshCard(el) {
    const c = H.cardById[el.dataset.id];
    el.outerHTML = cardTile(c);
  }

  root.addEventListener("input", (e) => {
    const el = e.target;
    if (el.id === "my-q") { filt.q = el.value; const pos = el.selectionStart; render(); const q = document.getElementById("my-q"); q.focus(); q.setSelectionRange(pos, pos); return; }
    if (el.id === "mem") { H.progress.memories = Number(el.value); H.saveProgress(); render(); document.getElementById("mem").focus(); return; }
    const cardEl = el.closest(".my-card");
    if (cardEl && (el.dataset.act === "lv" || el.dataset.act === "bloom")) {
      const c = H.cardById[cardEl.dataset.id];
      const cur = H.progress.cards[c.id];
      if (!cur) return;
      cur[el.dataset.act] = Number(el.value);
      H.saveProgress();
      const rows = cardEl.querySelectorAll(".slider-row b");
      rows[0].textContent = `Lv ${cur.lv} · ${tx("lb")} ${H.limitBreakFor(c, cur.lv)}`;
      rows[1].textContent = cur.bloom;
      return;
    }
    const rankEl = el.closest(".rank-card");
    if (rankEl && el.dataset.act === "rank") {
      H.progress.ranks[rankEl.dataset.chr] = Number(el.value);
      H.saveProgress();
      updateRankCard(rankEl);
    }
  });
  function updateRankCard(rankEl) {
    const chr = rankEl.dataset.chr;
    const r = H.progress.ranks[chr] || 1;
    rankEl.querySelector(".small.muted").innerHTML = `${esc(tx("rank"))} <b>${r}</b> · ${esc(tx("points"))} ${G.rankPoints[r - 1] || 0} · ${esc(tx("board"))} ${Math.round(S.boardFraction(H.progress, chr) * 100)}%`;
    rankEl.querySelector('input[data-act="rank"]').value = r;
  }
  root.addEventListener("change", (e) => {
    const el = e.target;
    const cardEl = el.closest(".my-card");
    if (cardEl && el.dataset.act === "own") {
      H.setCardProgress(cardEl.dataset.id, el.checked ? {} : null);
      refreshCard(cardEl);
      root.querySelector(".chips").outerHTML = summary();
      return;
    }
    const rankEl = el.closest(".rank-card");
    if (rankEl && el.dataset.act === "boardpct") {
      const v = el.value === "" ? null : Math.max(0, Math.min(100, Number(el.value)));
      if (v == null) delete H.progress.boardPct[rankEl.dataset.chr]; else H.progress.boardPct[rankEl.dataset.chr] = v;
      H.saveProgress();
      updateRankCard(rankEl);
      return;
    }
    if (el.id === "bk-file" && el.files[0]) el.files[0].text().then(importText);
  });
  function importText(txt) {
    try {
      const data = JSON.parse(txt);
      H.replaceProgress(data.progress || data);
      render();
      const m = document.getElementById("bk-msg");
      if (m) m.textContent = tx("imported");
    } catch (err) { alert("Invalid backup"); }
  }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.rarity != null) { filt.rarity = b.dataset.rarity; render(); }
    else if (b.dataset.own) { filt.own = b.dataset.own; render(); }
    else if (b.id === "all-max") {
      for (const id in H.progress.cards) H.progress.cards[id].lv = H.maxLevel(H.cardById[id]);
      H.saveProgress(); render();
    } else if (b.id === "mark-3") {
      if (!confirm(tx("confirmMark"))) return;
      for (const c of H.cards) if (c.rarity === 3 && !c.announced && !H.progress.cards[c.id]) H.progress.cards[c.id] = { lv: H.maxLevel(c), bloom: 0 };
      H.saveProgress(); render();
    } else if (b.id === "clear-all") {
      if (!confirm(tx("confirmClear"))) return;
      H.progress.cards = {}; H.saveProgress(); render();
    } else if (b.dataset.rank) {
      const rankEl = b.closest(".rank-card");
      const chr = rankEl.dataset.chr;
      H.progress.ranks[chr] = Math.max(1, Math.min(50, (H.progress.ranks[chr] || 1) + Number(b.dataset.rank)));
      H.saveProgress(); updateRankCard(rankEl);
    } else if (b.id === "apply-all-rank") {
      const v = Math.max(1, Math.min(50, Number(document.getElementById("all-rank").value) || 1));
      for (const chr in H.talents) H.progress.ranks[chr] = v;
      H.saveProgress(); render();
    } else if (b.id === "bk-export") {
      const blob = new Blob([JSON.stringify({ progress: H.progress }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "holodori-progress.json"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (b.id === "bk-copy") {
      const txt = JSON.stringify({ progress: H.progress });
      document.getElementById("bk-text").value = txt;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { document.getElementById("bk-msg").textContent = tx("copied"); }, () => {});
    } else if (b.id === "bk-paste") importText(document.getElementById("bk-text").value);
  });
  window.addEventListener("hashchange", () => { tab = location.hash.slice(1) || "cards"; render(); });

  H.renderHeader("my", render);
  render();
})();
