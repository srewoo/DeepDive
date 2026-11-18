// ============================================================================
// creatures: whales, sharks, stingrays, turtles, seahorses, jellyfish; starfish and urchins on the seabed
// ============================================================================
// The swimmers are instances of a few meshes, moved entirely in the vertex shader (W_CRE) along paths that depend only
// on time, so the frame loop does nothing for them. Their paths are long and never quite repeat (Lissajous figures,
// or loops right round the world for the whales), so you meet them at odd times and places.
// Instance (12 floats): centre xyz, scale | extents xyz, angular speed | phase, kind, colour seed, path
// Path: 0 wander about the centre, 1 round the middle of the world (extent x = radius), 2 hover in place.
// Kinds: 0 whale, 1 shark, 2 stingray, 3 turtle, 4 seahorse, 5 jellyfish. Mesh vertex aux = how much a part bends.
const NKIND = 6;
const CM = () => WM + 10 + (WONDERS.length - NBIG); // first creature mesh id: the six swimmers, then starfish and urchin
// rings of ellipses along z (nose at +z); aux from bend(z)
function bodyRings(m, R, sides, bend) {
  const rings = R.map(([z, rx, ry, y0]) => Array.from({ length: sides }, (_, s) => { const a = s / sides * TAU; return m.v(cos(a) * rx, (y0 || 0) + sin(a) * ry * (sin(a) < 0 ? 0.85 : 1), z, bend(z)); }));
  for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < sides; s++) { const s2 = (s + 1) % sides; m.quad(rings[k][s], rings[k][s2], rings[k + 1][s2], rings[k + 1][s]); }
  const tip = (r, z) => { const c = m.v(0, 0, z, bend(z)); for (let s = 0; s < sides; s++) r === 0 ? m.tri(c, rings[0][(s + 1) % sides], rings[0][s]) : m.tri(c, rings[r][s], rings[r][(s + 1) % sides]); };
  tip(0, R[0][0] + 0.02); tip(R.length - 1, R[R.length - 1][0] - 0.02);
}
const fin = (m, pts, w, h, up, aux) => { const n = m.aux.length; m.sweep(pts, w, h, () => up); for (let i = n; i < m.aux.length; i++) m.aux[i] = aux; };
function meshWhale() { // a humpback, 14 m: long pectoral fins, broad flukes, a small dorsal hump
  const m = new Mesh(), bend = (z) => clamp((2.5 - z) / 9, 0, 1);
  bodyRings(m, [[7, 0.15, 0.12, -0.1], [6.6, 0.7, 0.6, -0.15], [5.8, 1.25, 1.05, -0.1], [4.5, 1.6, 1.35], [2.5, 1.65, 1.4], [0.5, 1.45, 1.25], [-1.5, 1.1, 0.95], [-3.5, 0.65, 0.6], [-5, 0.35, 0.38], [-6, 0.2, 0.22], [-6.6, 0.1, 0.12]], 18, bend);
  for (const s of [-1, 1]) {
    fin(m, [[0, 0, -6.5], [s * 1.2, 0, -6.9], [s * 2.2, 0, -7.2], [s * 2.7, 0, -7.0]], (k) => [1.0, 0.9, 0.6, 0.25][k], 0.12, [0, 1, 0], 1);
    fin(m, [[s * 1.3, -0.6, 3.6], [s * 2.8, -1.1, 2.2], [s * 4.3, -1.5, 0.6], [s * 5.0, -1.6, -0.3]], (k) => [0.8, 0.7, 0.5, 0.2][k], 0.12, [0, 1, 0], 0.15);
  }
  fin(m, [[0, 1.0, -2.2], [0, 1.35, -2.7], [0, 1.0, -3.2]], 0.2, 0.15, [1, 0, 0], 0.4);
  return m.build();
}
function meshShark() { // 3 m: torpedo body, tall dorsal fin, crescent tail, swept pectorals
  const m = new Mesh(), bend = (z) => clamp((0.4 - z) / 1.9, 0, 1);
  bodyRings(m, [[1.5, 0.03, 0.03, -0.02], [1.35, 0.18, 0.15, -0.02], [1.0, 0.32, 0.3], [0.4, 0.38, 0.36], [-0.3, 0.33, 0.32], [-0.9, 0.2, 0.22], [-1.3, 0.09, 0.12], [-1.5, 0.05, 0.07]], 12, bend);
  fin(m, [[0, 0.3, 0.15], [0, 0.55, 0], [0, 0.82, -0.18]], (k) => [0.55, 0.35, 0.08][k], 0.05, [1, 0, 0], 0.25);
  fin(m, [[0, 0, -1.45], [0, 0.35, -1.75], [0, 0.66, -1.97]], (k) => [0.3, 0.18, 0.05][k], 0.04, [1, 0, 0], 1);
  fin(m, [[0, 0, -1.45], [0, -0.25, -1.65], [0, -0.42, -1.76]], (k) => [0.25, 0.15, 0.05][k], 0.04, [1, 0, 0], 1);
  for (const s of [-1, 1]) fin(m, [[s * 0.3, -0.15, 0.45], [s * 0.6, -0.27, 0.25], [s * 0.88, -0.36, 0.02]], (k) => [0.35, 0.22, 0.08][k], 0.04, [0, 1, 0], 0.3);
  return m.build();
}
function meshRay() { // a giant stingray: round disc 2.6 m across, long whip tail
  const m = new Mesh(), NU = 28, M = 14, rings = [];
  for (let j = 0; j <= NU; j++) {
    const u = j / NU * 2 - 1, L = 0.95 * pow(max(1 - u * u, 0), 0.55) + 0.02, th = 0.13 * (1 - u * u) + 0.01, ring = [];
    for (let k = 0; k < M; k++) { const a = k / M * TAU; ring.push(m.v(u * 1.3, th * sin(a) * (0.6 + 0.4 * cos(a)), L * cos(a) - 0.05, 0)); }
    rings.push(ring);
  }
  for (let j = 0; j < NU; j++) for (let k = 0; k < M; k++) { const k2 = (k + 1) % M; m.quad(rings[j][k], rings[j + 1][k], rings[j + 1][k2], rings[j][k2]); }
  const n = m.aux.length; m.tube([[0, 0, -0.9], [0, 0, -1.6], [0, 0, -2.3], [0, 0, -3.0]], (k) => 0.06 * (1 - k / 3.4), 4, true);
  for (let i = n; i < m.aux.length; i++) m.aux[i] = 1;
  return m.build();
}
function meshTurtle() { // a sea turtle, shell 1.3 m: domed shell, head, long front flippers
  const parts = [], aux = (mm, a) => { mm.aux = mm.aux.map(() => a); return mm.build(); };
  parts.push(aux(icosphere(2, (x, y, z) => [x * 0.55, max(y, -0.3) * 0.32, z * 0.66]), 0));
  parts.push(aux(icosphere(1, (x, y, z) => [x * 0.13, 0.03 + y * 0.11, 0.8 + z * 0.17]), 0));
  const f = new Mesh();
  for (const s of [-1, 1]) {
    fin(f, [[s * 0.4, -0.02, 0.38], [s * 0.75, -0.04, 0.25], [s * 1.05, -0.08, 0.02]], (k) => [0.3, 0.22, 0.08][k], 0.05, [0, 1, 0], 1);
    fin(f, [[s * 0.33, -0.04, -0.5], [s * 0.48, -0.05, -0.68], [s * 0.56, -0.06, -0.8]], (k) => [0.2, 0.14, 0.05][k], 0.04, [0, 1, 0], 0.5);
  }
  parts.push(f.build());
  return mergeBuilt(parts);
}
function meshSeahorse() { // upright, 0.5 m: curled tail, arched body, long snout
  const m = new Mesh();
  m.tube([[0, 0.42, -0.02], [0, 0.32, 0.02], [0, 0.2, 0.03], [0, 0.1, 0], [0, 0.02, -0.05], [0, -0.02, -0.12], [0, 0.03, -0.17], [0, 0.07, -0.14]], (k) => [0.045, 0.06, 0.065, 0.055, 0.04, 0.025, 0.015, 0.008][k], 8, true, () => 0);
  m.tube([[0, 0.4, -0.02], [0, 0.48, 0.02]], 0.05, 8, true, () => 0);
  m.tube([[0, 0.455, 0.03], [0, 0.445, 0.14]], (k) => [0.018, 0.022][k], 6, true, () => 0);
  m.tube([[0, 0.49, 0.0], [0, 0.53, -0.02]], (k) => [0.02, 0.006][k], 5, true, () => 0);
  return m.build();
}
function meshJelly() { // bell 1 m across, trailing tentacles and frilled oral arms
  const m = new Mesh();
  mLathe(m, [[0.5, 0, 0], [0.48, 0.12, 0], [0.4, 0.28, 0], [0.25, 0.4, 0], [0, 0.44, 0]], 18, 0, 0, 0);
  for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, n = m.aux.length; m.tube([0, 1, 2, 3, 4].map((i) => [cos(a) * 0.45 * (1 - i * 0.04), -i * 0.35, sin(a) * 0.45 * (1 - i * 0.04)]), 0.012, 3, true); for (let i = n; i < m.aux.length; i++) m.aux[i] = 1; }
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4, n = m.aux.length; m.tube([0, 1, 2, 3].map((i) => [cos(a) * (0.06 + 0.04 * sin(i * 2)), -0.05 - i * 0.22, sin(a) * (0.06 + 0.04 * sin(i * 2))]), (i) => 0.045 * (1 - i / 4), 5, true); for (let i = n; i < m.aux.length; i++) m.aux[i] = 0.7; }
  return m.build();
}
function meshStar() { // a five-armed starfish, 0.5 m across
  const m = new Mesh(), N = 10, top = m.v(0, 0.06, 0, 0.9), bot = m.v(0, 0, 0, 0.6), o = [];
  for (let k = 0; k < N; k++) { const a = k / N * TAU, r = k % 2 ? 0.09 : 0.25; o.push(m.v(cos(a) * r, 0.015, sin(a) * r, k % 2 ? 0.7 : 1)); }
  for (let k = 0; k < N; k++) { const k2 = (k + 1) % N; m.tri(top, o[k2], o[k]); m.tri(bot, o[k], o[k2]); }
  return m.build();
}
function meshUrchin() { // a ball of long spines, 0.5 m across
  const m = icosphere(1, (x, y, z) => [x * 0.12, y * 0.1 + 0.08, z * 0.12]);
  for (const v of [[1, 0.2, 0], [-1, 0.2, 0], [0, 0.2, 1], [0, 0.2, -1], [0.7, 0.7, 0.7], [-0.7, 0.7, 0.7], [0.7, 0.7, -0.7], [-0.7, 0.7, -0.7], [0, 1, 0], [0.9, 0.5, -0.3], [-0.9, 0.5, 0.3], [0.3, 0.5, 0.9], [-0.3, 0.5, -0.9], [0.5, 0.9, 0], [-0.5, 0.9, 0], [0, 0.9, 0.5], [0, 0.9, -0.5], [0.8, 0.1, 0.6], [-0.8, 0.1, -0.6], [0.6, 0.1, -0.8], [-0.6, 0.1, 0.8]]) {
    const l = hypot(...v), d = v.map((c) => c / l); m.tube([[d[0] * 0.1, 0.08 + d[1] * 0.08, d[2] * 0.1], [d[0] * 0.26, 0.08 + d[1] * 0.24, d[2] * 0.26]], (k) => (k ? 0.002 : 0.012), 3, true, () => 0.5);
  }
  return m.build();
}
const meshCreatures = () => [meshWhale(), meshShark(), meshRay(), meshTurtle(), meshSeahorse(), meshJelly(), meshStar(), meshUrchin()];

