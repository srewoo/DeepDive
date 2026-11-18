// The extension's stills: source/extension/posters/<file>.jpg, 1920x1080 captures from the renderer on High with the
// HUD hidden (see store/README.md). Listed in the order the new tab shows them, one a day and the same for everyone,
// so the hub's six scenes come round between the sunken wonders. The build hands this list to the new tab
// (posters.js) and to the game's fallback slideshow, and refuses to run if a file is missing or unlisted.
//   [file number, caption]
export const POSTERS = [
  [1, 'Stone whale fluke'], [7, 'Great Pyramid of Giza'], [10, 'Eiffel Tower'], [15, 'Taj Mahal'],
  [2, 'Sunken ship'], [20, 'Golden Gate Bridge'], [13, 'Blue Mosque'], [17, 'Himeji Castle'],
  [3, 'Hall of light'], [24, 'Chichen Itza'], [8, 'Lighthouse of Alexandria'], [19, 'Statue of Liberty'],
  [4, 'Sponge garden'], [12, 'Windmills of Kinderdijk'], [16, 'Shwedagon Pagoda'], [25, 'Sydney Harbour Bridge'],
  [5, 'Kelp cathedral'], [9, 'Parthenon'], [18, 'Tō-ji Pagoda'], [22, 'Empire State Building'],
  [6, 'Purple grotto'], [14, 'Hagia Sophia'], [11, 'Big Ben'], [21, 'Space Needle'], [23, 'Moai of Rapa Nui'],
];

// How 7-25 were framed in dev.html: file number → __shot(wonder index, turn, dist, up, look, side), after __full(),
// at 1920x1080 (store/README.md). Kept so a still can be re-shot the same way after the world changes.
export const SHOTS = {
  7: [0, 0.7, 10, 1, 12, -0.22], 8: [5, 0.5, 18, 1.2, 10, -0.2], 9: [12, 0.6, 9, 1, 8, -0.22], 10: [6, 0.6, 16, 1, 9, -0.2],
  11: [8, 0.5, 12, 1, 8, -0.2], 12: [19, 0.4, 8, 1, 8, -0.22], 13: [34, 0.5, 8, 1, 12, -0.2], 14: [17, 0.5, 8, 1, 10, -0.2],
  15: [1, 0.3, 14, 2, 8, -0.22], 16: [30, 0.5, 9, 1, 7, -0.2], 17: [28, 0.5, 12, 1, 7, -0.2], 18: [29, 0.5, 11, 1, 6, -0.2],
  19: [41, 0.5, 11, 1, 6, -0.2], 20: [42, 0.4, 14, 1.5, 10, -0.2], 21: [49, 0.5, 13, 1, 8, -0.2], 22: [43, 0.5, 15, 1, 10, -0.2],
  23: [4, 0.5, 7, 0.8, 6, -0.22], 24: [44, 0.6, 8, 1, 9, -0.22], 25: [52, 0.4, 14, 1.5, 9, -0.2],
};

// as a plain script for the pages (the new tab, the fallback): `const POSTERS = [...]`
export const postersScript = () => `const POSTERS = ${JSON.stringify(POSTERS)};\n`;
