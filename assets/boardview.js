/* Zoomable holomem board view (like holodori.best / the in-game board).
 *
 * HoloBoardView.html(chr, opts) returns the markup; the pan/zoom behaviour is attached once for the
 * whole page: mouse wheel / pinch zooms, drag pans, double-click resets, and the corner buttons
 * toggle full screen and zoom. The view (zoom and position) of each board is remembered by its key,
 * so re-rendering (e.g. after unlocking a tile) keeps it.
 */
(function () {
  "use strict";
  const H = window.Holo;
  const S = 64; // grid spacing in px
  const PAD = 40;
  const views = new Map(); // key -> {x, y, k}

  const HINT = {
    en: "Scroll to zoom, drag to move, double-click to reset.",
    ja: "ホイールで拡大縮小、ドラッグで移動、ダブルクリックでリセット。",
    zh: "以滑鼠滾輪縮放，拖曳平移，雙擊重置。",
  };
  const BTN = {
    en: { full: "Full screen", zin: "Zoom in", zout: "Zoom out" },
    ja: { full: "全画面", zin: "拡大", zout: "縮小" },
    zh: { full: "全螢幕", zin: "放大", zout: "縮小" },
  };

  // Icon for a tile: [main glyph, small "%" badge?]
  function glyph(t) {
    const e = t.eff;
    if (t.type === "connection") return ["+", false];
    if (!e) return ["·", false];
    const ty = e.type;
    const pct = /_permil_up$/.test(ty) && /^(performance|technique|sense|all_parameter)_up/.test(ty);
    if (/^performance_up/.test(ty)) return ["P", pct];
    if (/^technique_up/.test(ty)) return ["T", pct];
    if (/^sense_up/.test(ty)) return ["S", pct];
    if (ty === "all_parameter_up_for_character_grouping") return ["G", false];
    if (/^all_parameter_up/.test(ty)) return ["All", pct];
    if (ty === "live_active_skill_effect_up_permil_up") return ["✦", false];
    if (ty === "live_active_skill_activation_probability_up_permil_up") return ["✦%", false];
    if (ty === "live_active_skill_cool_time_shorten_permil_up") return ["⏱", false];
    if (ty === "live_deck_leader_active_skill_addition") return ["✦+", false];
    if (ty === "live_deck_leader_active_skill_level_up") return ["Lv", false];
    if (ty === "life_up") return ["♥", false];
    if (/music_singer/.test(ty)) return ["♪", false];
    if (/card_exp/.test(ty)) return ["Ex", false];
    if (/mini_game/.test(ty)) return ["🎮", false];
    if (/reward/.test(ty)) return ["🎁", false];
    return ["·", false];
  }

  /* opts:
   *  set        Set of unlocked tile keys
   *  added, removed   Sets (plan view: green / red ring)
   *  connect    {tileKey: cardId}
   *  conChanged Set of connect tile keys whose card changes
   *  foot       Set of tiles in a Connect card's range (highlighted)
   *  can        function(tileKey) -> unlockable (editor)
   *  sel        selected tile key
   *  interactive  tiles are buttons with data-tile
   *  key        remembers the view between renders
   *  height     CSS height of the view
   */
  function html(chr, opts) {
    const B = window.HoloBoard;
    const b = B.tilesFor(chr);
    const o = opts || {};
    const set = o.set || new Set();
    const added = o.added || new Set(), removed = o.removed || new Set();
    const con = o.connect || {};
    const xs = b.list.map((t) => t.x), ys = b.list.map((t) => t.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const W = (maxX - minX) * S + PAD * 2, Hh = (maxY - minY) * S + PAD * 2;
    const px = (t) => (t.x - minX) * S + PAD, py = (t) => (maxY - t.y) * S + PAD;
    const lit = (k) => set.has(k) || added.has(k);

    let lines = "";
    for (const t of b.list) {
      for (const nk of t.nb) {
        if (nk < t.k) continue;
        const n = b.byKey[nk];
        const on = lit(t.k) && lit(nk);
        lines += `<line x1="${px(t)}" y1="${py(t)}" x2="${px(n)}" y2="${py(n)}" class="${on ? "on" : ""}"/>`;
      }
    }
    // Bounds of the interesting part (unlocked / changed tiles) for the first view.
    const focus = b.list.filter((t) => lit(t.k));
    const fx = focus.length ? focus : b.list;
    const bounds = [Math.min(...fx.map(px)), Math.min(...fx.map(py)), Math.max(...fx.map(px)), Math.max(...fx.map(py))];

    const tiles = b.list.map((t) => {
      const on = set.has(t.k);
      const cls = ["bv-t", "t-" + t.type, t.grade > 1 ? "big" : "", on || added.has(t.k) ? "on" : "off",
        added.has(t.k) ? "added" : "", removed.has(t.k) ? "removed" : "", o.conChanged && o.conChanged.has(t.k) ? "added" : "",
        o.foot && o.foot.has(t.k) ? "foot" : "", t.type === "connection" && con[t.k] && lit(t.k) ? "has-card" : "", o.sel === t.k ? "sel" : "", !on && o.can && o.can(t.k) ? "can" : "",
        (added.has(t.k) || removed.has(t.k) || (o.conChanged && o.conChanged.has(t.k))) ? "chg" : "same"].filter(Boolean).join(" ");
      const card = t.type === "connection" && con[t.k] && lit(t.k) ? H.cardById[con[t.k]] : null;
      const [g, pct] = glyph(t);
      let title = t.eff ? B.effectText(t.eff, chr) : "";
      if (card) title = `${H.stars(card.rarity)} ${H.L(H.talents[card.chr].name)} · ${H.L(card.title)}`;
      const inner = card
        ? `<b class="sm">${H.esc(H.L(H.talents[card.chr].short).slice(0, 2))}</b>${H.imgChain(H.cardImageUrls(card.id, "icon"), H.L(card.title), 'draggable="false"')}<span class="bv-name">${H.esc(H.L(H.talents[card.chr].short))}</span>`
        : `<b class="${g.length > 2 ? "sm" : ""}">${H.esc(g)}</b>${pct ? "<em>%</em>" : ""}`;
      const tag = o.interactive ? "button" : "div";
      return `<${tag} class="${cls}" ${o.interactive ? `data-tile="${H.esc(t.k)}" type="button"` : ""} title="${H.esc(title)}"
        style="left:${px(t)}px;top:${py(t)}px">${inner}${t.grade > 1 ? '<i>★★</i>' : t.type !== "connection" ? "<i>★</i>" : ""}</${tag}>`;
    }).join("");

    const bt = BTN[H.lang] || BTN.en;
    return `<div class="bv" data-bv="${H.esc(o.key || chr)}" data-bounds="${bounds.join(",")}" style="${o.height ? `height:${o.height}` : ""}">
      <div class="bv-stage" style="width:${W}px;height:${Hh}px">
        <svg class="bv-lines" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" aria-hidden="true">${lines}</svg>${tiles}
      </div>
      <div class="bv-ctrl">
        <button type="button" data-bv-act="full" title="${H.esc(bt.full)}" aria-label="${H.esc(bt.full)}">⤢</button>
        <button type="button" data-bv-act="in" title="${H.esc(bt.zin)}" aria-label="${H.esc(bt.zin)}">+</button>
        <button type="button" data-bv-act="out" title="${H.esc(bt.zout)}" aria-label="${H.esc(bt.zout)}">−</button>
      </div>
      <div class="bv-hint">${H.esc(HINT[H.lang] || HINT.en)}</div>
    </div>`;
  }

  // ---------- pan / zoom ----------
  function stageOf(el) { return el.querySelector(".bv-stage"); }
  function apply(el, v) {
    views.set(el.dataset.bv, v);
    stageOf(el).style.transform = `translate(${v.x}px,${v.y}px) scale(${v.k})`;
  }
  function fit(el) {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return null;
    const [x0, y0, x1, y1] = el.dataset.bounds.split(",").map(Number);
    const bw = x1 - x0 + S * 1.6, bh = y1 - y0 + S * 1.6;
    const k = Math.max(w < 700 ? 0.5 : 0.62, Math.min(1.4, Math.min(w / bw, h / bh)));
    return { k, x: w / 2 - ((x0 + x1) / 2) * k, y: h / 2 - ((y0 + y1) / 2) * k };
  }
  function init(root) {
    (root || document).querySelectorAll(".bv").forEach((el) => {
      if (el.dataset.ready) return;
      const v = views.get(el.dataset.bv) || fit(el);
      if (!v) return; // hidden (e.g. closed <details>): set up when it opens
      el.dataset.ready = "1";
      apply(el, v);
    });
  }
  function zoomAt(el, factor, cx, cy) {
    const v = Object.assign({}, views.get(el.dataset.bv) || fit(el));
    const k = Math.max(0.25, Math.min(3, v.k * factor));
    const f = k / v.k;
    apply(el, { k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f });
  }
  function local(el, e) {
    const r = el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  let drag = null; // {el, id, sx, sy, v, moved}
  const pts = new Map(); // pointerId -> [x, y] for pinch
  let pinch = null;
  let suppressClick = false;

  document.addEventListener("wheel", (e) => {
    const el = e.target.closest && e.target.closest(".bv");
    if (!el) return;
    init(el.parentNode);
    e.preventDefault();
    const [cx, cy] = local(el, e);
    zoomAt(el, Math.exp(-e.deltaY * 0.0015), cx, cy);
  }, { passive: false });

  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest && e.target.closest(".bv");
    if (!el || e.target.closest(".bv-ctrl") || e.button > 0) return;
    init(el.parentNode);
    pts.set(e.pointerId, local(el, e));
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { el, d: Math.hypot(a[0] - b[0], a[1] - b[1]) };
      drag = null;
      return;
    }
    drag = { el, id: e.pointerId, sx: e.clientX, sy: e.clientY, v: Object.assign({}, views.get(el.dataset.bv)), moved: false };
  });
  document.addEventListener("pointermove", (e) => {
    if (pts.has(e.pointerId) && pinch) {
      pts.set(e.pointerId, local(pinch.el, e));
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch.d) zoomAt(pinch.el, d / pinch.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      pinch.d = d;
      suppressClick = true;
      return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) { drag.moved = true; drag.el.classList.add("dragging"); try { drag.el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } }
    apply(drag.el, { k: drag.v.k, x: drag.v.x + dx, y: drag.v.y + dy });
  });
  function end(e) {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (drag && e.pointerId === drag.id) {
      if (drag.moved) suppressClick = true;
      drag.el.classList.remove("dragging");
      drag = null;
    }
  }
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);
  // A drag must not count as a click on the tile under the pointer.
  document.addEventListener("click", (e) => {
    if (suppressClick) {
      suppressClick = false;
      if (e.target.closest && e.target.closest(".bv")) { e.stopPropagation(); e.preventDefault(); }
      return;
    }
    const b = e.target.closest && e.target.closest("[data-bv-act]");
    if (!b) return;
    e.stopPropagation();
    e.preventDefault();
    const el = b.closest(".bv");
    init(el.parentNode);
    const act = b.dataset.bvAct;
    if (act === "full") {
      el.classList.toggle("bv-full");
      document.body.classList.toggle("bv-lock", !!document.querySelector(".bv.bv-full"));
      const v = fit(el);
      if (v) apply(el, v);
    } else zoomAt(el, act === "in" ? 1.3 : 1 / 1.3, el.clientWidth / 2, el.clientHeight / 2);
  }, true);
  document.addEventListener("dblclick", (e) => {
    const el = e.target.closest && e.target.closest(".bv");
    if (!el || e.target.closest(".bv-ctrl")) return;
    const v = fit(el);
    if (v) apply(el, v);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const el = document.querySelector(".bv.bv-full");
    if (!el) return;
    e.stopPropagation();
    el.classList.remove("bv-full");
    document.body.classList.remove("bv-lock");
    const v = fit(el);
    if (v) apply(el, v);
  }, true);
  // Boards inside a <details> are measured when it opens.
  document.addEventListener("toggle", (e) => { if (e.target.open) init(e.target); }, true);
  window.addEventListener("resize", () => init());

  function forget(key) { views.delete(key); }

  window.HoloBoardView = { html, init, forget, glyph };
})();