// ---------------------------------------------------------------- where they live (called from makeWorld)
// ohAt: outer seabed height; groves: kelp groves [x, z, radius]; hubPaths: open water in the hub [x, y, z, radius]
function spawnCreatures(ohAt, groves, hubPaths) {
  rseed(60);
  const K = Array.from({ length: NKIND }, () => []);
  const add = (kind, x, y, z, sc, ex, ey, ez, w, path) => K[kind].push(x, y, z, sc, ex, ey, ez, w, rnd() * TAU, kind, rnd(), path);
  const spot = (r0, r1) => { const a = rnd() * TAU, r = rr(r0, r1); return [cos(a) * r, sin(a) * r]; };
  // the highest seabed under a box of the path, so it stays above it
  const top = (x, z, ex, ez) => { let h = -60; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) h = max(h, ohAt(x + i * ex / 2, z + j * ez / 2)); return h; };
  for (let i = 0; i < 6; i++) { const r = rr(470, 980); add(0, 0, rr(-11, -7), 0, rr(0.85, 1.15), r, 2, 60, rr(1.6, 2.4) / r, 1); }
  for (let n = 0, t = 0; n < 16 && t < 400; t++) { const [x, z] = spot(380, 1000), ex = rr(90, 200), ez = rr(90, 200), h = top(x, z, ex, ez); if (h > -24) continue; add(1, x, min(h + rr(10, 16), -7), z, rr(0.8, 1.4), ex, 3, ez, rr(2.2, 3.2) / max(ex, ez), 0); n++; }
  for (let n = 0, t = 0; n < 26 && t < 400; t++) { const [x, z] = spot(380, 1050), ex = rr(50, 110), ez = rr(50, 110), h = top(x, z, ex, ez); if (h > -12) continue; add(2, x, h + rr(2.5, 4), z, rr(0.8, 1.3), ex, 0.8, ez, rr(0.9, 1.4) / max(ex, ez), 0); n++; }
  for (let i = 0; i < 24; i++) { const [x, z] = spot(380, 1000), ex = rr(40, 90), ez = rr(40, 90); add(3, x, rr(-17, -9), z, rr(0.8, 1.2), ex, 3, ez, rr(0.6, 1.0) / max(ex, ez), 0); }
  for (const [x, y, z, r] of hubPaths) add(3, x, y, z, rr(0.8, 1.1), r * 0.6, 1.2, r * 0.6, 0.8 / r, 0);
  for (const [gx, gz, gr] of groves) for (let i = 0; i < 2 + (rnd() * 2 | 0); i++) { const a = rnd() * TAU, x = gx + cos(a) * gr * 1.05, z = gz + sin(a) * gr * 1.05; add(4, x, ohAt(x, z) + rr(2, 6), z, rr(1.1, 1.6), 0, 0, 0, 0, 2); }
  K[3].push(0, 0, 0, 0.7, 0, 0, 0, 0, 0, 3, 0.35, 3); // the companion turtle (path 3: beside the camera), shown once unlocked
  for (let c = 0; c < 14; c++) { const [cx, cz] = spot(350, 1050); for (let i = 0; i < 6 + (rnd() * 4 | 0); i++) add(5, cx + rr(-12, 12), rr(-14, -5), cz + rr(-12, 12), rr(0.6, 1.4), rr(4, 9), rr(1.5, 3), rr(4, 9), rr(0.03, 0.06), 0); }
  const ranges = []; let n = 0; for (const k of K) { ranges.push([n, k.length / 12]); n += k.length / 12; }
  return { data: new Float32Array(K.flat()), ranges };
}
