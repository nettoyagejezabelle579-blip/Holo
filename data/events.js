// Live events: event songs and their bonus cards. Edit by hand for new events.
// Rules (in-game Event bonus screen, 活動加成):
//  Score bonus (分數加成): +10% Live score on each designated song when that song's card is in the unit.
//  Acquisition bonus (獲得加成) for event badges/points:
//   - member bonus (成員加成): +30% for each event card in the unit
//   - holomem bonus (holo成員加成): +30% when the unit's holomem (leader) is one of the event holomems
//   - bloom bonus (綻放加成): per event holomem card in the unit, by rarity and Bloom stage 1-5
window.HOLO_EVENTS = {
  rules: {
    scoreBonus: 0.10,
    ptPerCard: 0.30,
    ptHolomem: 0.30,
    ptBloom: { 3: [0, 0.01, 0.01, 0.02, 0.02, 0.03], 4: [0, 0.06, 0.07, 0.08, 0.09, 0.10], 5: [0, 0.15, 0.18, 0.22, 0.26, 0.30] },
  },
  events: [
    {
      id: "relay-003",
      name: { en: "Dreamy Deep Blue event", ja: "夢みるブルーフロンティア イベント", zh: "夢幻的碧藍新天地 活動" },
      start: "2026-09-29",
      banner: "pickup-260929",
      songs: [
        { song: "m0548", chr: "chr-00023", cards: ["card-00023-5-uniq-0085-00"] },
        { song: "m0413", chr: "chr-00037", cards: ["card-00037-5-uniq-0086-00"] },
        { song: "m0358", chr: "chr-03009", cards: ["card-03009-5-uniq-0088-00"] },
        { song: "m0357", chr: "chr-04012", cards: ["card-04012-5-uniq-0087-00"] },
      ],
    },
    {
      id: "relay-002",
      name: { en: "A Dreamy Summer Escape", ja: "夢幻のサマーエスケープ！？", zh: "夢幻的夏日逃脫！？" },
      start: "2026-09-19",
      end: "2026-09-27",
      banner: "pickup-260919",
      songs: [
        { song: "m0349", chr: "chr-00004", cards: ["card-00004-5-uniq-0081-00"] },
        { song: "m0351", chr: "chr-04013", cards: ["card-04013-5-uniq-0083-00"] },
        { song: "m0350", chr: "chr-00035", cards: ["card-00035-5-uniq-0082-00"] },
        { song: "m0352", chr: "chr-03005", cards: ["card-03005-5-uniq-0084-00"] },
      ],
    },
  ],
};
