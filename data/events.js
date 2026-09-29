// Live events: event songs and their bonus cards. Edit by hand for new events.
// Rules (Game8 / in-game event help):
//  - Live score: +10% on an event song when that song's bonus card is in the unit (applies once).
//  - Event Pt: +30% per event bonus card in the unit, +30% more for the event's new ★5 cards,
//    and a Bloom bonus up to +30% at full Bloom (+6% per Bloom stage).
window.HOLO_EVENTS = {
  rules: { scoreBonus: 0.10, ptPerCard: 0.30, ptNewCard: 0.30, ptBloomPerStage: 0.06 },
  events: [
    {
      id: "relay-003",
      name: { en: "Dreamy Deep Blue event", ja: "ドリーミー・ディープブルー イベント" },
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
      name: { en: "A Dreamy Summer Escape", ja: "夢幻のサマーエスケープ！？" },
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
