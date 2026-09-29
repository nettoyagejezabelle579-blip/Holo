// Site configuration.
// artBase: optional URL/folder with card art in icon/<cardId>.webp and full/<cardId>.webp.
//          Leave empty to use the bundled assets/art folder (see scripts/import_art.py).
window.HOLO_CONFIG = {
  artBase: "",
  // Remote image sources used when a card/song has no bundled image (loaded by your browser).
  // {id} = the game's asset id (e.g. 00023-5-uniq-0085-00 or m0548). Set to "" to disable.
  remoteCardArt: "https://api.holodori.best/api/asset/assetbundles/img_card_vert_{id}/img_card_vert_{id}.webp",
  remoteCardFull: "https://cdn.holodori.dev/assets/assetbundles/img_card_full_{id}/img_card_full_{id}_unsquished.webp",
  remoteJacket: "https://api.holodori.best/api/asset/assetbundles/img_music_jacket_{id}/img_music_jacket_{id}.webp",
  newDays: 14,
};
