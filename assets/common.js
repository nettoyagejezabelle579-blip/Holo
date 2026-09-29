/* Shared helpers for the holodori card database. */
(function () {
  "use strict";

  const D = window.HOLO_DATA;
  const ANN = window.HOLO_ANNOUNCED || { banners: [], cards: [] };
  const ART = window.HOLO_ART || {};
  const JACKETS = window.HOLO_JACKETS || {};
  const JACKET_FILES = window.HOLO_JACKET_FILES || {};
  const CFG = Object.assign({ artBase: "", newDays: 14, remoteCardArt: "", remoteCardFull: "", remoteJacket: "" }, window.HOLO_CONFIG || {});
  // <img> that walks a list of sources and finally removes itself (the generated face shows through).
  function imgChain(urls, alt, extra) {
    urls = urls.filter(Boolean);
    if (!urls.length) return "";
    const rest = esc(JSON.stringify(urls.slice(1)));
    return `<img loading="lazy" alt="${esc(alt)}" src="${esc(urls[0])}" data-next="${rest}" ${extra || ""}
      onerror="var n=JSON.parse(this.dataset.next||'[]');if(n.length){this.dataset.next=JSON.stringify(n.slice(1));this.src=n[0];}else{if(this.parentNode&&this.parentNode.classList)this.parentNode.classList.remove('has-img');this.remove();}">`;
  }
  const fill = (tpl, id) => (tpl && id ? tpl.split("{id}").join(id) : "");

  // ---------- storage ----------
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem("holodori:" + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem("holodori:" + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  // ---------- i18n ----------
  const STR = {
    en: {
      home: "Home", cards: "Cards", songs: "Songs", myData: "My Data", optimizer: "Team Optimizer", teamDetails: "Team Details", talents: "Talents", search: "Search cards, talents, skills…",
      filters: "Filters", reset: "Reset", results: "{n} cards", rarity: "Rarity", attribute: "Type",
      cute: "Cute", happy: "Happy", pure: "Pure", availability: "Availability", standard: "Standard",
      limited: "Limited", announced: "Announced", banner: "Banner", branch: "Branch", unit: "Unit / Generation",
      talent: "Talent", skillEffect: "Skill effect", slot: "Skill slot", anySlot: "Any", condition: "Condition",
      target: "Passive target", collection: "Collection", all: "All", owned: "Owned", notOwned: "Not owned",
      favorites: "Favorites", sort: "Sort", release: "Release date", total: "Total", performance: "Performance",
      technique: "Technique", sense: "Sense", name: "Card name", talentOrder: "Talent", ctime: "Active cooldown",
      prob: "Active chance", view: "View", grid: "Grid", compact: "Compact", list: "List", table: "Table",
      statMode: "Stats at", lv1: "Lv 1", maxLv: "Max Lv", maxPot: "Max Lv + Potential 5", level: "Level",
      potential: "Potential", limitBreak: "Limit break", active: "Active skill", special: "Special skill",
      passive: "Passive skill", leader: "Leader outfit", board: "Holomem board", released: "Released",
      firstSeen: "First datamined", obtain: "Obtain", gacha: "Gacha", birthday: "Birthday", debut: "Debut",
      cooldown: "Cooldown", duration: "Duration", chance: "Chance", noResults: "No cards match these filters.",
      copyLink: "Copy link", copied: "Copied!", compare: "Compare", addCompare: "+ Compare",
      inCompare: "✓ Comparing", clear: "Clear", close: "Close", prev: "Previous", next: "Next",
      showAllLevels: "Show all skill levels", statsByLb: "Stats by limit break", includeAnnounced: "Show announced cards",
      pendingData: "Stats and skills are not in the master data yet.", newBadge: "New",
      latest: "Latest information", currentBanner: "Current & upcoming banners", recentCards: "Newest cards",
      live: "Live", upcoming: "Upcoming", ended: "Ended", viewAll: "View all cards →", dataVersion: "Data",
      export: "Export collection", import: "Import collection", ownedCount: "{a} / {b} owned",
      skill_score_up: "Score UP", skill_score_support: "Score Support", skill_skill_rate_up: "Skill Rate UP",
      skill_life_recovery: "Restore LIFE", skill_judgement_boost: "JDG. Boost", skill_performance_up: "Performance UP",
      skill_technique_up: "Technique UP", skill_sense_up: "Sense UP", skill_all_stats_up: "All Stats UP",
      skill_skill_effect_up: "Score Support (team)",
      trig_deck_attribute: "Type count in team", trig_deck_group: "Unit members in team", trig_leader_talent: "Specific leader",
      trig_leader_group: "Leader's unit", trig_song_talent: "Talent's song", trig_combo: "Combo ≥", trig_life_high: "LIFE ≥",
      trig_life_low: "LIFE ≤", trig_judgement: "Judgement", trig_other: "Other",
      tgt_self: "Self", tgt_all: "All members", tgt_attribute: "Members of a type", tgt_character_grouping: "Unit members",
      tgt_character: "Specific talent", pot_active_skill_level_up: "Active skill Lv 2",
      pot_special_skill_level_up: "Special skill Lv 2", pot_passive_skill_level_up: "Passive skill Lv 2",
      pot_all_parameter_up_permil_up: "All stats +{v}%", pot_skill_tree_connect_effect_level_up: "Holomem board effect Lv 2",
      launchStandard: "Launch (standard pool)",
    },
    ja: {
      home: "ホーム", cards: "カード", songs: "楽曲", myData: "所持データ", optimizer: "編成最適化", teamDetails: "編成詳細", talents: "タレント", search: "カード名・タレント・スキルで検索…",
      filters: "絞り込み", reset: "リセット", results: "{n}枚", rarity: "レアリティ", attribute: "タイプ",
      cute: "キュート", happy: "ハッピー", pure: "ピュア", availability: "入手区分", standard: "恒常",
      limited: "限定", announced: "発表済み", banner: "ガチャ", branch: "ブランチ", unit: "ユニット・期",
      talent: "タレント", skillEffect: "スキル効果", slot: "スキル枠", anySlot: "すべて", condition: "発動条件",
      target: "パッシブ対象", collection: "所持", all: "すべて", owned: "所持", notOwned: "未所持",
      favorites: "お気に入り", sort: "並び替え", release: "実装日", total: "総合値", performance: "パフォーマンス",
      technique: "テクニック", sense: "センス", name: "カード名", talentOrder: "タレント", ctime: "アクティブCT",
      prob: "発動確率", view: "表示", grid: "グリッド", compact: "コンパクト", list: "リスト", table: "テーブル",
      statMode: "ステータス", lv1: "Lv1", maxLv: "最大Lv", maxPot: "最大Lv＋ポテンシャル5", level: "レベル",
      potential: "ポテンシャル", limitBreak: "限界突破", active: "アクティブスキル", special: "スペシャルスキル",
      passive: "パッシブスキル", leader: "リーダー衣装", board: "ホロメンボード", released: "実装日",
      firstSeen: "データ初出", obtain: "入手方法", gacha: "ガチャ", birthday: "誕生日", debut: "デビュー",
      cooldown: "CT", duration: "効果時間", chance: "確率", noResults: "条件に一致するカードがありません。",
      copyLink: "リンクをコピー", copied: "コピーしました", compare: "比較", addCompare: "＋比較",
      inCompare: "✓ 比較中", clear: "クリア", close: "閉じる", prev: "前へ", next: "次へ",
      showAllLevels: "全スキルレベルを表示", statsByLb: "限界突破別ステータス", includeAnnounced: "発表済みカードを表示",
      pendingData: "ステータスとスキルはまだマスターデータにありません。", newBadge: "NEW",
      latest: "最新情報", currentBanner: "開催中・開催予定のガチャ", recentCards: "最新カード",
      live: "開催中", upcoming: "開催予定", ended: "終了", viewAll: "カード一覧へ →", dataVersion: "データ",
      export: "所持データを書き出し", import: "所持データを読み込み", ownedCount: "{a} / {b} 所持",
      skill_score_up: "スコアUP", skill_score_support: "スコアサポート", skill_skill_rate_up: "スキル発動率UP",
      skill_life_recovery: "ライフ回復", skill_judgement_boost: "判定強化", skill_performance_up: "パフォーマンスUP",
      skill_technique_up: "テクニックUP", skill_sense_up: "センスUP", skill_all_stats_up: "全パラメータUP",
      skill_skill_effect_up: "スコアサポート（全体）",
      trig_deck_attribute: "編成タイプ数", trig_deck_group: "編成ユニット数", trig_leader_talent: "特定リーダー",
      trig_leader_group: "リーダーのユニット", trig_song_talent: "タレントの楽曲", trig_combo: "コンボ数", trig_life_high: "ライフ以上",
      trig_life_low: "ライフ以下", trig_judgement: "判定", trig_other: "その他",
      tgt_self: "自身", tgt_all: "全員", tgt_attribute: "特定タイプ", tgt_character_grouping: "ユニットメンバー",
      tgt_character: "特定タレント", pot_active_skill_level_up: "アクティブスキルLv2",
      pot_special_skill_level_up: "スペシャルスキルLv2", pot_passive_skill_level_up: "パッシブスキルLv2",
      pot_all_parameter_up_permil_up: "全パラメータ +{v}%", pot_skill_tree_connect_effect_level_up: "ボード効果Lv2",
      launchStandard: "リリース（恒常）",
    },
    zh: {
      home: "首頁", cards: "卡片", songs: "樂曲", myData: "遊戲進度資料", optimizer: "隊伍最佳化", teamDetails: "隊伍詳情", talents: "Holo成員", search: "搜尋卡片名稱、成員、技能…",
      filters: "篩選", reset: "重置", results: "{n} 張", rarity: "稀有度", attribute: "類型",
      cute: "可愛", happy: "快樂", pure: "清純", availability: "取得方式", standard: "常駐",
      limited: "限定", announced: "已公布", banner: "轉蛋", branch: "分部", unit: "組合・期",
      talent: "Holo成員", skillEffect: "技能效果", slot: "技能種類", anySlot: "全部", condition: "發動條件",
      target: "被動技能對象", collection: "持有", all: "全部", owned: "已持有", notOwned: "未持有",
      favorites: "收藏", sort: "排序", release: "上線日期", total: "綜合", performance: "表現力",
      technique: "技巧", sense: "品味", name: "卡片名稱", talentOrder: "Holo成員", ctime: "主動技能冷卻",
      prob: "發動機率", view: "顯示", grid: "網格", compact: "緊湊", list: "列表", table: "表格",
      statMode: "能力值", lv1: "Lv1", maxLv: "最高等級", maxPot: "最高等級＋綻放5", level: "等級",
      potential: "綻放", limitBreak: "特訓", active: "主動技能", special: "特殊技能",
      passive: "被動技能", leader: "隊長服裝", board: "Holo成員面板", released: "上線日期",
      firstSeen: "資料首次出現", obtain: "取得方式", gacha: "轉蛋", birthday: "生日", debut: "出道",
      cooldown: "冷卻", duration: "持續時間", chance: "機率", noResults: "沒有符合條件的卡片。",
      copyLink: "複製連結", copied: "已複製", compare: "比較", addCompare: "＋比較",
      inCompare: "✓ 比較中", clear: "清除", close: "關閉", prev: "上一張", next: "下一張",
      showAllLevels: "顯示所有技能等級", statsByLb: "各特訓階段能力值", includeAnnounced: "顯示已公布卡片",
      pendingData: "能力值與技能尚未收錄於遊戲資料。", newBadge: "NEW",
      latest: "最新資訊", currentBanner: "舉辦中・即將舉辦的轉蛋", recentCards: "最新卡片",
      live: "舉辦中", upcoming: "即將舉辦", ended: "已結束", viewAll: "查看全部卡片 →", dataVersion: "資料",
      export: "匯出持有資料", import: "匯入持有資料", ownedCount: "已持有 {a} / {b}",
      skill_score_up: "分數UP", skill_score_support: "分數支援", skill_skill_rate_up: "技能發動率UP",
      skill_life_recovery: "回復生命值", skill_judgement_boost: "判定強化", skill_performance_up: "表現力UP",
      skill_technique_up: "技巧UP", skill_sense_up: "品味UP", skill_all_stats_up: "全能力UP",
      skill_skill_effect_up: "分數支援（全體）",
      trig_deck_attribute: "隊伍類型人數", trig_deck_group: "隊伍組合人數", trig_leader_talent: "指定隊長",
      trig_leader_group: "隊長所屬組合", trig_song_talent: "成員的樂曲", trig_combo: "連擊數", trig_life_high: "生命值以上",
      trig_life_low: "生命值以下", trig_judgement: "判定", trig_other: "其他",
      tgt_self: "自身", tgt_all: "全體", tgt_attribute: "指定類型", tgt_character_grouping: "組合成員",
      tgt_character: "指定成員", pot_active_skill_level_up: "主動技能Lv2",
      pot_special_skill_level_up: "特殊技能Lv2", pot_passive_skill_level_up: "被動技能Lv2",
      pot_all_parameter_up_permil_up: "全能力 +{v}%", pot_skill_tree_connect_effect_level_up: "面板協力效果Lv2",
      launchStandard: "上線（常駐）",
    },
  };

  const LANGS = [["en", "EN"], ["ja", "日本語"], ["zh", "繁中"]];
  const HTML_LANG = { en: "en", ja: "ja", zh: "zh-Hant" };
  function detectLang() {
    const n = (navigator.language || "en").toLowerCase();
    if (n.startsWith("ja")) return "ja";
    if (n.startsWith("zh")) return "zh";
    return "en";
  }
  let lang = store.get("lang", detectLang());
  if (!LANGS.some(([k]) => k === lang)) lang = "en";
  function t(key, vars) {
    let s = (STR[lang] && STR[lang][key]) || STR.en[key] || key;
    if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
    return s;
  }
  function L(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[lang] || obj.en || "";
  }
  function setLang(l) {
    lang = l;
    store.set("lang", l);
    document.documentElement.lang = HTML_LANG[l] || l;
  }

  // ---------- theme ----------
  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }
  applyTheme(store.get("theme", "auto"));
  function cycleTheme() {
    const order = ["auto", "light", "dark"];
    const next = order[(order.indexOf(store.get("theme", "auto")) + 1) % order.length];
    store.set("theme", next);
    applyTheme(next);
    return next;
  }

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function richText(s) {
    return esc(s)
      .replace(/\[highlight\]([\s\S]*?)\[\/highlight\]/g, "<mark>$1</mark>")
      .replace(/\[attribute=(\w+)\]([\s\S]*?)\[\/attribute\]/g, '<span class="attr-text-$1">$2</span>')
      .replace(/\[\/?[a-z]+(=[^\]]*)?\]/g, "")
      .replace(/\n/g, "<br>");
  }
  const plain = (s) => String(s || "").replace(/\[[^\]]*\]/g, "");
  const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
  const stars = (n) => "★".repeat(n);

  // ---------- data model ----------
  const talents = D.talents;
  const bannerList = D.banners.concat(ANN.banners.map((b) => Object.assign({ announced: true }, b)));
  const banners = Object.fromEntries(bannerList.map((b) => [b.id, b]));

  const cards = D.cards.map((c) => Object.assign({ announced: false }, c));
  for (const a of ANN.cards) {
    // Skip announcements whose talent already has a real card in that banner.
    if (cards.some((c) => c.chr === a.chr && c.banner === a.banner)) continue;
    cards.push(Object.assign({
      announced: true, attr: null, dist: null, skills: { active: [], special: [], passive: [] },
      leader: null, board: null, order: 100000, asset: null,
    }, a));
  }
  const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));

  function maxLevel(card) {
    const lim = D.limits[card.limitGroup];
    return lim ? lim[lim.length - 1] : 1;
  }
  function limitBreakFor(card, level) {
    const lim = D.limits[card.limitGroup] || [];
    for (let i = 0; i < lim.length; i++) if (level <= lim[i]) return i;
    return lim.length - 1;
  }
  function potentialBonus(card, pot) {
    let bonus = 0;
    for (const p of D.potentials[card.potentialGroup] || []) {
      if (p.n <= pot && p.type === "all_parameter_up_permil_up") bonus += p.value;
    }
    return bonus;
  }
  // Returns [performance, technique, sense, total] for a level and potential count.
  function stats(card, level, pot) {
    if (!card.dist) return null;
    const curve = D.levels[card.levelGroup];
    const lv = Math.max(1, Math.min(level, curve.length));
    const base = curve[lv - 1];
    const mul = 1 + potentialBonus(card, pot || 0) / 1000;
    const s = card.dist.map((d) => Math.round((base * d) / 1000 * mul));
    s.push(s[0] + s[1] + s[2]);
    return s;
  }
  function statsForMode(card, mode) {
    if (mode === "lv1") return stats(card, 1, 0);
    if (mode === "maxpot") return stats(card, maxLevel(card), 5);
    return stats(card, maxLevel(card), 0);
  }
  // Skill level unlocked at a given potential count.
  function skillLevelAt(card, slot, pot) {
    const map = { active: "active_skill_level_up", special: "special_skill_level_up", passive: "passive_skill_level_up", board: "skill_tree_connect_effect_level_up" };
    let lv = 1;
    for (const p of D.potentials[card.potentialGroup] || []) if (p.n <= pot && p.type === map[slot]) lv = p.value;
    return lv;
  }
  function isNew(card) {
    const d = new Date(card.release + "T00:00:00+09:00");
    return (Date.now() - d.getTime()) / 86400000 <= CFG.newDays && Date.now() >= d.getTime() - 86400000 * 7;
  }
  function talentGroupNames(chr) {
    const tl = talents[chr];
    return tl ? tl.groups.map((g) => L(D.groups[g] && D.groups[g].name)).filter(Boolean) : [];
  }

  // ---------- art ----------
  function artHTML(card, opts) {
    opts = opts || {};
    const tl = talents[card.chr] || { color: "#888", color2: "#555", short: { en: "?" } };
    const badges = [];
    if (card.attr) badges.push(`<span class="badge ${card.attr}">${esc(t(card.attr))}</span>`);
    if (card.announced) badges.push(`<span class="badge announced">${esc(t("announced"))}</span>`);
    else if (card.limited) badges.push(`<span class="badge limited">${esc(t("limited"))}</span>`);
    if (isNew(card) && !opts.noNew) badges.push(`<span class="badge new">${esc(t("newBadge"))}</span>`);
    const kinds = ART[card.id] || [];
    const local = opts.full && kinds.includes("full") ? artUrl(card.id, "full")
      : kinds.includes("icon") ? artUrl(card.id, "icon") : kinds.includes("vert") ? artUrl(card.id, "vert") : "";
    const remote = card.asset ? (opts.full ? fill(CFG.remoteCardFull, card.asset) : fill(CFG.remoteCardArt, card.asset)) : "";
    const kind = local ? (opts.full && kinds.includes("full") ? "full" : kinds.includes("icon") ? "icon" : "remote") : remote ? "remote" : null;
    const alt = L(tl.name) + " " + L(card.title);
    const img = imgChain([local, remote, !opts.full ? "" : fill(CFG.remoteCardArt, card.asset)], alt);
    return `<div class="art ${kind ? "has-img art-" + kind : ""}" style="--c1:${esc(tl.color)};--c2:${esc(tl.color2)}">` +
      `<div class="art-name">${esc(L(tl.short))}</div>${img}` +
      `<div class="badges">${badges.join("")}</div>` +
      `<div class="stars" aria-label="${card.rarity} star">${stars(card.rarity)}</div></div>`;
  }
  // Song cover (jacket) with a generated fallback.
  function jacketHTML(song, cls) {
    const title = L(song.title);
    const base = (document.body.dataset.base || ".") + "/assets/jackets/";
    const urls = [JACKET_FILES[song.id] ? base + JACKET_FILES[song.id] : "", JACKETS[song.id], fill(CFG.remoteJacket, song.jacket || song.id)];
    const hue = [...song.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
    return `<div class="jacket ${cls || ""}" style="--h:${hue}">` +
      `<span class="jacket-fallback">${esc(title.slice(0, 24))}</span>` +
      imgChain(urls, title) + `</div>`;
  }
  function artUrl(id, kind) {
    const base = CFG.artBase || (document.body.dataset.base || ".") + "/assets/art";
    return base.replace(/\/$/, "") + "/" + kind + "/" + id + ".webp";
  }
  function hasArt(id, kind) {
    if ((ART[id] || []).includes(kind || "icon")) return true;
    const c = cardById[id];
    return !!(c && c.asset && (kind === "full" ? CFG.remoteCardFull : CFG.remoteCardArt));
  }
  // Best image URL for a card (bundled first, then remote).
  function cardImageUrls(id, kind) {
    const c = cardById[id];
    const out = [];
    if ((ART[id] || []).includes(kind)) out.push(artUrl(id, kind));
    if (kind === "icon" && (ART[id] || []).includes("vert")) out.push(artUrl(id, "vert"));
    if (c && c.asset) out.push(fill(kind === "full" ? CFG.remoteCardFull : CFG.remoteCardArt, c.asset));
    if (kind === "full" && (ART[id] || []).includes("vert")) out.push(artUrl(id, "vert"));
    if (kind === "full" && c && c.asset) out.push(fill(CFG.remoteCardArt, c.asset));
    return out.filter(Boolean);
  }

  // ---------- progress (owned cards, levels, bloom, holomem ranks, memories) ----------
  function loadProgress() {
    const p = store.get("progress", null) || { v: 1, cards: {}, ranks: {}, board: {}, memories: 0 };
    p.cards = p.cards || {}; p.ranks = p.ranks || {}; p.board = p.board || {}; p.connect = p.connect || {}; p.memories = p.memories || 0;
    delete p.boardPct;
    // Migrate the older "owned" list from the card database.
    const legacy = store.get("owned", null);
    if (legacy && legacy.length) {
      for (const id of legacy) if (cardById[id] && !p.cards[id]) p.cards[id] = { lv: maxLevel(cardById[id]), bloom: 0 };
      store.set("owned", []);
    }
    return p;
  }
  const progress = loadProgress();
  const owned = new Set(Object.keys(progress.cards));
  function saveProgress() {
    progress.updated = new Date().toISOString();
    store.set("progress", progress);
    owned.clear();
    for (const id in progress.cards) owned.add(id);
  }
  function setCardProgress(id, value) {
    if (value) progress.cards[id] = Object.assign({ lv: maxLevel(cardById[id]), bloom: 0 }, progress.cards[id] || {}, value);
    else delete progress.cards[id];
    saveProgress();
  }
  function replaceProgress(p) {
    for (const k of Object.keys(progress)) delete progress[k];
    Object.assign(progress, { v: 1, cards: {}, ranks: {}, board: {}, memories: 0 }, p);
    saveProgress();
  }
  const favorites = new Set(store.get("favorites", []));
  function toggleOwned(id) {
    setCardProgress(id, owned.has(id) ? null : {});
    return owned.has(id);
  }
  function toggleFavorite(id) {
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    store.set("favorites", [...favorites]);
    return favorites.has(id);
  }

  // ---------- header ----------
  function renderHeader(active, onChange) {
    const base = document.body.dataset.base || ".";
    const el = document.getElementById("site-header");
    const themeIcon = { auto: "◐", light: "☀", dark: "☾" };
    const draw = () => {
      el.innerHTML = `
        <a class="brand" href="${base}/index.html">holo<span>dori</span> DB</a>
        <nav class="nav">
          <a href="${base}/index.html" class="${active === "home" ? "active" : ""}">${esc(t("home"))}</a>
          <a href="${base}/cards/index.html" class="${active === "cards" ? "active" : ""}">${esc(t("cards"))}</a>
          <a href="${base}/songs/index.html" class="${active === "songs" ? "active" : ""}">${esc(t("songs"))}</a>
          <a href="${base}/my/index.html" class="${active === "my" ? "active" : ""}">${esc(t("myData"))}</a>
          <a href="${base}/team/index.html" class="${active === "optimizer" ? "active" : ""}">${esc(t("optimizer"))}</a>
          <a href="${base}/team/details.html" class="${active === "details" ? "active" : ""}">${esc(t("teamDetails"))}</a>
        </nav>
        <div class="header-actions">
          <select class="icon-btn" id="lang-btn" title="Language" aria-label="Language">${LANGS.map(([k, label]) => `<option value="${k}" ${k === lang ? "selected" : ""}>${label}</option>`).join("")}</select>
          <button class="icon-btn" id="theme-btn" title="Theme">${themeIcon[store.get("theme", "auto")]}</button>
        </div>`;
      el.querySelector("#lang-btn").onchange = (e) => {
        setLang(e.target.value);
        draw();
        renderFooter();
        onChange && onChange();
      };
      el.querySelector("#theme-btn").onclick = () => {
        cycleTheme();
        draw();
      };
    };
    document.documentElement.lang = HTML_LANG[lang] || lang;
    draw();
  }

  const FOOTER = {
    en: "Unofficial fan-made database. Not affiliated with QualiArts Inc. or COVER Corp. hololive Dreams data © QualiArts / COVER Corp.",
    ja: "非公式のファンメイドデータベースです。QualiArts株式会社・カバー株式会社とは関係ありません。hololive Dreams のデータ © QualiArts / COVER Corp.",
    zh: "非官方粉絲自製資料庫，與QualiArts及COVER株式會社無關。hololive Dreams 資料 © QualiArts / COVER Corp.",
  };
  function renderFooter() {
    const el = document.getElementById("site-footer");
    if (!el) return;
    const g = D.generatedFrom || {};
    el.innerHTML = `${esc(FOOTER[lang] || FOOTER.en)}<br>${esc(t("dataVersion"))}: ${esc((g.masterVersion || "").slice(0, 12))} · ${esc((g.englishCommit || "").split(" ")[1] || "")}`;
    // Pages with per-language sections (e.g. the method page) show only the chosen language.
    document.querySelectorAll("[data-lang]").forEach((n) => { n.hidden = n.dataset.lang !== lang; });
  }

  window.Holo = {
    D, CFG, store, t, L, setLang, get lang() { return lang; }, esc, richText, plain, fmt, stars,
    talents, banners, bannerList, cards, cardById, maxLevel, limitBreakFor, potentialBonus, stats, statsForMode,
    skillLevelAt, isNew, talentGroupNames, artHTML, artUrl, hasArt, cardImageUrls, imgChain, jacketHTML, hasJacket: (id) => !!JACKETS[id], owned, favorites, toggleOwned, toggleFavorite,
    progress, saveProgress, setCardProgress, replaceProgress,
    renderHeader, renderFooter,
  };
})();
