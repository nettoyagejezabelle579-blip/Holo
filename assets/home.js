/* Home page: overview and latest hololive Dreams information. */
(function () {
  "use strict";
  const H = window.Holo;
  const { t, L, esc, fmt } = H;
  const root = document.getElementById("home");

  const TEXT = {
    en: {
      title: "hololive Dreams card database",
      intro: "Every hololive Dreams card with stats at any level and potential, all skills, leader outfits, banners and the newest releases — searchable in English and Japanese.",
      cta: "Browse all cards",
      talentsN: "Playable talents", cardsN: "Cards", limitedN: "Limited ★5", bannersN: "Pick-up banners",
      launch: "Global launch", launchText: "hololive Dreams (QualiArts × COVER) launched worldwide on 2026-07-23 with 54 playable holomems, each with a ★3, ★4 and ★5 card.",
      topStats: "Highest total stats (Max Lv + Potential 5)",
    },
    ja: {
      title: "ホロドリ カードデータベース",
      intro: "ホロライブドリームスの全カードのステータス（任意レベル・ポテンシャル）、スキル、リーダー衣装、ガチャ、最新カードを日英で検索できます。",
      cta: "カード一覧を見る",
      talentsN: "プレイアブルタレント", cardsN: "カード", limitedN: "限定★5", bannersN: "ピックアップガチャ",
      launch: "グローバルリリース", launchText: "ホロライブドリームス（QualiArts × COVER）は2026年7月23日に全世界でリリース。54人のホロメンがそれぞれ★3・★4・★5カードを持っています。",
      topStats: "総合値ランキング（最大Lv＋ポテンシャル5）",
    },
  };
  const tx = (k) => TEXT[H.lang][k] || TEXT.en[k];

  function status(b) {
    const start = new Date(b.startsAt || b.date + "T11:00:00+09:00").getTime();
    const sorted = H.bannerList.filter((x) => x.id !== "launch").sort((a, c) => a.date.localeCompare(c.date));
    const next = sorted[sorted.findIndex((x) => x.id === b.id) + 1];
    const end = next ? new Date(next.startsAt || next.date + "T11:00:00+09:00").getTime() : Infinity;
    const now = Date.now();
    if (now < start) return "upcoming";
    if (now < end) return "live";
    return "ended";
  }

  function tile(c) {
    const tl = H.talents[c.chr];
    const s = H.statsForMode(c, "maxpot");
    return `<a class="tile" href="cards/index.html#${esc(c.id)}" style="text-decoration:none;color:inherit">
      ${H.artHTML(c)}
      <div class="tile-body"><div class="tile-title">${esc(L(c.title))}</div>
      <div class="tile-talent">${esc(L(tl.name))}</div>
      ${s ? `<div class="small muted">Σ ${fmt(s[3])}</div>` : `<div class="small muted">${esc(t("announced"))}</div>`}</div></a>`;
  }

  function render() {
    const real = H.cards.filter((c) => !c.announced);
    const pickups = H.bannerList.filter((b) => b.id !== "launch").sort((a, b) => b.date.localeCompare(a.date));
    const top = real.slice().sort((a, b) => H.statsForMode(b, "maxpot")[3] - H.statsForMode(a, "maxpot")[3]).slice(0, 10);

    root.innerHTML = `
      <section class="hero">
        <h1>${esc(tx("title"))}</h1>
        <p>${esc(tx("intro"))}</p>
        <a class="cta" href="cards/index.html">${esc(tx("cta"))} →</a>
      </section>
      <div class="stats-row">
        <div class="stat-card"><b>${Object.keys(H.talents).length}</b><span class="muted">${esc(tx("talentsN"))}</span></div>
        <div class="stat-card"><b>${real.length}</b><span class="muted">${esc(tx("cardsN"))}</span></div>
        <div class="stat-card"><b>${real.filter((c) => c.limited && c.rarity === 5).length}</b><span class="muted">${esc(tx("limitedN"))}</span></div>
        <div class="stat-card"><b>${pickups.length}</b><span class="muted">${esc(tx("bannersN"))}</span></div>
      </div>
      <section class="panel">
        <h2>${esc(t("latest"))}</h2>
        ${pickups.map((b) => {
          const st = status(b);
          const cards = H.cards.filter((c) => c.banner === b.id);
          return `<div class="banner-item">
            <h3>${esc(L(b.name))} <span class="status ${st}">${esc(t(st))}</span></h3>
            <div class="small muted">${esc(b.date)}${b.announced ? ` · ${esc(t("announced"))}` : ""}
              · <a href="cards/index.html?banner=${esc(b.id)}">${esc(t("cards"))} (${cards.length})</a></div>
            <div class="banner-cards">${cards.map(tile).join("")}</div>
          </div>`;
        }).join("")}
        <div class="banner-item">
          <h3>${esc(tx("launch"))} <span class="status ended">2026-07-23</span></h3>
          <p class="muted">${esc(tx("launchText"))}</p>
        </div>
      </section>
      <section class="panel">
        <h2>${esc(tx("topStats"))}</h2>
        <div class="banner-cards">${top.map(tile).join("")}</div>
        <p><a href="cards/index.html?sort=total&mode=maxpot">${esc(t("viewAll"))}</a></p>
      </section>`;
    H.renderFooter();
  }

  H.renderHeader("home", render);
  render();
})();
