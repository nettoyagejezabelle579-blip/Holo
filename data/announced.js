// Cards and banners that have been officially announced but are not yet in the
// datamined master data. Edit by hand; remove entries once scripts/update-data.sh
// picks the real cards up.
window.HOLO_ANNOUNCED = {
  banners: [
    {
      id: "pickup-260929",
      date: "2026-09-29",
      startsAt: "2026-09-29T11:00:00+09:00",
      name: { en: "Limited Pick-up: Marine & Koyori", ja: "限定ピックアップ：マリン＆こより" },
      source: "https://x.com/holo_dreams_en",
    },
  ],
  cards: [
    {
      id: "announced-00023-260929",
      chr: "chr-00023",
      title: { en: "Hoard the Loot!♡", ja: "Hoard the Loot!♡" },
      rarity: 5,
      banner: "pickup-260929",
      release: "2026-09-29",
      limited: true,
      note: {
        en: "Pirate-treasure summer card. Comes with both a Park Outfit and a Live Outfit. Stats and skills will appear once the master data updates.",
        ja: "海賊×お宝テーマの夏カード。パーク衣装とライブ衣装の両方が付属。ステータスとスキルはマスターデータ更新後に反映されます。",
      },
    },
    {
      id: "announced-00037-260929",
      chr: "chr-00037",
      title: { en: "A Glance of Adventure", ja: "A Glance of Adventure" },
      rarity: 5,
      banner: "pickup-260929",
      release: "2026-09-29",
      limited: true,
      note: {
        en: "Summer adventure themed card. Comes with both a Park Outfit and a Live Outfit. Stats and skills will appear once the master data updates.",
        ja: "夏の冒険テーマのカード。パーク衣装とライブ衣装の両方が付属。ステータスとスキルはマスターデータ更新後に反映されます。",
      },
    },
  ],
};
