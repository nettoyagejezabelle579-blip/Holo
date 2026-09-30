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
      boardHelp: "Tap a tile to see it, then Unlock (it must touch an unlocked tile, and needs points, materials and Dream Rank) or Lock. Auto setup spends the points left.",
      custom: "set up", autoState: "not set up", boardNote: "Boards are only what you set up here (points are never spent automatically). Enter the tiles you have in game, or leave them empty and let Team Optimizer → Plan my boards tell you how to spend the points for a unit.", totals: "Board effects", legend: "Red: Leader · Blue: Member · Green: Support · Yellow: Song · Grey: Connect",
      needDream: "Needs Dream Rank", cost: "Cost", noLive: "no effect on Live score",
      tapTile: "Tap a tile to see its effect, cost and materials.", unlock: "Unlock", lock: "Lock", cantUnlock: "needs an unlocked neighbour, enough points and Dream Rank",
      connectHelp: "Place a ★4/★5 card here: its Connect effect multiplies the board tiles in its range.", connectCard: "Card on this Connect tile",
      connectOwned: "Only owned ★4/★5 cards that are not on another board are listed.", rankTable: "Rank → points table",
      expTotal: "Total EXP", ptsGain: "Points gained", ptsTotal: "Total points", nextRank: "next rank",
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
      boardHelp: "マスをタップして確認し、解放（解放済みマスに隣接・Pt・素材・ドリームランクが必要）または解除します。自動設置は残りPtを使います。",
      custom: "設定済み", autoState: "未設定", boardNote: "ボードはここで設定した内容のみ使います（Ptは自動で使いません）。ゲーム内の解放マスを入力するか、空のままにしてユニット最適化 → ボードを計画 でユニットに合わせたPtの使い方を確認してください。", totals: "ボード効果", legend: "赤：リーダー・青：メンバー・緑：サポート・黄：楽曲・灰：コネクト",
      needDream: "必要ドリームランク", cost: "コスト", noLive: "ライブスコアに影響なし",
      tapTile: "マスをタップすると効果・コスト・素材を表示します。", unlock: "解放", lock: "解除", cantUnlock: "隣接マスの解放・Pt・ドリームランクが必要",
      connectHelp: "★4/★5カードを配置すると、コネクト効果で範囲内のマス効果がアップします。", connectCard: "このコネクトマスのカード",
      connectOwned: "他のボードに配置していない所持★4/★5カードのみ表示します。", rankTable: "ランク別Pt表",
      expTotal: "累計EXP", ptsGain: "獲得Pt", ptsTotal: "累計Pt", nextRank: "次のランク",
    },
    zh: {
      title: "遊戲進度資料", intro: "請輸入你在遊戲中的持有狀況。隊伍最佳化只會使用這裡的卡片、等級、綻放與Rank。",
      tabCards: "卡片", tabHolomem: "Holo成員", tabMemories: "回憶卡", tabBackup: "備份",
      owned: "已持有", level: "等級", bloom: "綻放", lb: "特訓", search: "以名稱搜尋",
      onlyOwned: "僅已持有", all: "全部", allMax: "已持有卡片設為最高等級", markStar3: "持有全部★3", clearAll: "清除所有卡片",
      rank: "Holo成員Rank", board: "面板", boardAuto: "依Rank自動", boardManual: "手動 %", setAllRanks: "將所有Rank設為",
      memories: "持有的回憶卡", memoriesHelp: "回憶卡架上的回憶卡可提升所有成員的能力。",
      bonus: "隊伍能力", upgrade: "成員強化加成", upgradeHelp: "每張Lv20以上的持有卡片都會加算（上限50%）。",
      export: "下載備份", import: "從檔案還原", copy: "複製為文字", paste: "從文字匯入",
      pasteHere: "在此貼上備份文字", imported: "已匯入", copied: "已複製", confirmClear: "要清除所有已持有卡片嗎？",
      summaryCards: "卡片", summaryHolomem: "已設定Rank", summaryMem: "回憶卡", summaryUpgrade: "成員強化加成",
      points: "面板Pt", confirmMark: "要將全部★3卡片設為已持有（最高等級）嗎？",
      editBoard: "編輯面板", tiles: "解鎖數量", ptsLeft: "剩餘Pt", dream: "夢幻Rank", autoMode: "未編輯成員的自動設置",
      autoLeader: "自動：隊長", autoMember: "自動：成員", autoSupport: "自動：支援", reset: "重置", close: "關閉",
      boardHelp: "點選格子查看後，可解鎖（需與已解鎖格子相鄰，並需Pt、素材與夢幻Rank）或取消。自動設置會使用剩餘Pt。",
      custom: "已設定", autoState: "未設定", boardNote: "面板只使用你在此設定的內容（不會自動使用Pt）。請輸入遊戲中已解鎖的格子，或保持空白，並在隊伍最佳化 → 規劃面板 中查看針對隊伍的Pt分配方式。", totals: "面板效果", legend: "紅：隊長・藍：成員・綠：支援・黃：樂曲・灰：協力",
      needDream: "所需夢幻Rank", cost: "消耗", noLive: "不影響Live分數",
      tapTile: "點選格子即可查看效果、消耗與素材。", unlock: "解鎖", lock: "取消", cantUnlock: "需要相鄰格子已解鎖、足夠的Pt與夢幻Rank",
      connectHelp: "放置★4/★5卡片後，協力效果會提升範圍內格子的效果。", connectCard: "此協力欄位的卡片",
      connectOwned: "只列出未放在其他面板上的已持有★4/★5卡片。", rankTable: "各Rank面板Pt表",
      expTotal: "累計EXP", ptsGain: "獲得Pt", ptsTotal: "累計Pt", nextRank: "下一個Rank",
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
        const txt = [c.title.en, c.title.ja, c.title.zh, tl.name.en, tl.name.ja, tl.short.en, tl.short.ja].join(" ").toLowerCase();
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
    return { set, pts, left: pts - B.spent(chr, set), tiles: set.size - 1, custom: B.isSet(H.progress, chr) };
  }
  function rankInfo(chr) {
    const r = H.progress.ranks[chr] || 1;
    const b = boardState(chr);
    return `${esc(tx("rank"))} <b>${r}</b> · ${esc(tx("tiles"))} <b>${b.tiles}</b> · ${esc(tx("ptsLeft"))} ${b.left} · <span class="pill ${b.custom ? "on" : ""}">${esc(b.custom ? tx("custom") : tx("autoState"))}</span>`;
  }
  function renderHolomem() {
    const prods = Object.entries(H.D.productions).sort((a, b) => a[1].order - b[1].order);
    const talents = Object.entries(H.talents).sort((a, b) => a[1].order - b[1].order);
    return `<div class="toolbar"><span>${esc(tx("setAllRanks"))}</span>
        <input class="input" id="all-rank" type="number" min="1" max="50" value="20" style="width:80px">
        <button class="icon-btn" id="apply-all-rank">OK</button>
        <span>${esc(tx("dream"))}</span><input class="input" id="dream" type="number" min="1" max="200" value="${B.playerLevel(H.progress)}" style="width:80px">
      </div>
      <p class="small muted">${esc(tx("boardNote"))}</p>
      ${prods.map(([pid, p]) => `<h3>${esc(L(p.name))}</h3><div class="rank-grid">` + talents.filter(([, t]) => t.production === pid).map(([chr, t]) => {
        const r = H.progress.ranks[chr] || 1;
        return `<div class="rank-card" data-chr="${esc(chr)}">
          <div class="rank-head">${H.avatarHTML(chr, "lg")}
            <div><strong>${esc(L(t.name))}</strong><div class="small muted rank-info">${rankInfo(chr)}</div></div></div>
          <div class="rank-ctl"><button class="icon-btn" data-rank="-1">−</button>
            <input type="range" min="1" max="50" value="${r}" data-act="rank">
            <button class="icon-btn" data-rank="1">+</button></div>
          <button class="icon-btn" data-board="${esc(chr)}">${esc(tx("editBoard"))}</button>
        </div>`;
      }).join("") + `</div>`).join("")}`;
  }

  // Board editor modal
  let boardChr = null, selTile = null, showRanks = false;
  const TYPE_NAME = { en: { leader: "Leader tile", card: "Member tile", all_member: "Support tile", content: "Song tile", connection: "Connect tile" },
    ja: { leader: "リーダー効果", card: "メンバー効果", all_member: "サポート効果", content: "楽曲効果", connection: "コネクト" },
    zh: { leader: "隊長效果", card: "成員效果", all_member: "支援效果", content: "樂曲效果", connection: "協力" } };
  function tileIcon(t) {
    const [g, pct] = window.HoloBoardView.glyph(t);
    return `<span class="bv-t inline on t-${t.type} ${t.grade > 1 ? "big" : ""}"><b class="${g.length > 2 ? "sm" : ""}">${esc(g)}</b>${pct ? "<em>%</em>" : ""}</span>`;
  }
  function openBoard(chr) { boardChr = chr; selTile = null; drawBoard(); }
  function saveBoard(set) {
    H.progress.board[boardChr] = [...set];
    // Connect cards on tiles that got locked are taken off.
    const con = (H.progress.connect || {})[boardChr];
    if (con) for (const k in con) if (!set.has(k)) delete con[k];
    H.saveProgress();
  }
  function tileMaterials(t) {
    const raw = window.HoloBoard.tileByKey[t.k];
    const v = raw.var.find((x) => x.chrs && x.chrs.includes(boardChr)) || raw.var.find((x) => !x.chrs) || raw.var[0];
    return (v && v.mat) || [];
  }
  function detailPanel(chr, st) {
    const b = B.tilesFor(chr);
    const t = selTile && b.byKey[selTile];
    if (!t) return `<div class="tile-detail muted small">${esc(tx("tapTile"))}</div>`;
    const on = st.set.has(t.k);
    const can = B.canUnlock(H.progress, chr, st.set, t.k);
    const mult = B.connectMultipliers(H.progress, chr, st.set).get(t.k);
    const mats = tileMaterials(t);
    let body = `<div class="tile-detail"><div class="row">${tileIcon(t)}
      <div><span class="pill">${esc((TYPE_NAME[H.lang] || TYPE_NAME.en)[t.type])}</span> ${"★".repeat(t.grade)}<br>
      <b>${esc(t.eff ? B.effectText(t.eff, chr) : t.type === "connection" ? tx("connectHelp") : "—")}</b>
      ${mult && mult > 1 ? `<br><span class="small" style="color:var(--accent)">Connect +${Math.round((mult - 1) * 100)}% → ${esc(B.effectText(Object.assign({}, t.eff, { v: t.eff.v * mult }), chr))}</span>` : ""}
      ${t.eff && !t.eff.live ? `<br><span class="small muted">${esc(tx("noLive"))}</span>` : ""}</div></div>
      <dl class="kv"><dt>${esc(tx("points"))}</dt><dd>${t.cost}</dd>
        ${mats.map(([id, q]) => `<dt>${esc(L((G.materials || {})[id] || { en: id }))}</dt><dd>${fmt(q)}</dd>`).join("")}
        ${t.lvl ? `<dt>${esc(tx("needDream"))}</dt><dd>${t.lvl}</dd>` : ""}</dl>
      ${t.k === B.ROOT ? "" : on ? `<button class="icon-btn" id="bd-lock">${esc(tx("lock"))}</button>` :
        `<button class="icon-btn" id="bd-unlock" ${can ? "" : "disabled"}>${esc(tx("unlock"))}</button> ${can ? "" : `<span class="small muted">${esc(tx("cantUnlock"))}</span>`}`}`;
    if (t.type === "connection" && on) {
      const placed = B.placedCards(H.progress);
      const cur = ((H.progress.connect || {})[chr] || {})[t.k] || "";
      const options = Object.keys(H.progress.cards).filter((id) => G.connect[id] && (!placed[id] || id === cur))
        .sort((x, y) => (G.connect[y].v[0] - G.connect[x].v[0]) || H.talents[H.cardById[x].chr].order - H.talents[H.cardById[y].chr].order);
      body += `<h4 style="margin:12px 0 6px">${esc(tx("connectCard"))}</h4>
        <select class="select" id="bd-connect" style="width:100%"><option value="">—</option>${options.map((id) => {
          const c = H.cardById[id];
          return `<option value="${esc(id)}" ${id === cur ? "selected" : ""}>${H.stars(c.rarity)} ${esc(L(H.talents[c.chr].short))} · ${esc(L(c.title))} · ${esc(G.connect[id].area)} +${G.connect[id].v[B.connectLevel(H.progress, id) - 1] / 10}%</option>`;
        }).join("")}</select>
        ${cur ? `<p class="small">${esc(H.plain(L(G.connect[cur].text[B.connectLevel(H.progress, cur) - 1])))}</p>` : `<p class="small muted">${esc(tx("connectOwned"))}</p>`}`;
    }
    return body + `</div>`;
  }
  function rankTableHTML(chr) {
    const r = H.progress.ranks[chr] || 1;
    return `<div class="table-wrap" style="max-height:260px;margin-bottom:10px"><table class="data"><thead><tr><th class="num">${esc(tx("rank"))}</th><th class="num">${esc(tx("expTotal"))}</th>
      <th class="num">${esc(tx("ptsGain"))}</th><th class="num">${esc(tx("ptsTotal"))}</th></tr></thead><tbody>${B.rankTable().map((x) =>
      `<tr ${x.rank === r ? 'style="background:var(--accent-soft);font-weight:700"' : ""}><td class="num">${x.rank}</td><td class="num">${x.exp}</td><td class="num">${x.points ? "+" + x.points : "—"}</td><td class="num">${x.total}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function drawBoard() {
    const chr = boardChr;
    const root2 = document.getElementById("modal-root");
    if (!chr) { root2.innerHTML = ""; return; }
    const tl = H.talents[chr];
    const b = B.tilesFor(chr);
    const st = boardState(chr);
    const con = (H.progress.connect || {})[chr] || {};
    let foot = new Set();
    for (const k in con) if (st.set.has(k)) B.connectFootprint(chr, k, con[k]).forEach((x) => foot.add(x));
    if (selTile && b.byKey[selTile] && b.byKey[selTile].type === "connection" && con[selTile]) foot = new Set(B.connectFootprint(chr, selTile, con[selTile]));
    const view = window.HoloBoardView.html(chr, { set: st.set, connect: con, foot, sel: selTile, interactive: true, key: "edit-" + chr,
      can: (k) => B.canUnlock(H.progress, chr, st.set, k), height: "min(62vh, 640px)" });
    const eff = B.effects(chr, st.set, H.progress);
    const r = H.progress.ranks[chr] || 1;
    const next = B.rankTable()[r];
    root2.innerHTML = `<div class="modal-backdrop" id="bd-back"><div class="modal" role="dialog" aria-modal="true" style="max-width:1200px">
      <div class="modal-head">${H.avatarHTML(chr)}
        <strong>${esc(L(tl.name))}</strong><span class="spacer"></span>
        <button class="icon-btn" id="bd-close">✕</button></div>
      <div style="padding:12px 16px">
        <div class="toolbar">
          <span>${esc(tx("rank"))}</span><button class="icon-btn" data-bdrank="-1">−</button><b>${r}</b><button class="icon-btn" data-bdrank="1">+</button>
          <span>${esc(tx("points"))}: <b>${st.pts}</b>${next ? ` <span class="small muted">(${esc(tx("nextRank"))} +${next.points})</span>` : ""}</span>
          <span>${esc(tx("ptsLeft"))}: <b>${st.left}</b></span><span>${esc(tx("tiles"))}: <b>${st.tiles}</b></span>
          <span class="pill ${st.custom ? "on" : ""}">${esc(st.custom ? tx("custom") : tx("autoState"))}</span>
          <button class="icon-btn" id="bd-ranks">${esc(tx("rankTable"))}</button>
          <button class="icon-btn" data-bdauto="leader">${esc(tx("autoLeader"))}</button>
          <button class="icon-btn" data-bdauto="member">${esc(tx("autoMember"))}</button>
          <button class="icon-btn" data-bdauto="support">${esc(tx("autoSupport"))}</button>
          <button class="icon-btn" id="bd-reset">${esc(tx("reset"))}</button>
        </div>
        ${showRanks ? rankTableHTML(chr) : ""}
        <p class="small muted">${esc(tx("boardHelp"))}<br>${esc(tx("legend"))}</p>
        <div class="board-layout">
          <div>${view}</div>
          ${detailPanel(chr, st)}
        </div>
        <h3>${esc(tx("totals"))}</h3>
        <ul class="board-eff">${eff.map((e) => `<li><span class="pill">${esc((TYPE_NAME[H.lang] || TYPE_NAME.en)[e.node] || e.node)}</span> ${esc(B.effectText(e, chr))}</li>`).join("") || "<li class='muted'>—</li>"}</ul>
      </div></div></div>`;
    window.HoloBoardView.init(root2);
  }
  document.getElementById("modal-root").addEventListener("click", (e) => {
    if (!boardChr) return;
    if (e.target.id === "bd-back" || e.target.closest("#bd-close")) { boardChr = null; drawBoard(); render(); return; }
    const t = e.target.closest("[data-tile]");
    const st = boardState(boardChr);
    if (t) { selTile = t.dataset.tile; drawBoard(); return; }
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.id === "bd-unlock" && selTile && B.canUnlock(H.progress, boardChr, st.set, selTile)) { st.set.add(selTile); saveBoard(st.set); }
    else if (b.id === "bd-lock" && selTile) saveBoard(B.lockTile(boardChr, st.set, selTile));
    else if (b.dataset.bdauto) saveBoard(new Set(B.autoSetup(H.progress, boardChr, b.dataset.bdauto, st.custom ? [...st.set] : [B.ROOT])));
    else if (b.id === "bd-reset") saveBoard(new Set([B.ROOT]));
    else if (b.id === "bd-ranks") showRanks = !showRanks;
    else if (b.dataset.bdrank) {
      H.progress.ranks[boardChr] = Math.max(1, Math.min(50, (H.progress.ranks[boardChr] || 1) + Number(b.dataset.bdrank)));
      H.saveProgress();
    } else return;
    drawBoard();
  });
  document.getElementById("modal-root").addEventListener("change", (e) => {
    if (!boardChr || e.target.id !== "bd-connect") return;
    H.progress.connect = H.progress.connect || {};
    const con = H.progress.connect[boardChr] = H.progress.connect[boardChr] || {};
    if (e.target.value) con[selTile] = e.target.value; else delete con[selTile];
    H.saveProgress();
    drawBoard();
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
