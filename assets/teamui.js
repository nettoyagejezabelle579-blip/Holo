/* Shared UI for the Team Optimizer and Team Details pages. */
(function () {
  "use strict";
  const H = window.Holo;
  const S = window.HoloSim;
  const G = window.HOLO_GAME;
  const { L, esc, fmt } = H;

  const TX = {
    en: {
      easy: "Easy", normal: "Normal", hard: "Hard", expert: "Expert", song: "Song", difficulty: "Difficulty",
      searchSong: "Search songs or singers…", leader: "Leader", members: "Members", noOutfit: "no outfit skill",
      unitScore: "Unit Score", estScore: "Estimated score", scoreRank: "Score rank", pick: "Choose cards",
      searchCard: "Search cards…", done: "Done", clear: "Clear", slot: "Slot", uptime: "Active uptime",
      specialAt: "Special at", perf: "P", tech: "T", sense: "S", total: "Total", synthetic: "no chart data: evenly spaced notes",
      notes: "notes", openDetails: "Open in Team Details", ownedOnly: "Owned cards only",
    },
    ja: {
      easy: "EASY", normal: "NORMAL", hard: "HARD", expert: "EXPERT", song: "楽曲", difficulty: "難易度",
      searchSong: "楽曲名・歌唱で検索…", leader: "リーダー", members: "メンバー", noOutfit: "衣装スキルなし",
      unitScore: "ユニットスコア", estScore: "推定スコア", scoreRank: "スコアランク", pick: "カードを選択",
      searchCard: "カードを検索…", done: "決定", clear: "クリア", slot: "枠", uptime: "アクティブ発動率",
      specialAt: "スペシャル発動", perf: "P", tech: "T", sense: "S", total: "総合", synthetic: "譜面データなし：ノーツを均等配置",
      notes: "ノーツ", openDetails: "編成詳細で開く", ownedOnly: "所持カードのみ",
    },
    zh: {
      easy: "Easy", normal: "Normal", hard: "Hard", expert: "Expert", song: "樂曲", difficulty: "難度",
      searchSong: "搜尋樂曲或演唱者…", leader: "隊長", members: "成員", noOutfit: "無服裝技能",
      unitScore: "隊伍分數", estScore: "預估分數", scoreRank: "分數評價", pick: "選擇卡片",
      searchCard: "搜尋卡片…", done: "確定", clear: "清除", slot: "位置", uptime: "主動技能發動率",
      specialAt: "特殊技能發動", perf: "表", tech: "技", sense: "品", total: "綜合", synthetic: "無譜面資料：音符平均分布",
      notes: "音符", openDetails: "預覽細節", ownedOnly: "僅限已持有卡片",
    },
  };
  const tx = (k) => (TX[H.lang] && TX[H.lang][k]) || TX.en[k];
  const DIFFS = ["easy", "normal", "hard", "expert"];

  function songsSorted() {
    return G.songs.slice().sort((a, b) => b.start - a.start || a.order - b.order);
  }
  function songLabel(s) {
    return `${L(s.title)} — ${L(s.singer) || ""}`;
  }

  // A searchable song list with covers. Returns HTML; call bindSongPicker(root, id, onChange) after insertion.
  function songPickerHTML(id, songId, diff, opts) {
    opts = opts || {};
    const list = songsSorted();
    const cur = S.songById[songId];
    return `<div class="song-picker" id="${id}">
      ${cur ? `<div class="song-current">${H.jacketHTML(cur, "sm")}<div><b>${esc(L(cur.title))}</b><br><span class="muted small">${esc(L(cur.singer))}</span></div></div>` : ""}
      <input class="input" type="search" data-role="q" placeholder="${esc(tx("searchSong"))}">
      <div class="song-list" data-role="list" style="max-height:${(opts.size || 8) * 44}px">${list.map((s) =>
        `<button class="song-opt ${s.id === songId ? "on" : ""}" data-song="${esc(s.id)}">${H.jacketHTML(s, "xs")}
          <span><b>${esc(L(s.title))}${S.chartIndex[s.id] ? "" : " *"}</b><br><span class="muted small">${esc(L(s.singer))}</span></span></button>`).join("")}</div>
      ${opts.noDiff ? "" : `<div class="seg" data-role="diff">${DIFFS.map((d) => {
        const lv = cur && cur.diff[d] ? cur.diff[d].lv : "";
        return `<button data-diff="${d}" aria-pressed="${d === diff}">${esc(tx(d))} ${lv}</button>`;
      }).join("")}</div>`}
    </div>`;
  }
  function bindSongPicker(root, id, onChange) {
    const el = root.querySelector("#" + id);
    const q = el.querySelector('[data-role="q"]');
    const list = el.querySelector('[data-role="list"]');
    const on = list.querySelector(".song-opt.on");
    if (on) list.scrollTop = on.offsetTop - list.offsetTop - 40;
    q.addEventListener("input", () => {
      const v = q.value.trim().toLowerCase();
      for (const o of list.children) {
        const s = S.songById[o.dataset.song];
        const txt = (s.title.en + " " + s.title.ja + " " + (s.title.zh || "") + " " + s.singer.en + " " + s.singer.ja + " " + (s.singer.zh || "")).toLowerCase();
        o.hidden = !!v && !txt.includes(v);
      }
    });
    el.addEventListener("click", (e) => {
      const so = e.target.closest("button[data-song]");
      if (so) return onChange({ song: so.dataset.song });
      const b = e.target.closest("button[data-diff]");
      if (b) onChange({ diff: b.dataset.diff });
    });
  }

  // Modal card picker. options: {max, selected: [ids], pool: [ids]} -> Promise<ids|null>
  function pickCards(options) {
    return new Promise((resolve) => {
      const root = document.getElementById("modal-root");
      const sel = new Set(options.selected || []);
      let q = "";
      const draw = () => {
        const list = options.pool.map((id) => H.cardById[id]).filter((c) => {
          if (!q) return true;
          const tl = H.talents[c.chr];
          return [c.title.en, c.title.ja, c.title.zh, tl.name.en, tl.name.ja, tl.short.en].join(" ").toLowerCase().includes(q);
        }).sort((a, b) => H.talents[a.chr].order - H.talents[b.chr].order || b.rarity - a.rarity);
        root.innerHTML = `<div class="modal-backdrop" id="pk-back"><div class="modal" role="dialog" aria-modal="true">
          <div class="modal-head"><strong>${esc(tx("pick"))} (${sel.size}/${options.max})</strong>
            <input class="input" id="pk-q" type="search" placeholder="${esc(tx("searchCard"))}" value="${esc(q)}" style="flex:1;margin:0 8px">
            <button class="icon-btn" id="pk-clear">${esc(tx("clear"))}</button>
            <button class="icon-btn" id="pk-done" style="background:var(--accent);color:#fff">${esc(tx("done"))}</button></div>
          <div class="grid compact" style="padding:12px">${list.map((c) => `<article class="tile ${sel.has(c.id) ? "picked" : ""}" data-pick="${esc(c.id)}">
            ${H.artHTML(c, { noNew: true })}<div class="tile-body"><div class="tile-title">${esc(L(c.title))}</div></div></article>`).join("")}</div>
        </div></div>`;
        const qi = root.querySelector("#pk-q");
        qi.focus();
        qi.setSelectionRange(q.length, q.length);
      };
      draw();
      const close = (val) => { root.innerHTML = ""; root.onclick = null; root.oninput = null; resolve(val); };
      root.oninput = (e) => { if (e.target.id === "pk-q") { q = e.target.value.trim().toLowerCase(); draw(); } };
      root.onclick = (e) => {
        if (e.target.id === "pk-back") return close(null);
        if (e.target.closest("#pk-done")) return close([...sel]);
        if (e.target.closest("#pk-clear")) { sel.clear(); return draw(); }
        const t = e.target.closest("[data-pick]");
        if (!t) return;
        const id = t.dataset.pick;
        if (sel.has(id)) sel.delete(id);
        else {
          if (sel.size >= options.max) return;
          const chr = H.cardById[id].chr;
          if (options.distinct !== false) for (const x of sel) if (H.cardById[x].chr === chr) sel.delete(x);
          sel.add(id);
        }
        draw();
      };
    });
  }

  function scoreRank(song, score) {
    const rows = (G.scoreRanks[song.rank] || G.scoreRanks["live_score_rank-s001"] || []).map(([s, r]) => [s, r]);
    return S.rankFor(rows, score);
  }

  function leaderLabel(leader) {
    if (!leader) return "—";
    const tl = H.talents[leader.chr];
    if (leader.cardId) {
      const c = H.cardById[leader.cardId];
      return `${L(tl.name)} · ${L(c.leader ? c.leader.name : c.title)}`;
    }
    return `${L(tl.name)} (${tx("noOutfit")})`;
  }

  // Compact visual of a unit: leader + 5 members.
  function teamHTML(leader, ids, extra) {
    extra = extra || {};
    const lc = leader && leader.cardId ? H.cardById[leader.cardId] : null;
    const tl = leader ? H.talents[leader.chr] : null;
    const leadArt = lc ? H.artHTML(lc, { noNew: true }) : tl ? `<div class="art" style="--c1:${esc(tl.color)};--c2:${esc(tl.color2)}"><div class="art-name">${esc(L(tl.short))}</div></div>` : "";
    return `<div class="team-row">
      <div class="team-slot leader"><div class="slot-label">${esc(tx("leader"))}</div>${leadArt}
        <div class="small"><b>${esc(tl ? L(tl.name) : "—")}</b><br><span class="muted">${esc(lc && lc.leader ? L(lc.leader.name) : tx("noOutfit"))}</span></div></div>
      ${ids.map((id, i) => {
        const c = H.cardById[id];
        const own = H.progress.cards[id];
        const st = extra.stats ? extra.stats[i] : null;
        return `<div class="team-slot"><div class="slot-label">${i + 1}</div><a href="${document.body.dataset.base}/cards/index.html#${esc(id)}">${H.artHTML(c, { noNew: true })}</a>
          <div class="small"><b>${esc(L(c.title))}</b><br><span class="muted">${esc(L(H.talents[c.chr].name))}</span><br>
          <span class="muted">${own ? `Lv ${own.lv} · ✿${own.bloom}` : extra.hypo && extra.hypo[id] ? `Lv ${extra.hypo[id].lv} · ✿${extra.hypo[id].bloom}` : ""}</span>
          ${st ? `<br><span class="muted">Σ ${fmt(Math.round(st[0] + st[1] + st[2]))}</span>` : ""}</div></div>`;
      }).join("")}
    </div>`;
  }

  const BTX = {
    en: { member: "Member stats", board: "Holomem board", passive: "Passive skills", memory: "Memories", upgrade: "Member upgrade", outfit: "Outfit skill",
      active: "Active skills", special: "Special skills", songBonus: "Board song bonus", event: "Event card bonus", outfitSkill: "Outfit skill", activeRow: "Active", overlap: "Overlap",
      timelineNote: "Every active window is drawn (as if every check succeeds); numbers mark special skills." },
    ja: { member: "メンバー能力", board: "ホロメンボード加算", passive: "パッシブスキル", memory: "メモリー加算", upgrade: "メンバー育成加算", outfit: "衣装スキル",
      active: "アクティブスキル", special: "スペシャルスキル", songBonus: "ボード楽曲加算", event: "イベント特効", outfitSkill: "衣装スキル", activeRow: "アクティブ", overlap: "重複",
      timelineNote: "アクティブの発動枠をすべて表示（毎回発動した場合）。数字はスペシャルスキル。" },
    zh: { member: "成員能力", board: "Holo成員面板加成", passive: "被動技能", memory: "回憶卡加成", upgrade: "成員強化加成", outfit: "服裝技能",
      active: "主動技能", special: "特殊技能", songBonus: "面板個人樂曲加成", event: "活動加成", outfitSkill: "服裝技能", activeRow: "Active", overlap: "Overlap",
      timelineNote: "顯示所有主動技能發動區間（假設每次都發動）。數字為特殊技能。" },
  };
  const btx = (k) => (BTX[H.lang] && BTX[H.lang][k]) || BTX.en[k];

  // Unit Score breakdown + skill percentages, like the in-game result.
  function breakdownHTML(d, leader) {
    const p = d.parts;
    const lc = leader && leader.cardId ? H.cardById[leader.cardId] : null;
    const item = (k, v, pct) => `<span><b>${esc(btx(k))}</b> ${pct ? (v >= 0 ? "+" : "") + (v * 100).toFixed(1) + "%" : fmt(Math.round(v))}</span>`;
    return `${lc && lc.leader ? `<div class="outfit-skill"><span class="pill">${esc(btx("outfitSkill"))}</span> <b>${esc(L(lc.leader.name))}</b> — ${H.richText(L(lc.leader.text))}</div>` : ""}
      <div class="breakdown">${item("member", p.member)}${item("board", p.board)}${item("passive", p.passive)}${item("memory", p.memory)}${item("upgrade", p.upgrade)}${item("outfit", p.outfit)}
      ${item("active", d.activePct, true)}${item("special", d.specialPct, true)}${item("songBonus", d.songBonus / 1000, true)}${d.event ? item("event", d.eventBonus, true) : ""}</div>`;
  }

  // Skill timeline: one row per member with its active windows, then which skill leads and how many overlap.
  function timelineHTML(d, ids) {
    const W = 1000, rowH = 22, left = 150, rows = ids.length + 2;
    const H2 = rows * (rowH + 6) + 30;
    const end = d.end;
    const x = (t) => left + (Math.min(t, end) / end) * (W - left - 10);
    const colors = ids.map((id) => H.talents[H.cardById[id].chr].color);
    const win = d.timeline.map((a) => a.checks.map((c) => [c, Math.min(end, c + a.dur), a.i, a.value]));
    let svg = "";
    for (let t = 0; t <= end; t += 10) svg += `<line x1="${x(t)}" x2="${x(t)}" y1="0" y2="${H2 - 22}" class="tl-grid"/><text x="${x(t)}" y="${H2 - 6}" class="tl-axis">${t}s</text>`;
    ids.forEach((id, i) => {
      const y = i * (rowH + 6) + 4;
      svg += `<text x="4" y="${y + 15}" class="tl-label">${esc(L(H.talents[H.cardById[id].chr].name))}</text>`;
      const a = d.timeline.find((z) => z.i === i);
      if (a) for (const [t0, t1] of win[d.timeline.indexOf(a)]) svg += `<rect x="${x(t0)}" y="${y}" width="${Math.max(1, x(t1) - x(t0))}" height="${rowH}" rx="3" fill="${colors[i]}" opacity=".85"/>`;
      const sp = d.specials.find((z) => z.slot === i);
      if (sp) svg += `<rect x="${x(sp.t0)}" y="${y - 2}" width="${Math.max(2, x(sp.t1) - x(sp.t0))}" height="${rowH + 4}" rx="3" fill="none" stroke="var(--star)" stroke-width="2"/><text x="${x(sp.t0) + 3}" y="${y + 15}" class="tl-sp">★${i + 1}</text>`;
    });
    // Active row: the strongest active skill at each moment; overlap row: how many are active.
    const bounds = new Set([0, end]);
    for (const list of win) for (const [a, b] of list) { bounds.add(a); bounds.add(b); }
    const bs = [...bounds].sort((a, b) => a - b);
    const ya = ids.length * (rowH + 6) + 4, yo = ya + rowH + 6;
    svg += `<text x="4" y="${ya + 15}" class="tl-label">${esc(btx("activeRow"))}</text><text x="4" y="${yo + 15}" class="tl-label">${esc(btx("overlap"))}</text>`;
    for (let k = 0; k < bs.length - 1; k++) {
      const t0 = bs[k], t1 = bs[k + 1], mid = (t0 + t1) / 2;
      let best = null, count = 0;
      for (const list of win) for (const [a, b, i, v] of list) if (mid >= a && mid < b) { count++; if (!best || v > best[1]) best = [i, v]; }
      if (best) svg += `<rect x="${x(t0)}" y="${ya}" width="${Math.max(0.5, x(t1) - x(t0))}" height="${rowH}" fill="${colors[best[0]]}"/>`;
      const shade = count === 0 ? "var(--surface)" : count === 1 ? "#cfcfd8" : count === 2 ? "#9a9aa8" : "#66667a";
      svg += `<rect x="${x(t0)}" y="${yo}" width="${Math.max(0.5, x(t1) - x(t0))}" height="${rowH}" fill="${shade}"/>`;
    }
    return `<div class="timeline"><svg viewBox="0 0 ${W} ${H2}" preserveAspectRatio="xMinYMin meet" role="img" aria-label="Skill timeline">${svg}</svg>
      <p class="small muted">${esc(btx("timelineNote"))}</p></div>`;
  }

  // Small read-only board: new tiles ringed green, removed ringed red, Connect cards shown.
  function boardMiniHTML(chr, board) {
    const B = window.HoloBoard;
    const b = B.tilesFor(chr);
    const set = new Set(board.set), added = new Set(board.added), removed = new Set(board.removed);
    const xs = b.list.map((t) => t.x), ys = b.list.map((t) => t.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const cells = b.list.map((t) => {
      const on = set.has(t.k);
      const con = board.connect[t.k];
      const cls = added.has(t.k) ? "added" : removed.has(t.k) ? "removed" : "";
      return `<span class="mini-tile t-${t.type} ${on ? "on" : ""} ${cls}" style="grid-column:${t.x - minX + 1};grid-row:${maxY - t.y + 1}"
        title="${esc(t.eff ? B.effectText(t.eff, chr) : t.type)}">${con && H.hasArt(con) ? H.imgChain(H.cardImageUrls(con, "icon"), "") : ""}</span>`;
    }).join("");
    return `<div class="board-wrap"><div class="mini-board" style="grid-template-columns:repeat(${maxX - minX + 1},14px);grid-template-rows:repeat(${maxY - minY + 1},14px)">${cells}</div></div>`;
  }

  function encodeTeam(state) {
    const p = new URLSearchParams();
    if (state.song) p.set("s", state.song);
    if (state.diff) p.set("d", state.diff);
    if (state.mode) p.set("mode", state.mode);
    if (state.leader) p.set("l", state.leader.chr + (state.leader.cardId ? ":" + state.leader.cardId : ""));
    if (state.members) p.set("m", state.members.join(","));
    return p.toString();
  }
  function decodeTeam(str) {
    const p = new URLSearchParams(str);
    const out = {};
    if (p.get("s")) out.song = p.get("s");
    if (p.get("d")) out.diff = p.get("d");
    if (p.get("mode")) out.mode = p.get("mode");
    if (p.get("l")) { const [chr, cardId] = p.get("l").split(":"); out.leader = { chr, cardId: cardId || null }; }
    if (p.get("m")) out.members = p.get("m").split(",").filter((id) => H.cardById[id]);
    return out;
  }

  window.HoloTeamUI = { boardMiniHTML, breakdownHTML, timelineHTML, tx, DIFFS, songsSorted, songLabel, songPickerHTML, bindSongPicker, pickCards, scoreRank, leaderLabel, teamHTML, encodeTeam, decodeTeam };
})();
