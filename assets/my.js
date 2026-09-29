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
      editBoard: "Edit board", tiles: "Tiles unlocked", ptsLeft: "Points left", dream: "Dream Rank", autoMode: "Auto setup for holomems you haven't edited",
      autoLeader: "Auto: Leader", autoMember: "Auto: Member", autoSupport: "Auto: Support", reset: "Reset", close: "Close",
      boardHelp: "Tap a tile next to an unlocked tile to unlock it (needs points and Dream Rank); tap an unlocked tile to lock it. Auto setup spends the points left.",
      custom: "custom", autoState: "auto", totals: "Board effects", legend: "Red: Leader · Blue: Member · Green: Support · Yellow: Song · Grey: Connect",
      needDream: "Needs Dream Rank", cost: "Cost", noLive: "no effect on Live score",
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
      editBoard: "ボードを編集", tiles: "解放数", ptsLeft: "残りPt", dream: "ドリームランク", autoMode: "未編集ホロメンの自動設置",
      autoLeader: "自動：リーダー", autoMember: "自動：メンバー", autoSupport: "自動：サポート", reset: "リセット", close: "閉じる",
      boardHelp: "解放済みマスに隣接するマスをタップで解放（Ptとドリームランクが必要）、解放済みマスをタップで解除。自動設置は残りPtを使います。",
      custom: "手動", autoState: "自動", totals: "ボード効果", legend: "赤：リーダー・青：メンバー・緑：サポート・黄：楽曲・灰：コネクト",
      needDream: "必要ドリームランク", cost: "コスト", noLive: "ライブスコアに影響なし",
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
  const B = window.HoloBoard;
  function boardState(chr) {
    const set = B.unlocked(H.progress, chr);
    const pts = B.pointsFor(H.progress, chr);
    return { set, pts, left: pts - B.spent(chr, set), tiles: set.size - 1, custom: !!(H.progress.board[chr] && H.progress.board[chr].length) };
  }
  function rankInfo(chr) {
    const r = H.progress.ranks[chr] || 1;
    const b = boardState(chr);
    return `${esc(tx("rank"))} <b>${r}</b> · ${esc(tx("tiles"))} <b>${b.tiles}</b> · ${esc(tx("ptsLeft"))} ${b.left} · <span class="pill ${b.custom ? "on" : ""}">${esc(b.custom ? tx("custom") : tx("autoState"))}</span>`;
  }
  function renderHolomem() {
    const prods = Object.entries(H.D.productions).sort((a, b) => a[1].order - b[1].order);
    const talents = Object.entries(H.talents).sort((a, b) => a[1].order - b[1].order);
    const mode = H.progress.boardAutoMode || "leader";
    return `<div class="toolbar"><span>${esc(tx("setAllRanks"))}</span>
        <input class="input" id="all-rank" type="number" min="1" max="50" value="20" style="width:80px">
        <button class="icon-btn" id="apply-all-rank">OK</button>
        <span>${esc(tx("dream"))}</span><input class="input" id="dream" type="number" min="1" max="200" value="${B.playerLevel(H.progress)}" style="width:80px">
        <span>${esc(tx("autoMode"))}</span>
        <span class="seg">${["leader", "member", "support"].map((m) => `<button data-automode="${m}" aria-pressed="${mode === m}">${esc(tx("auto" + m[0].toUpperCase() + m.slice(1)).replace(/^[^:：]*[:：]\s*/, ""))}</button>`).join("")}</span></div>
      ${prods.map(([pid, p]) => `<h3>${esc(L(p.name))}</h3><div class="rank-grid">` + talents.filter(([, t]) => t.production === pid).map(([chr, t]) => {
        const r = H.progress.ranks[chr] || 1;
        return `<div class="rank-card" data-chr="${esc(chr)}">
          <div class="rank-head"><span class="avatar" style="background:linear-gradient(135deg,${esc(t.color)},${esc(t.color2)})">${esc(L(t.short).slice(0, 2))}</span>
            <div><strong>${esc(L(t.name))}</strong><div class="small muted rank-info">${rankInfo(chr)}</div></div></div>
          <div class="rank-ctl"><button class="icon-btn" data-rank="-1">−</button>
            <input type="range" min="1" max="50" value="${r}" data-act="rank">
            <button class="icon-btn" data-rank="1">+</button></div>
          <button class="icon-btn" data-board="${esc(chr)}">${esc(tx("editBoard"))}</button>
        </div>`;
      }).join("") + `</div>`).join("")}`;
  }

  // Board editor modal
  let boardChr = null;
  const TILE_ICON = { leader: "L", card: "M", all_member: "S", content: "♪", connection: "·" };
  function tileLabel(t) {
    const e = t.eff;
    if (!e) return TILE_ICON[t.type] || "";
    const map = { performance_up: "P", technique_up: "T", sense_up: "S", all_parameter_up: "All", performance_up_permil_up: "P%", technique_up_permil_up: "T%",
      sense_up_permil_up: "S%", all_parameter_up_permil_up: "All%", all_parameter_up_for_character_grouping: "G",
      live_active_skill_effect_up_permil_up: "SE", live_active_skill_activation_probability_up_permil_up: "Rt", live_active_skill_cool_time_shorten_permil_up: "CT",
      live_score_bonus_add_permil_up_by_music_skill_tree_character_and_music_singer_type: "♪" };
    return map[e.type] || (TILE_ICON[t.type] || "·");
  }
  function openBoard(chr) { boardChr = chr; drawBoard(); }
  function saveBoard(set) {
    H.progress.board[boardChr] = [...set];
    H.saveProgress();
  }
  function drawBoard() {
    const chr = boardChr;
    const root2 = document.getElementById("modal-root");
    if (!chr) { root2.innerHTML = ""; return; }
    const tl = H.talents[chr];
    const b = B.tilesFor(chr);
    const st = boardState(chr);
    const xs = b.list.map((t) => t.x), ys = b.list.map((t) => t.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const cells = b.list.map((t) => {
      const on = st.set.has(t.k);
      const can = !on && B.canUnlock(H.progress, chr, st.set, t.k);
      const title = (t.eff ? B.effectText(t.eff, chr) : t.type) + ` · ${tx("cost")} ${t.cost}` + (t.lvl ? ` · ${tx("needDream")} ${t.lvl}` : "") + (t.eff && !t.eff.live ? ` · ${tx("noLive")}` : "");
      return `<button class="tile-node t-${t.type} ${on ? "on" : can ? "can" : ""}" data-tile="${esc(t.k)}" title="${esc(title)}"
        style="grid-column:${t.x - minX + 1};grid-row:${maxY - t.y + 1}">${esc(tileLabel(t))}${t.grade > 1 ? "<i>★★</i>" : ""}</button>`;
    }).join("");
    const eff = B.effects(chr, st.set);
    root2.innerHTML = `<div class="modal-backdrop" id="bd-back"><div class="modal" role="dialog" aria-modal="true" style="max-width:1100px">
      <div class="modal-head"><span class="avatar" style="background:linear-gradient(135deg,${esc(tl.color)},${esc(tl.color2)})">${esc(L(tl.short).slice(0, 2))}</span>
        <strong>${esc(L(tl.name))}</strong><span class="spacer"></span>
        <button class="icon-btn" id="bd-close">✕</button></div>
      <div style="padding:12px 16px">
        <div class="toolbar">
          <span>${esc(tx("rank"))}</span><button class="icon-btn" data-bdrank="-1">−</button><b>${H.progress.ranks[chr] || 1}</b><button class="icon-btn" data-bdrank="1">+</button>
          <span>${esc(tx("points"))}: <b>${st.pts}</b></span><span>${esc(tx("ptsLeft"))}: <b>${st.left}</b></span><span>${esc(tx("tiles"))}: <b>${st.tiles}</b></span>
          <span class="pill ${st.custom ? "on" : ""}">${esc(st.custom ? tx("custom") : tx("autoState"))}</span>
          <button class="icon-btn" data-bdauto="leader">${esc(tx("autoLeader"))}</button>
          <button class="icon-btn" data-bdauto="member">${esc(tx("autoMember"))}</button>
          <button class="icon-btn" data-bdauto="support">${esc(tx("autoSupport"))}</button>
          <button class="icon-btn" id="bd-reset">${esc(tx("reset"))}</button>
        </div>
        <p class="small muted">${esc(tx("boardHelp"))}<br>${esc(tx("legend"))}</p>
        <div class="board-wrap"><div class="board-grid" style="grid-template-columns:repeat(${maxX - minX + 1},34px);grid-template-rows:repeat(${maxY - minY + 1},34px)">${cells}</div></div>
        <h3>${esc(tx("totals"))}</h3>
        <ul class="board-eff">${eff.map((e) => `<li><span class="pill">${esc(e.node)}</span> ${esc(B.effectText(e, chr))}</li>`).join("") || "<li class='muted'>—</li>"}</ul>
      </div></div></div>`;
  }
  document.getElementById("modal-root").addEventListener("click", (e) => {
    if (!boardChr) return;
    if (e.target.id === "bd-back" || e.target.closest("#bd-close")) { boardChr = null; drawBoard(); render(); return; }
    const t = e.target.closest("[data-tile]");
    const st = boardState(boardChr);
    if (t) {
      const k = t.dataset.tile;
      if (k === B.ROOT) return;
      if (st.set.has(k)) saveBoard(B.lockTile(boardChr, st.set, k));
      else if (B.canUnlock(H.progress, boardChr, st.set, k)) { st.set.add(k); saveBoard(st.set); }
      drawBoard();
      return;
    }
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.bdauto) { saveBoard(B.autoSetup(H.progress, boardChr, b.dataset.bdauto, st.custom ? [...st.set] : [B.ROOT])); drawBoard(); }
    else if (b.id === "bd-reset") { delete H.progress.board[boardChr]; H.progress.board[boardChr] = [B.ROOT]; H.saveProgress(); drawBoard(); }
    else if (b.dataset.bdrank) {
      H.progress.ranks[boardChr] = Math.max(1, Math.min(50, (H.progress.ranks[boardChr] || 1) + Number(b.dataset.bdrank)));
      H.saveProgress(); drawBoard();
    }
  });

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
    rankEl.querySelector(".rank-info").innerHTML = rankInfo(chr);
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
    if (el.id === "dream") { H.progress.playerLevel = Math.max(1, Number(el.value) || 30); H.saveProgress(); render(); return; }
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
    else if (b.dataset.board) openBoard(b.dataset.board);
    else if (b.dataset.automode) { H.progress.boardAutoMode = b.dataset.automode; H.saveProgress(); render(); }
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
