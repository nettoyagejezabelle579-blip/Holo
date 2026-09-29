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
  };
  const tx = (k) => (TX[H.lang] && TX[H.lang][k]) || TX.en[k];
  const DIFFS = ["easy", "normal", "hard", "expert"];

  function songsSorted() {
    return G.songs.slice().sort((a, b) => b.start - a.start || a.order - b.order);
  }
  function songLabel(s) {
    return `${L(s.title)} — ${L(s.singer) || ""}`;
  }

  // A searchable song <select>. Returns HTML; call bindSongPicker(root, id, onChange) after insertion.
  function songPickerHTML(id, songId, diff, opts) {
    opts = opts || {};
    const list = songsSorted();
    return `<div class="song-picker" id="${id}">
      <input class="input" type="search" data-role="q" placeholder="${esc(tx("searchSong"))}">
      <select class="select" data-role="song" size="${opts.size || 8}">${list.map((s) =>
        `<option value="${esc(s.id)}" ${s.id === songId ? "selected" : ""}>${esc(songLabel(s))}${S.chartIndex[s.id] ? "" : " *"}</option>`).join("")}</select>
      ${opts.noDiff ? "" : `<div class="seg" data-role="diff">${DIFFS.map((d) => {
        const s = S.songById[songId];
        const lv = s && s.diff[d] ? s.diff[d].lv : "";
        return `<button data-diff="${d}" aria-pressed="${d === diff}">${esc(tx(d))} ${lv}</button>`;
      }).join("")}</div>`}
    </div>`;
  }
  function bindSongPicker(root, id, onChange) {
    const el = root.querySelector("#" + id);
    const q = el.querySelector('[data-role="q"]');
    const sel = el.querySelector('[data-role="song"]');
    q.addEventListener("input", () => {
      const v = q.value.trim().toLowerCase();
      for (const o of sel.options) {
        const s = S.songById[o.value];
        const txt = (s.title.en + " " + s.title.ja + " " + s.singer.en + " " + s.singer.ja).toLowerCase();
        o.hidden = v && !txt.includes(v);
      }
    });
    sel.addEventListener("change", () => onChange({ song: sel.value }));
    el.addEventListener("click", (e) => {
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
          return [c.title.en, c.title.ja, tl.name.en, tl.name.ja, tl.short.en].join(" ").toLowerCase().includes(q);
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

  window.HoloTeamUI = { tx, DIFFS, songsSorted, songLabel, songPickerHTML, bindSongPicker, pickCards, scoreRank, leaderLabel, teamHTML, encodeTeam, decodeTeam };
})();
