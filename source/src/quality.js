// ============================================================================
// quality level, chosen before anything is built
// ============================================================================
// LV: 0 High, 1 Medium, 2 Low. Medium and Low keep every 2nd / 4th leaf, glint and pebble and bake fewer shadows;
// Low also drops anti-aliasing and uses coarser meshes, cheaper filtering and fewer light shaft steps.
// localStorage.abyssal = "level,pixels,detail". abyssalLoad is set while the world is built: still set on the next
// visit means that load crashed the tab, so this one runs a level lower.
const mob = matchMedia('(pointer:coarse)').matches, mem = navigator.deviceMemory;
const keep = (k, v) => { try { localStorage[k] = v; } catch {} };
let SV = [], LV, bad;
try { SV = (localStorage.abyssal || '').split(','); bad = localStorage.abyssalLoad; } catch {}
LV = SV[0] ? +SV[0] : mob ? (mem > 7 ? 1 : 2) : mem <= 4 ? 2 : 0;
if (!(LV === 0 || LV === 1 || LV === 2)) { LV = 1; SV = []; } // a damaged save: Medium, and forget its pixels and detail
// AMB: the extension's new tab plays the tour behind its clock (?ambient). It never draws above Medium, to spare the
// battery, and never writes the quality keys or the crash flag: those belong to the game, which may be loading next door
const AMB = new URLSearchParams(location.search).has('ambient');
if (bad && LV < 2 && !AMB) { SV = [++LV]; keep('abyssal', LV); }
if (AMB && LV < 1) LV = 1;
// WORLD: half size of the whole world (m); the hub is the detailed middle 384 m. GATE0: direction of the first region
const WORLD = 1200, GATE0 = 0.3927, SHADOW2 = LV ? 2048 : 4096, OHN = LV > 1 ? 401 : LV ? 601 : 801;
const THIN = 1 << LV, SHADOW = LV ? 2048 : 4096, AA = LV > 1 ? 1 : 4, WATER = LV > 1 ? 256 : 512, RAYN = LV > 1 ? 12 : 34;
