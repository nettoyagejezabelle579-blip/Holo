/* Card database page: search, filter, sort, views, detail modal, compare, collection. */
(function () {
  "use strict";
  const H = window.Holo;
  const { D, t, L, esc, fmt } = H;

  const SKILL_EFFECTS = ["score_up", "score_support", "skill_rate_up", "life_recovery", "judgement_boost",
    "performance_up", "technique_up", "sense_up", "all_stats_up", "skill_effect_up"];
  const TRIGGERS = ["deck_attribute", "deck_group", "leader_talent", "leader_group", "song_talent", "combo", "life_high", "life_low", "judgement"];
  const TARGETS = ["self", "all", "attribute", "character_grouping", "character"];
  const SLOTS = ["any", "active", "special", "passive", "leader"];
  const SORTS = ["release", "total", "performance", "technique", "sense", "rarity", "talentOrder", "name", "ctime", "prob"];

  const DEFAULT = {
    q: "", rarity: [], attr: [], avail: [], banner: [], branch: [], unit: [], talent: [], eff: [], slot: "any",
    trig: [], tgt: [], coll: "all", fav: false, ann: true, sort: "release", dir: "desc", view: "grid", mode: "max",
  };
  const ARRAY_KEYS = Object.keys(DEFAULT).filter((k) => Array.isArray(DEFAULT[k]));

  // ---------- state <-> URL ----------
  function readState() {
    const s = JSON.parse(JSON.stringify(DEFAULT));
    const saved = H.store.get("cardsPrefs", {});
    for (const k of ["view", "mode"]) if (saved[k]) s[k] = saved[k];
    const p = new URLSearchParams(location.search);
    for (const [k, v] of p) {
      if (!(k in DEFAULT)) continue;
      if (ARRAY_KEYS.includes(k)) s[k] = v.split(",").filter(Boolean);
      else if (typeof DEFAULT[k] === "boolean") s[k] = v === "1";
      else s[k] = v;
    }
    return s;
  }
  function writeState() {
    const p = new URLSearchParams();
    for (const k in DEFAULT) {
      const v = state[k];
      if (JSON.stringify(v) === JSON.stringify(DEFAULT[k])) continue;
      if (Array.isArray(v)) p.set(k, v.join(","));
      else if (typeof v === "boolean") p.set(k, v ? "1" : "0");
      else p.set(k, v);
    }
    const qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    H.store.set("cardsPrefs", { view: state.view, mode: state.mode });
  }

  let state = readState();
  let compare = H.store.get("compare", []).filter((id) => H.cardById[id]);
  let lastResults = [];

  // ---------- search index ----------
  function searchText(c) {
    const tl = H.talents[c.chr];
    const parts = [c.title.en, c.title.ja, c.title.zh, tl && tl.name.en, tl && tl.name.ja, tl && tl.name.zh, tl && tl.short.en, tl && tl.short.ja, tl && tl.short.zh,
      c.leader && c.leader.name.en, c.leader && c.leader.name.ja, ...H.talentGroupNames(c.chr)];
    for (const slot of ["active", "special", "passive"]) for (const lv of c.skills[slot]) parts.push(H.plain(lv.text.en), H.plain(lv.text.ja), H.plain(lv.text.zh || ""));
    if (c.leader) parts.push(H.plain(c.leader.text.en), H.plain(c.leader.text.ja), H.plain(c.leader.text.zh || ""), c.leader.name.zh || "");
    return parts.filter(Boolean).join(" \u0001 ").toLowerCase();
  }
  const index = new Map(H.cards.map((c) => [c.id, searchText(c)]));

  function slotData(c, slot) {
    if (slot === "leader") return c.leader ? [c.leader] : [];
    if (slot === "any") return [].concat(c.skills.active, c.skills.special, c.skills.passive, c.leader ? [c.leader] : []);
    return c.skills[slot];
  }
  function has(list, key, wanted) {
    const set = new Set();
    for (const x of list) for (const v of x[key] || []) set.add(v);
    return wanted.every((w) => set.has(w));
  }

  // ---------- filtering & sorting ----------
  function applyFilters() {
    const q = state.q.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    return H.cards.filter((c) => {
      if (c.announced && !state.ann) return false;
      const tl = H.talents[c.chr];
      if (terms.length) {
        const txt = index.get(c.id);
        if (!terms.every((w) => txt.includes(w))) return false;
      }
      if (state.rarity.length && !state.rarity.includes(String(c.rarity))) return false;
      if (state.attr.length && !(c.attr && state.attr.includes(c.attr))) return false;
      if (state.avail.length) {
        const a = c.announced ? "announced" : c.limited ? "limited" : "standard";
        if (!state.avail.includes(a)) return false;
      }
      if (state.banner.length && !state.banner.includes(c.banner)) return false;
      if (state.branch.length && !(tl && state.branch.includes(tl.production))) return false;
      if (state.unit.length && !(tl && tl.groups.some((g) => state.unit.includes(g)))) return false;
      if (state.talent.length && !state.talent.includes(c.chr)) return false;
      const data = slotData(c, state.slot);
      if (state.eff.length && !has(data, "eff", state.eff)) return false;
      if (state.trig.length && !has(data, "trig", state.trig)) return false;
      if (state.tgt.length && !has(c.skills.passive, "tgt", state.tgt)) return false;
      if (state.coll === "owned" && !H.owned.has(c.id)) return false;
      if (state.coll === "notOwned" && H.owned.has(c.id)) return false;
      if (state.fav && !H.favorites.has(c.id)) return false;
      return true;
    });
  }

  function sortKey(c) {
    const s = H.statsForMode(c, state.mode);
    const tl = H.talents[c.chr] || { order: 0 };
    const act = c.skills.active[0];
    switch (state.sort) {
      case "total": return s ? s[3] : null;
      case "performance": return s ? s[0] : null;
      case "technique": return s ? s[1] : null;
      case "sense": return s ? s[2] : null;
      case "rarity": return c.rarity * 1e6 + (s ? s[3] : 0);
      case "talentOrder": return tl.order * 10 + c.rarity;
      case "name": return L(c.title).toLowerCase();
      case "ctime": return act ? act.ct : null;
      case "prob": return act ? act.prob : null;
      default: return c.release + String(c.rarity) + String(c.order).padStart(6, "0");
    }
  }
  function sortCards(list) {
    const dir = state.dir === "asc" ? 1 : -1;
    const keyed = list.map((c) => [sortKey(c), c]);
    keyed.sort((a, b) => {
      if (a[0] == null && b[0] == null) return 0;
      if (a[0] == null) return 1; // missing values always last
      if (b[0] == null) return -1;
      if (a[0] < b[0]) return -dir;
      if (a[0] > b[0]) return dir;
      return a[1].order - b[1].order;
    });
    return keyed.map((x) => x[1]);
  }

  // ---------- filter panel ----------
  const filtersEl = document.getElementById("filters");

  function chip(group, value, label, extra) {
    const arr = state[group];
    const on = Array.isArray(arr) ? arr.includes(value) : arr === value;
    return `<button class="chip ${extra || ""}" data-group="${group}" data-value="${esc(value)}" aria-pressed="${on}">${label}</button>`;
  }

  function renderFilters() {
    const prods = Object.entries(D.productions).sort((a, b) => a[1].order - b[1].order);
    const groups = Object.entries(D.groups).filter(([id]) => id !== "grp-indonesia").sort((a, b) => a[1].order - b[1].order);
    const talentsSorted = Object.entries(H.talents).sort((a, b) => a[1].order - b[1].order);
    const byProd = {};
    for (const [id, tl] of talentsSorted) (byProd[tl.production] = byProd[tl.production] || []).push([id, tl]);

    filtersEl.innerHTML = `
      <div class="filter-head"><strong>${esc(t("filters"))}</strong>
        <span><button class="link-btn" id="reset-filters">${esc(t("reset"))}</button>
        <button class="icon-btn filter-toggle" id="close-filters" aria-label="${esc(t("close"))}">✕</button></span></div>
      <h3>${esc(t("rarity"))}</h3>
      <div class="chips">${[5, 4, 3].map((r) => chip("rarity", String(r), "★" + r)).join("")}</div>
      <h3>${esc(t("attribute"))}</h3>
      <div class="chips">${["cute", "happy", "pure"].map((a) => chip("attr", a, esc(t(a)), "attr-" + a)).join("")}</div>
      <h3>${esc(t("availability"))}</h3>
      <div class="chips">${["standard", "limited", "announced"].map((a) => chip("avail", a, esc(t(a)))).join("")}</div>
      <h3>${esc(t("banner"))}</h3>
      <div class="chips">${H.bannerList.slice().reverse().map((b) => chip("banner", b.id,
        `${esc(b.id === "launch" ? t("launchStandard") : L(b.name))} <span class="small">${esc(b.date.slice(5))}</span>`)).join("")}</div>
      <h3>${esc(t("branch"))}</h3>
      <div class="chips">${prods.map(([id, p]) => chip("branch", id, esc(L(p.name)))).join("")}</div>
      <h3>${esc(t("unit"))}</h3>
      <div class="chips">${groups.map(([id, g]) => chip("unit", id, `<span class="dot" style="background:${esc(g.color)}"></span>${esc(L(g.name))}`)).join("")}</div>
      <h3>${esc(t("talent"))}</h3>
      ${prods.map(([pid, p]) => `<div class="talent-group"><span class="small muted">${esc(L(p.name))}</span><div class="chips">` +
        (byProd[pid] || []).map(([id, tl]) => chip("talent", id, `<span class="dot" style="background:${esc(tl.color)}"></span>${esc(L(tl.short))}`)).join("") +
        `</div></div>`).join("")}
      <h3>${esc(t("slot"))}</h3>
      <div class="chips">${SLOTS.map((s) => chip("slot", s, esc(s === "any" ? t("anySlot") : t(s)))).join("")}</div>
      <h3>${esc(t("skillEffect"))}</h3>
      <div class="chips">${SKILL_EFFECTS.map((e) => chip("eff", e, esc(t("skill_" + e)))).join("")}</div>
      <h3>${esc(t("condition"))}</h3>
      <div class="chips">${TRIGGERS.map((e) => chip("trig", e, esc(t("trig_" + e)))).join("")}</div>
      <h3>${esc(t("target"))}</h3>
      <div class="chips">${TARGETS.map((e) => chip("tgt", e, esc(t("tgt_" + e)))).join("")}</div>
      <h3>${esc(t("collection"))}</h3>
      <div class="chips">${["all", "owned", "notOwned"].map((e) => chip("coll", e, esc(t(e)))).join("")}
        <button class="chip" data-toggle="fav" aria-pressed="${state.fav}">♥ ${esc(t("favorites"))}</button></div>
      <p class="small muted">${esc(t("ownedCount", { a: H.cards.filter((c) => H.owned.has(c.id)).length, b: H.cards.filter((c) => !c.announced).length }))}</p>
      <div class="chips">
        <button class="chip" data-toggle="ann" aria-pressed="${state.ann}">${esc(t("includeAnnounced"))}</button>
      </div>
      <div class="chips" style="margin-top:8px">
        <button class="chip" id="export-coll">${esc(t("export"))}</button>
        <label class="chip">${esc(t("import"))}<input type="file" id="import-coll" accept="application/json" hidden></label>
      </div>`;
  }

  filtersEl.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.id === "reset-filters") {
      const keep = { sort: state.sort, dir: state.dir, view: state.view, mode: state.mode };
      state = Object.assign(JSON.parse(JSON.stringify(DEFAULT)), keep);
      document.getElementById("search").value = "";
    } else if (b.id === "close-filters") {
      filtersEl.classList.remove("open");
      return;
    } else if (b.id === "export-coll") {
      exportCollection();
      return;
    } else if (b.dataset.toggle) {
      state[b.dataset.toggle] = !state[b.dataset.toggle];
    } else if (b.dataset.group) {
      const g = b.dataset.group, v = b.dataset.value;
      if (Array.isArray(state[g])) {
        state[g] = state[g].includes(v) ? state[g].filter((x) => x !== v) : state[g].concat(v);
      } else {
        state[g] = v;
      }
    } else return;
    update(true);
  });
  filtersEl.addEventListener("change", (e) => {
    if (e.target.id === "import-coll" && e.target.files[0]) importCollection(e.target.files[0]);
  });

  function exportCollection() {
    const blob = new Blob([JSON.stringify({ progress: H.progress, favorites: [...H.favorites] }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "holodori-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importCollection(file) {
    file.text().then((txt) => {
      const data = JSON.parse(txt);
      if (data.progress) H.replaceProgress(data.progress);
      else if (data.owned) H.replaceProgress({ cards: Object.fromEntries(data.owned.filter((id) => H.cardById[id]).map((id) => [id, { lv: H.maxLevel(H.cardById[id]), bloom: 0 }])) });
      H.favorites.clear();
      (data.favorites || []).forEach((id) => H.favorites.add(id));
      H.store.set("favorites", [...H.favorites]);
      update(true);
    }).catch(() => alert("Invalid file"));
  }

  // ---------- toolbar ----------
  const toolbarEl = document.getElementById("toolbar");
  function renderToolbar() {
    toolbarEl.innerHTML = `
      <button class="icon-btn filter-toggle" id="open-filters">☰ ${esc(t("filters"))}</button>
      <input class="input search" id="search" type="search" placeholder="${esc(t("search"))}" value="${esc(state.q)}" autocomplete="off">
      <div class="group">
        <label class="small muted" for="sort">${esc(t("sort"))}</label>
        <select class="select" id="sort">${SORTS.map((s) => `<option value="${s}" ${state.sort === s ? "selected" : ""}>${esc(t(s))}</option>`).join("")}</select>
        <button class="icon-btn" id="dir" title="Direction">${state.dir === "asc" ? "↑" : "↓"}</button>
      </div>
      <div class="group">
        <label class="small muted" for="mode">${esc(t("statMode"))}</label>
        <select class="select" id="mode">${["lv1", "max", "maxpot"].map((m) => `<option value="${m}" ${state.mode === m ? "selected" : ""}>${esc(t(m === "max" ? "maxLv" : m === "maxpot" ? "maxPot" : "lv1"))}</option>`).join("")}</select>
      </div>
      <div class="seg" role="group" aria-label="${esc(t("view"))}">
        ${["grid", "compact", "list", "table"].map((v) => `<button data-view="${v}" aria-pressed="${state.view === v}">${esc(t(v))}</button>`).join("")}
      </div>`;
  }
  let searchTimer;
  toolbarEl.addEventListener("input", (e) => {
    if (e.target.id === "search") {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.q = e.target.value; update(false); }, 120);
    }
  });
  toolbarEl.addEventListener("change", (e) => {
    if (e.target.id === "sort") {
      state.sort = e.target.value;
      state.dir = ["name", "talentOrder", "ctime"].includes(state.sort) ? "asc" : "desc";
      update(false, true);
    } else if (e.target.id === "mode") {
      state.mode = e.target.value;
      update(false);
    }
  });
  toolbarEl.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.id === "dir") { state.dir = state.dir === "asc" ? "desc" : "asc"; update(false, true); }
    else if (b.id === "open-filters") filtersEl.classList.add("open");
    else if (b.dataset.view) { state.view = b.dataset.view; update(false, true); }
  });

  // ---------- results ----------
  const resultsEl = document.getElementById("results");
  const metaEl = document.getElementById("result-meta");

  function statCells(s) {
    if (!s) return `<div style="grid-column:1/-1" class="muted small">${esc(t("pendingData"))}</div>`;
    return [["P", s[0]], ["T", s[1]], ["S", s[2]], ["Σ", s[3]]]
      .map(([k, v]) => `<div><span class="k">${k}</span><b>${fmt(v)}</b></div>`).join("");
  }
  function sortBadge(c) {
    if (["ctime", "prob"].includes(state.sort)) {
      const a = c.skills.active[0];
      if (!a) return "";
      return `<span class="sort-value">${state.sort === "ctime" ? a.ct + "s CT" : Math.round(a.prob * 100) + "%"}</span>`;
    }
    if (state.sort === "release") return `<span class="small muted">${esc(c.release)}</span>`;
    return "";
  }
  function ownBtn(c) {
    if (c.announced) return "";
    const on = H.owned.has(c.id);
    return `<button class="own-btn" data-own="${esc(c.id)}" aria-pressed="${on}" title="${esc(t("owned"))}">${on ? "✓" : "+"}</button>`;
  }

  function renderGrid(list) {
    const compact = state.view === "compact";
    return `<div class="grid ${compact ? "compact" : ""}">` + list.map((c) => {
      const tl = H.talents[c.chr];
      const s = H.statsForMode(c, state.mode);
      const dim = state.coll === "all" && H.owned.size && !H.owned.has(c.id) && !c.announced ? "not-owned" : "";
      return `<article class="tile ${dim}" tabindex="0" data-id="${esc(c.id)}">
        ${H.artHTML(c)}${ownBtn(c)}
        <div class="tile-body">
          <div class="tile-title">${esc(L(c.title))}</div>
          <div class="tile-talent">${esc(tl ? L(tl.name) : "")} ${sortBadge(c)}</div>
          <div class="tile-stats">${statCells(s)}</div>
        </div></article>`;
    }).join("") + `</div>`;
  }

  function renderList(list) {
    const lvIdx = state.mode === "maxpot" ? 1 : 0;
    return `<div class="list">` + list.map((c) => {
      const tl = H.talents[c.chr];
      const s = H.statsForMode(c, state.mode);
      const sk = (slot) => {
        const lv = c.skills[slot][Math.min(lvIdx, c.skills[slot].length - 1)];
        return lv ? `<div><span class="lbl">${esc(t(slot))}</span>${H.richText(L(lv.text))}</div>` : "";
      };
      return `<article class="row" tabindex="0" data-id="${esc(c.id)}">
        ${H.artHTML(c, { noNew: true })}
        <div class="row-main">
          <div class="row-top"><strong>${esc(L(c.title))}</strong><span class="muted">${esc(tl ? L(tl.name) : "")}</span>
            <span class="small muted">${esc(c.release)}</span>
            ${s ? `<span class="small">P ${fmt(s[0])} · T ${fmt(s[1])} · S ${fmt(s[2])} · <b>Σ ${fmt(s[3])}</b></span>` : ""}</div>
          <div class="row-skills">${sk("active")}${sk("special")}${sk("passive")}
            ${c.leader ? `<div><span class="lbl">${esc(t("leader"))}</span>${H.richText(L(c.leader.text))}</div>` : ""}
            ${c.announced ? `<div class="muted">${esc(L(c.note))}</div>` : ""}</div>
        </div></article>`;
    }).join("") + `</div>`;
  }

  const TABLE_COLS = [
    ["name", "name"], ["talentOrder", "talent"], ["rarity", "rarity"], [null, "attribute"], ["release", "release"],
    ["performance", "performance", true], ["technique", "technique", true], ["sense", "sense", true], ["total", "total", true],
    ["ctime", "cooldown", true], ["prob", "chance", true],
  ];
  function renderTable(list) {
    const head = TABLE_COLS.map(([key, label, num]) => {
      const sorted = key && state.sort === key ? (state.dir === "asc" ? "ascending" : "descending") : "none";
      return `<th ${key ? `data-sort="${key}"` : ""} class="${num ? "num" : ""}" aria-sort="${sorted}">${esc(t(label))}</th>`;
    }).join("");
    const rows = list.map((c) => {
      const tl = H.talents[c.chr];
      const s = H.statsForMode(c, state.mode) || [null, null, null, null];
      const a = c.skills.active[0];
      return `<tr data-id="${esc(c.id)}">
        <td>${esc(L(c.title))}${c.announced ? ` <span class="badge announced">${esc(t("announced"))}</span>` : c.limited ? ` <span class="badge limited">${esc(t("limited"))}</span>` : ""}</td>
        <td><span class="swatch" style="background:${esc(tl ? tl.color : "#888")}"></span>${esc(tl ? L(tl.name) : "")}</td>
        <td style="color:var(--star)">${H.stars(c.rarity)}</td>
        <td>${c.attr ? `<span class="attr-text-${c.attr}">${esc(t(c.attr))}</span>` : "—"}</td>
        <td>${esc(c.release)}</td>
        <td class="num">${fmt(s[0])}</td><td class="num">${fmt(s[1])}</td><td class="num">${fmt(s[2])}</td><td class="num"><b>${fmt(s[3])}</b></td>
        <td class="num">${a ? a.ct + "s" : "—"}</td><td class="num">${a ? Math.round(a.prob * 100) + "%" : "—"}</td></tr>`;
    }).join("");
    return `<div class="table-wrap"><table class="data"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderResults() {
    const list = sortCards(applyFilters());
    lastResults = list;
    const active = ARRAY_KEYS.reduce((n, k) => n + state[k].length, 0) + (state.q ? 1 : 0) + (state.coll !== "all") + state.fav + (state.slot !== "any");
    metaEl.innerHTML = `<span>${esc(t("results", { n: list.length }))}${active ? ` · ${active} ${esc(t("filters").toLowerCase())}` : ""}</span>` +
      `<span class="small">${esc(t("ownedCount", { a: H.cards.filter((c) => H.owned.has(c.id)).length, b: H.cards.filter((c) => !c.announced).length }))}</span>`;
    if (!list.length) {
      resultsEl.innerHTML = `<div class="empty">${esc(t("noResults"))}</div>`;
      return;
    }
    resultsEl.innerHTML = state.view === "table" ? renderTable(list) : state.view === "list" ? renderList(list) : renderGrid(list);
  }

  resultsEl.addEventListener("click", (e) => {
    const own = e.target.closest("[data-own]");
    if (own) {
      e.stopPropagation();
      H.toggleOwned(own.dataset.own);
      renderResults();
      return;
    }
    const th = e.target.closest("th[data-sort]");
    if (th) {
      const key = th.dataset.sort;
      if (state.sort === key) state.dir = state.dir === "asc" ? "desc" : "asc";
      else { state.sort = key; state.dir = ["name", "talentOrder", "ctime"].includes(key) ? "asc" : "desc"; }
      update(false, true);
      return;
    }
    const item = e.target.closest("[data-id]");
    if (item) openCard(item.dataset.id);
  });
  resultsEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const item = e.target.closest("[data-id]");
      if (item) openCard(item.dataset.id);
    }
  });

  // ---------- detail modal ----------
  const modalRoot = document.getElementById("modal-root");
  let detail = null; // { id, level, pot, allLevels }

  function openCard(id) {
    const c = H.cardById[id];
    if (!c) return;
    const prev = detail;
    detail = {
      id,
      level: c.announced ? 1 : H.maxLevel(c),
      pot: prev ? prev.pot : 0,
      allLevels: prev ? prev.allLevels : false,
    };
    if (location.hash !== "#" + id) history.replaceState(null, "", location.pathname + location.search + "#" + id);
    renderModal();
  }
  function closeCard() {
    detail = null;
    modalRoot.innerHTML = "";
    document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname + location.search);
  }
  function step(delta) {
    const ids = lastResults.map((c) => c.id);
    const i = ids.indexOf(detail.id);
    if (i < 0) return;
    const next = ids[(i + delta + ids.length) % ids.length];
    openCard(next);
  }

  function skillBlock(c, slot, title, extra) {
    const levels = slot === "leader" ? (c.leader ? [c.leader] : []) : slot === "board" ? (c.board || []) : c.skills[slot];
    if (!levels.length) return "";
    const cur = slot === "leader" ? 1 : H.skillLevelAt(c, slot, detail.pot);
    const rows = levels.map((lv, i) => {
      const n = lv.lv || i + 1;
      if (!detail.allLevels && slot !== "leader" && n !== cur) return "";
      const dim = detail.allLevels && slot !== "leader" && n !== cur ? "dim" : "";
      return `<div class="skill-lv ${dim}">${slot !== "leader" ? `<span class="pill ${n === cur ? "on" : ""}">Lv ${n}</span> ` : ""}${H.richText(L(lv.text))}</div>`;
    }).join("");
    const first = levels[0];
    const pills = [];
    for (const e of first.eff || []) pills.push(`<span class="pill">${esc(t("skill_" + e))}</span>`);
    for (const e of first.trig || []) pills.push(`<span class="pill">${esc(t("trig_" + e))}</span>`);
    return `<div class="skill"><div class="skill-head"><strong>${esc(title)}</strong>${extra || ""}${pills.join("")}</div>${rows}</div>`;
  }

  function statBars(c) {
    const s = H.stats(c, detail.level, detail.pot);
    const maxS = H.stats(c, H.maxLevel(c), 5);
    const colors = ["var(--perf)", "var(--tech)", "var(--sense)"];
    const w = (v, of) => Math.min(100, (v / of) * 100).toFixed(1);
    return ["performance", "technique", "sense"].map((k, i) => `
      <div class="stat-bar"><span>${esc(t(k))}</span><div class="track"><div class="fill" style="width:${w(s[i], maxS[3] * 0.45)}%;background:${colors[i]}"></div></div><span class="v">${fmt(s[i])}</span></div>`).join("") +
      `<div class="stat-bar"><strong>${esc(t("total"))}</strong><div class="track"><div class="fill" style="width:${w(s[3], maxS[3])}%;background:var(--accent)"></div></div><span class="v">${fmt(s[3])}</span></div>`;
  }

  function renderModal() {
    const c = H.cardById[detail.id];
    const tl = H.talents[c.chr];
    const b = H.banners[c.banner];
    const max = c.announced ? 1 : H.maxLevel(c);
    const inCompare = compare.includes(c.id);
    const fav = H.favorites.has(c.id);
    const own = H.owned.has(c.id);
    const lims = D.limits[c.limitGroup] || [];
    const act = c.skills.active[0];
    const spc = c.skills.special[0];

    const statsSection = c.announced ? `<div class="section"><p class="muted">${esc(L(c.note))}</p><p>${esc(t("pendingData"))}</p></div>` : `
      <div class="section">
        <div class="controls">
          <label>${esc(t("level"))} <input type="range" id="lv" min="1" max="${max}" value="${detail.level}"> <b id="lv-val">${detail.level}</b> / ${max}</label>
          <label>${esc(t("potential"))}
            <span class="seg">${[0, 1, 2, 3, 4, 5].map((p) => `<button data-pot="${p}" aria-pressed="${detail.pot === p}">${p}</button>`).join("")}</span></label>
          <span class="small muted">${esc(t("limitBreak"))}: <span id="lb-val">${H.limitBreakFor(c, detail.level)}</span> / ${lims.length - 1}</span>
        </div>
        <div class="stat-bars" id="stat-bars">${statBars(c)}</div>
      </div>
      <div class="section">
        <h4>${esc(t("statsByLb"))}</h4>
        <div class="table-wrap"><table class="data"><thead><tr><th>${esc(t("limitBreak"))}</th><th class="num">Lv</th>
          <th class="num">${esc(t("performance"))}</th><th class="num">${esc(t("technique"))}</th><th class="num">${esc(t("sense"))}</th><th class="num">${esc(t("total"))}</th></tr></thead>
          <tbody>${[{ lb: "—", lv: 1 }].concat(lims.map((lv, i) => ({ lb: i, lv }))).map((r) => {
            const x = H.stats(c, r.lv, detail.pot);
            return `<tr><td>${r.lb}</td><td class="num">${r.lv}</td><td class="num">${fmt(x[0])}</td><td class="num">${fmt(x[1])}</td><td class="num">${fmt(x[2])}</td><td class="num"><b>${fmt(x[3])}</b></td></tr>`;
          }).join("")}</tbody></table></div>
      </div>
      <div class="section">
        <h4 style="display:flex;justify-content:space-between;align-items:center">${esc(t("active"))} / ${esc(t("special"))} / ${esc(t("passive"))}
          <label class="small" style="text-transform:none;letter-spacing:0"><input type="checkbox" id="all-levels" ${detail.allLevels ? "checked" : ""}> ${esc(t("showAllLevels"))}</label></h4>
        ${skillBlock(c, "active", t("active"), act ? `<span class="pill">${esc(t("cooldown"))} ${act.ct}s</span><span class="pill">${esc(t("duration"))} ${act.dur}s</span><span class="pill">${esc(t("chance"))} ${Math.round(act.prob * 100)}%</span>` : "")}
        ${skillBlock(c, "special", t("special"), spc && spc.dur ? `<span class="pill">${esc(t("duration"))} ${spc.dur}s</span>` : "")}
        ${skillBlock(c, "passive", t("passive"))}
        ${c.leader ? skillBlock(c, "leader", `${t("leader")}: ${L(c.leader.name)}`) : ""}
        ${c.board ? skillBlock(c, "board", t("board")) : ""}
      </div>
      <div class="section">
        <h4>${esc(t("potential"))}</h4>
        <ol class="pot-list">${(D.potentials[c.potentialGroup] || []).map((p) =>
          `<li class="${p.n <= detail.pot ? "done" : ""}">${esc(t("pot_" + p.type, { v: p.value / 10 }))}</li>`).join("")}</ol>
      </div>`;

    modalRoot.innerHTML = `
      <div class="modal-backdrop" id="backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(L(c.title))}">
          <div class="modal-head">
            <button class="icon-btn nav-arrow" id="m-prev" title="${esc(t("prev"))}">‹</button>
            <button class="icon-btn nav-arrow" id="m-next" title="${esc(t("next"))}">›</button>
            <span class="spacer"></span>
            ${c.announced ? "" : `<button class="icon-btn" id="m-own" aria-pressed="${own}">${own ? "✓ " + esc(t("owned")) : "+ " + esc(t("owned"))}</button>`}
            <button class="icon-btn" id="m-fav" title="${esc(t("favorites"))}">${fav ? "♥" : "♡"}</button>
            ${c.announced ? "" : `<button class="icon-btn" id="m-compare">${esc(inCompare ? t("inCompare") : t("addCompare"))}</button>`}
            <button class="icon-btn" id="m-link">${esc(t("copyLink"))}</button>
            <button class="icon-btn" id="m-close" title="${esc(t("close"))}">✕</button>
          </div>
          ${H.cardImageUrls(c.id, "full").length ? `<div class="hero-art">${H.imgChain(H.cardImageUrls(c.id, "full"), L(c.title))}</div>` : ""}
          <div class="modal-body">
            <div class="art-col">${H.artHTML(c)}
              <dl class="kv">
                <dt>${esc(t("rarity"))}</dt><dd style="color:var(--star)">${H.stars(c.rarity)}</dd>
                <dt>${esc(t("attribute"))}</dt><dd>${c.attr ? `<span class="attr-text-${c.attr}">${esc(t(c.attr))}</span>` : "—"}</dd>
                <dt>${esc(t("talent"))}</dt><dd><a href="?talent=${esc(c.chr)}" data-talent="${esc(c.chr)}">${esc(tl ? L(tl.name) : "")}</a></dd>
                <dt>${esc(t("unit"))}</dt><dd>${esc(H.talentGroupNames(c.chr).join(", "))}</dd>
                <dt>${esc(t("branch"))}</dt><dd>${esc(tl ? L(D.productions[tl.production].name) : "")}</dd>
                ${tl && tl.birthday[0] ? `<dt>${esc(t("birthday"))}</dt><dd>${tl.birthday[0]}/${tl.birthday[1]}</dd>` : ""}
                ${tl && tl.debut[0] ? `<dt>${esc(t("debut"))}</dt><dd>${tl.debut.join("-")}</dd>` : ""}
                <dt>${esc(t("released"))}</dt><dd>${esc(c.release)}</dd>
                ${c.firstSeen ? `<dt>${esc(t("firstSeen"))}</dt><dd>${esc(c.firstSeen)}</dd>` : ""}
                <dt>${esc(t("obtain"))}</dt><dd>${esc(t("gacha"))} · ${esc(c.announced ? t("announced") : c.limited ? t("limited") : t("standard"))}<br>
                  <span class="small muted">${esc(b ? (b.id === "launch" ? t("launchStandard") : L(b.name)) : "")}</span></dd>
                ${c.dist ? `<dt>P / T / S</dt><dd>${c.dist.map((d) => (d / 10).toFixed(1) + "%").join(" / ")}</dd>` : ""}
              </dl>
            </div>
            <div>
              <h2 class="detail-title">${esc(L(c.title))}</h2>
              <p class="detail-sub">${esc(tl ? L(tl.name) : "")}</p>
              ${statsSection}
            </div>
          </div>
        </div>
      </div>`;
    document.body.style.overflow = "hidden";
  }

  modalRoot.addEventListener("click", (e) => {
    if (!detail) return;
    if (e.target.id === "backdrop") return closeCard();
    const b = e.target.closest("button, a[data-talent]");
    if (!b) return;
    const c = H.cardById[detail.id];
    if (b.id === "m-close") return closeCard();
    if (b.id === "m-prev") return step(-1);
    if (b.id === "m-next") return step(1);
    if (b.dataset.talent) {
      e.preventDefault();
      state.talent = [b.dataset.talent];
      closeCard();
      update(true);
      return;
    }
    if (b.id === "m-own") { H.toggleOwned(c.id); renderResults(); }
    else if (b.id === "m-fav") { H.toggleFavorite(c.id); if (state.fav) renderResults(); }
    else if (b.id === "m-compare") toggleCompare(c.id);
    else if (b.id === "m-link") {
      const url = location.origin + location.pathname + "#" + c.id;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
        () => { b.textContent = t("copied"); },
        () => { prompt(t("copyLink"), url); });
      return;
    } else if (b.dataset.pot != null) detail.pot = Number(b.dataset.pot);
    else return;
    renderModal();
  });
  modalRoot.addEventListener("input", (e) => {
    if (e.target.id === "lv") {
      const c = H.cardById[detail.id];
      detail.level = Number(e.target.value);
      document.getElementById("lv-val").textContent = detail.level;
      document.getElementById("lb-val").textContent = H.limitBreakFor(c, detail.level);
      document.getElementById("stat-bars").innerHTML = statBars(c);
    }
  });
  modalRoot.addEventListener("change", (e) => {
    if (e.target.id === "all-levels") { detail.allLevels = e.target.checked; renderModal(); }
  });
  document.addEventListener("keydown", (e) => {
    if (!detail) {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
        e.preventDefault();
        document.getElementById("search").focus();
      }
      return;
    }
    if (e.target.tagName === "INPUT" && e.target.type === "range") return;
    if (e.key === "Escape") closeCard();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });

  // ---------- compare ----------
  const compareEl = document.getElementById("compare-bar");
  function toggleCompare(id) {
    compare = compare.includes(id) ? compare.filter((x) => x !== id) : compare.concat(id).slice(-4);
    H.store.set("compare", compare);
    renderCompareBar();
  }
  function renderCompareBar() {
    if (!compare.length) { compareEl.classList.add("hidden"); return; }
    compareEl.classList.remove("hidden");
    compareEl.innerHTML = `<strong>${esc(t("compare"))}</strong>` + compare.map((id) => {
      const c = H.cardById[id], tl = H.talents[c.chr];
      return `<span class="mini"><span class="swatch" style="background:${esc(tl.color)}"></span>${esc(L(tl.short))} ${H.stars(c.rarity)}
        <button class="link-btn" data-uncompare="${esc(id)}">✕</button></span>`;
    }).join("") + `<button class="icon-btn" id="open-compare" ${compare.length < 2 ? "disabled" : ""}>${esc(t("compare"))} →</button>
      <button class="link-btn" id="clear-compare">${esc(t("clear"))}</button>`;
  }
  compareEl.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.uncompare) toggleCompare(b.dataset.uncompare);
    else if (b.id === "clear-compare") { compare = []; H.store.set("compare", compare); renderCompareBar(); }
    else if (b.id === "open-compare") openCompare();
  });
  function openCompare() {
    const list = compare.map((id) => H.cardById[id]);
    const st = list.map((c) => H.statsForMode(c, state.mode));
    const best = [0, 1, 2, 3].map((i) => Math.max(...st.map((s) => s[i])));
    const lvIdx = state.mode === "maxpot" ? 1 : 0;
    const row = (label, cells) => `<div class="lbl">${esc(label)}</div>` + cells.join("");
    const skill = (slot) => list.map((c) => {
      const lv = c.skills[slot][Math.min(lvIdx, c.skills[slot].length - 1)];
      return `<div>${lv ? H.richText(L(lv.text)) : "—"}</div>`;
    });
    modalRoot.innerHTML = `<div class="modal-backdrop" id="backdrop"><div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head"><strong>${esc(t("compare"))}</strong><span class="small muted">&nbsp;${esc(t("statMode"))}: ${esc(t(state.mode === "max" ? "maxLv" : state.mode === "maxpot" ? "maxPot" : "lv1"))}</span>
        <span class="spacer"></span><button class="icon-btn" id="m-close">✕</button></div>
      <div style="overflow-x:auto;padding:12px"><div class="compare-grid" style="--n:${list.length}">
        ${row("", list.map((c) => `<div>${H.artHTML(c, { noNew: true })}<strong>${esc(L(c.title))}</strong><br><span class="muted">${esc(L(H.talents[c.chr].name))}</span></div>`))}
        ${["performance", "technique", "sense", "total"].map((k, i) => row(t(k), st.map((s) => `<div class="${s[i] === best[i] ? "best" : ""}">${fmt(s[i])}</div>`))).join("")}
        ${row(t("attribute"), list.map((c) => `<div><span class="attr-text-${c.attr}">${esc(t(c.attr))}</span></div>`))}
        ${row(t("active"), skill("active"))}
        ${row(t("special"), skill("special"))}
        ${row(t("passive"), skill("passive"))}
        ${row(t("leader"), list.map((c) => `<div>${c.leader ? `<b>${esc(L(c.leader.name))}</b><br>${H.richText(L(c.leader.text))}` : "—"}</div>`))}
      </div></div></div></div>`;
    detail = { id: null };
    document.body.style.overflow = "hidden";
    modalRoot.querySelector("#m-close").onclick = closeCard;
    modalRoot.querySelector("#backdrop").onclick = (e) => { if (e.target.id === "backdrop") closeCard(); };
  }

  // ---------- main ----------
  function update(filtersChanged, toolbarChanged) {
    writeState();
    if (filtersChanged) renderFilters();
    if (toolbarChanged) {
      const q = document.getElementById("search");
      const focused = document.activeElement === q;
      renderToolbar();
      if (focused) document.getElementById("search").focus();
    }
    renderResults();
  }
  function renderAll() {
    renderFilters();
    renderToolbar();
    renderResults();
    renderCompareBar();
    H.renderFooter();
    if (detail && detail.id) renderModal();
  }

  H.renderHeader("cards", renderAll);
  renderAll();
  const hashId = decodeURIComponent(location.hash.slice(1));
  if (hashId && H.cardById[hashId]) openCard(hashId);
  window.addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && H.cardById[id]) openCard(id);
  });
})();
