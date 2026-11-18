// ============================================================================
// wonders: sunken replicas of world landmarks (load-time, except monSD and the card data)
// ============================================================================
// Six landmarks from the encyclopedia of myearthtoy.com, rebuilt from boxes, lathes and (the moai) a signed distance
// field like the whale fluke. makeWorld puts each one on the flattest open seabed of its region, away from the camera
// path and the viewpoints, facing the middle of the world. A granite stele in front of each carries a gilded plaque
// (text drawn into a texture at load) and play.js shows the same details as a card when you swim close.
// They are solid: monSD() gives the camera a few analytic shapes per wonder, and the light bake in makeWorld sees them.
// Material 6 (masonry); the seed picks the stone: 0 sandstone, 1 marble, 2 travertine, 3 sarsen, 4 tuff, 5 red scoria,
// 6 limestone, 7 granite.
const WONDERS = [
  // name, where, built, size, fact, replica | site x, z, search radius, footprint radius, height, front
  ['Great Pyramid of Giza', 'Giza, Egypt', 'Built c. 2560 BC', 'Originally 146.6 m tall', 'Tomb of the pharaoh Khufu and the only one of the Seven Wonders of the Ancient World still standing. For about 3,800 years it was the tallest building on Earth.', 'Replica at 1:7', -78, -72, 6, 24, 21, 16],
  ['Taj Mahal', 'Agra, India', 'Built 1632–1653', '73 m tall', 'A white marble mausoleum built by the Mughal emperor Shah Jahan in memory of his wife, Mumtaz Mahal.', 'Replica at 1:4', 82, -62, 6, 19, 21, 13],
  ['Colosseum', 'Rome, Italy', 'Built AD 70–80', '48 m tall', 'The largest amphitheatre ever built. It held an estimated 50,000 to 80,000 spectators.', 'Replica at 1:5', -82, 62, 6, 16, 11, 12.5],
  ['Stonehenge', 'Wiltshire, England', 'Built c. 3000–2000 BC', 'Largest trilithon 7.3 m tall', 'Its stones line up with the sunrise at the summer solstice and the sunset at the winter solstice.', 'Replica at 4:5', 78, 64, 6, 15, 7, 13],
  ['Moai of Rapa Nui', 'Easter Island, Chile', 'Carved c. AD 1250–1500', 'About 4 m tall on average', 'Nearly 1,000 statues were carved from volcanic tuff. Most stand on stone platforms with their backs to the sea.', 'Life size', 104, 4, 6, 14, 9, 4.5],
  ['Lighthouse of Alexandria', 'Alexandria, Egypt', 'Built c. 280 BC', 'Over 100 m tall', 'One of the Seven Wonders of the Ancient World. Earthquakes brought it down by 1323, and its blocks were found on the harbour floor in 1994.', 'Replica at 1:4', -110, -14, 6, 12, 29, 8],
];
const SQRT2 = Math.SQRT2, ceil = Math.ceil;
// the sites are chosen clear of the camera path, the designed rock and the other set pieces; the terrain generator
// keeps random rock masses off them (CLEARS in world.js)
// The wonders lie in eight regions on a ring 800 m out, one beyond each canyon gate of the hub, ~600 m apart (1-2 min
// of swimming). Each region's seabed is levelled and kept free of random mesas (CLEARS with a flatten weight).
const REGIONS = [
  ['Egypt & Africa', 'Great Pyramid of Giza', 'Lighthouse of Alexandria', 'Great Sphinx of Giza', 'Abu Simbel', 'Karnak Temple', 'Pyramid of Djoser', 'Great Mosque of Djenné', 'Church of St George'],
  ['Greece & Rome', 'Colosseum', 'Parthenon', 'Pantheon', 'Leaning Tower of Pisa', 'Rialto Bridge', 'Florence Cathedral', 'Temple of Artemis', 'Colossus of Rhodes', 'Mausoleum at Halicarnassus'],
  ['Western Europe', 'Stonehenge', 'Eiffel Tower', 'Big Ben', 'Tower Bridge', 'Arc de Triomphe', 'Notre-Dame de Paris', 'White Tower', 'Windmills of Kinderdijk', 'Sagrada Família', 'Neuschwanstein Castle', 'Brandenburg Gate'],
  ['Eastern Europe & the Near East', 'Hagia Sophia', 'Blue Mosque', 'Saint Basil’s Cathedral', 'Treasury of Petra', 'Persepolis'],
  ['South Asia', 'Taj Mahal', 'Qutub Minar', 'Gateway of India', 'Shwedagon Pagoda', 'Angkor Wat', 'Borobudur'],
  ['East Asia', 'Great Wall of China', 'Forbidden City', 'Temple of Heaven', 'Himeji Castle', 'Tō-ji Pagoda'],
  ['North America', 'Statue of Liberty', 'Golden Gate Bridge', 'Empire State Building', 'Washington Monument', 'Lincoln Memorial', 'Gateway Arch', 'Space Needle'],
  ['Mesoamerica & the Pacific', 'Chichen Itza', 'Machu Picchu', 'Pyramid of the Sun', 'Tikal Temple I', 'Moai of Rapa Nui', 'Sydney Harbour Bridge'],
];
const REGR = 800, REGS = 190; // ring radius; how far from its centre a region's wonders lie
const REGC = REGIONS.map((r, k) => { const a = GATE0 + k * PI / 4; return [cos(a) * REGR, sin(a) * REGR]; });
for (const [x, z] of REGC) CLEARS.push([x, z, x, z, REGS + 25, 40, 1]);
const WM = 26; // first wonder mesh id: 26 pyramid, 27 taj, 28 colosseum, 29 stonehenge, 30 ahu, 31 moai, 32 pukao, 33 pharos, 34 block, 35 stele
// placed wonders: x, z, footprint radius, base y, facing (yaw of local +z). MB per wonder: x, z, reach, first shape, end shape, top y, base y.
// SH: 12 floats per collision shape: type, x, y, z, cos yaw, sin yaw, then 6 parameters
let WP = new Float32Array(0), WREG = new Int8Array(0), MB = new Float32Array(0), SH = new Float32Array(0);
const NBIG = WONDERS.length, MINI = []; // the six large wonders come first; landmarks.js appends the rest

// ---------------------------------------------------------------- collision (per frame: no allocation)
function shapeSD(s, x, y, z) {
  const t = SH[s], dx = x - SH[s + 1], dy = y - SH[s + 2], dz = z - SH[s + 3], c = SH[s + 4], sn = SH[s + 5];
  const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
  if (t === 0) { // box
    const qx = abs(lx) - SH[s + 6], qy = abs(dy) - SH[s + 7], qz = abs(lz) - SH[s + 8], ax = max(qx, 0), ay = max(qy, 0), az = max(qz, 0);
    return -(sqrt(ax * ax + ay * ay + az * az) + min(max(qx, max(qy, qz)), 0));
  }
  if (t === 1) { // vertical cylinder
    const qr = sqrt(lx * lx + lz * lz) - SH[s + 6], qy = abs(dy) - SH[s + 7], ar = max(qr, 0), ay = max(qy, 0);
    return -(sqrt(ar * ar + ay * ay) + min(max(qr, qy), 0));
  }
  if (t === 2) { // pyramid: half base, height (y from its base)
    if (dy < 0) return dy;
    return min(dy, (SH[s + 6] * (1 - dy / SH[s + 7]) - max(abs(lx), abs(lz))) * 0.84);
  }
  // elliptic wall: half axes a, b, half thickness, height, angle range
  const ex = lx / SH[s + 6], ez = lz / SH[s + 7], th = atan2(ez, ex);
  if (th < SH[s + 10] || th > SH[s + 11]) return -1;
  return min(SH[s + 8] - abs(sqrt(ex * ex + ez * ez) - 1) * min(SH[s + 6], SH[s + 7]), dy, SH[s + 9] - dy);
}
// distance into the nearest wonder (metres, > 0 inside), clamped to ±lim; only shapes of wonders in reach are tried
function monSD(x, y, z, lim) {
  let d = -lim;
  for (let m = 0; m < MB.length; m += 7) {
    const dx = x - MB[m], dz = z - MB[m + 1];
    if (dx * dx + dz * dz > MB[m + 2] * MB[m + 2] || y > MB[m + 5]) continue;
    for (let s = MB[m + 3]; s < MB[m + 4]; s += 12) { const v = shapeSD(s, x, y, z); if (v > d) d = v; }
  }
  return d > lim ? lim : d;
}
// near a wonder's footprint: makeWorld keeps kelp, rocks and sponges off them
// the six large wonders keep an open plaza; the landmarks stay tucked in among the kelp, so they take some finding
const nearWonder = (x, z, pad) => { for (let i = 0; i < WP.length; i += 5) if (hypot(x - WP[i], z - WP[i + 1]) < WP[i + 2] + (i < NBIG * 5 ? pad : min(pad, 1.5))) return true; return false; };
const wRad = (row, i) => (i < NBIG ? row[9] : row[6]);
// stone code for the masonry shader: main + 16 accent A + 256 accent B, as a seed in [0, 1)
const stoneSeed = (p) => (p[0] + 16 * (p[1] || 0) + 256 * (p[2] || 0)) / 4096;

// ---------------------------------------------------------------- layouts shared by the meshes and the collision
const qv = (q, x, y, z) => { // rotate (x, y, z) by quaternion q
  const tx = q[1] * z - q[2] * y + q[3] * x, ty = q[2] * x - q[0] * z + q[3] * y, tz = q[0] * y - q[1] * x + q[3] * z;
  return [x + 2 * (q[1] * tz - q[2] * ty), y + 2 * (q[2] * tx - q[0] * tz), z + 2 * (q[0] * ty - q[1] * tx)];
};
const qYT = (yaw, tilt) => qMul(qAxis(0, 1, 0, yaw), qAxis(1, 0, 0, tilt));
// Stonehenge: x, y, z, half size x y z, yaw, tilt, solid. Local z points out of the circle; the horseshoe opens to +z
let HENGE = null;
function hengeLayout() {
  if (HENGE) return HENGE;
  rseed(330);
  const S = [], R = 12.4, top = [], rad = (a) => atan2(cos(a), sin(a));
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * TAU, u = rnd(), hy = rr(1.75, 2.0);
    if (u < 0.6) { S.push([R * cos(a), hy - 0.45, R * sin(a), rr(0.8, 0.95), hy, rr(0.42, 0.5), rad(a) + rr(-0.06, 0.06), rr(-0.05, 0.05), 1]); top[i] = 2 * hy - 0.45; }
    else if (u < 0.82) S.push([(R + 2.3) * cos(a), 0.3, (R + 2.3) * sin(a), 0.85, 1.9, 0.45, rad(a) + rr(-0.5, 0.5), 1.47, 0]);
  }
  for (let i = 0; i < 30; i++) {
    const j = (i + 1) % 30, am = (i + 0.5) / 30 * TAU;
    if (top[i] && top[j] && rnd() < 0.55) S.push([R * 0.9945 * cos(am), max(top[i], top[j]) + 0.34, R * 0.9945 * sin(am), 1.42, 0.36, 0.44, rad(am), 0, 1]);
  }
  // five trilithons; the great one (middle) has one upright and its lintel down, as at the real site
  [-1.2, -0.62, 0, 0.62, 1.2].forEach((o, k) => {
    const a = -PI / 2 + o, H = [4.0, 4.7, 5.8, 4.7, 4.0][k], cx = 5.8 * cos(a), cz = 5.8 * sin(a), f = rad(a), tx = cos(f), tz = -sin(f);
    for (const sd of [-1, 1]) {
      if (k === 2 && sd > 0) S.push([cx + tx * 1.4 - cos(a) * 2.6, 0.45, cz + tz * 1.4 - sin(a) * 2.6, 0.72, H / 2, 0.55, f + 0.25, -1.5, 0]);
      else S.push([cx + tx * 1.05 * sd, H / 2 - 0.4, cz + tz * 1.05 * sd, 0.72, H / 2, 0.55, f, k === 2 ? -0.1 : rr(-0.03, 0.03), 1]);
    }
    if (k === 2) S.push([cx + cos(a) * 3.2, 0.36, cz + sin(a) * 3.2, 1.85, 0.4, 0.52, f - 0.4, 0, 0]);
    else S.push([cx, H - 0.4 + 0.38, cz, 1.85, 0.4, 0.52, f, 0, 1]);
  });
  for (let i = 0; i < 30; i++) if (rnd() < 0.62) { const a = i / 30 * TAU + rr(-0.04, 0.04), hy = rr(0.6, 0.9); S.push([9.8 * cos(a), hy - 0.3, 9.8 * sin(a), 0.32, hy, 0.24, rad(a), rr(-0.12, 0.12), 0]); }
  for (let i = 0; i < 10; i++) { const a = -PI / 2 + (i / 9 - 0.5) * 2.6, hy = rr(0.8, 1.05); S.push([3.6 * cos(a), hy - 0.3, 3.6 * sin(a), 0.3, hy, 0.25, rad(a), rr(-0.08, 0.08), 0]); }
  S.push([0, 0.12, -1.2, 2.0, 0.25, 0.5, 0.2, 0, 0]); // altar stone
  return HENGE = S;
}
// moai on their ahu: x, scale, yaw, toppled, pukao
const MOAI = [[-10.2, 1.04, 0.05, 0, 0], [-6.8, 0.96, -0.03, 0, 1], [-3.4, 1.1, 0.02, 0, 0], [0, 1.18, 0, 0, 1], [3.4, 0.98, -0.04, 0, 0], [6.8, 1.06, 0.06, 0, 0], [10.2, 0.95, 0.3, 1, 0]];

// ---------------------------------------------------------------- placement (called from makeWorld)
// Returns the plaque instances (12 floats each: centre + atlas cell, half-width vector, half-height vector).
function placeWonders(floorsAt, water, solid, flyPts) {
  rseed(31);
  // sites: in each region, largest first, of the flat open spots tried the one farthest from the others
  const SITE = new Float32Array(WONDERS.length * 2), taken = [];
  const spread = (x, z, r, H) => { let lo = 1e9, hi = -1e9; for (let k = 0; k < 19; k++) { const a = k < 12 ? k / 12 * TAU : (k - 12) / 6 * TAU, d = k < 12 ? r : k < 18 ? r * 0.5 : 0, f = floorsAt(x + cos(a) * d, z + sin(a) * d); if (f.length !== 2 || f[1] < H + 2) return NaN; lo = min(lo, f[0]); hi = max(hi, f[0]); } return hi - lo; };
  WREG = new Int8Array(WONDERS.length).fill(-1);
  REGIONS.forEach((reg, k) => {
    const ids = reg.slice(1).map((n) => WONDERS.findIndex((w) => w[0] === n)).filter((i) => i >= 0).sort((a, b) => wRad(WONDERS[b], b) - wRad(WONDERS[a], a));
    for (const i of ids) {
      const r = wRad(WONDERS[i], i), H = i < NBIG ? WONDERS[i][10] : WONDERS[i][7]; let best = -1e9, bx = REGC[k][0], bz = REGC[k][1];
      for (let pass = 0; pass < 2 && best < 0; pass++) for (let t = 0; t < 1500; t++) {
        const a = rnd() * TAU, d = sqrt(rnd()) * (REGS - r), x = REGC[k][0] + cos(a) * d, z = REGC[k][1] + sin(a) * d;
        if (!(spread(x, z, r, H) <= max(1.5, r * (pass ? 0.5 : 0.25)))) continue;
        let g = 1e9; for (const o of taken) g = min(g, hypot(x - o[0], z - o[1]) - o[2] - r);
        if (g > best) { best = g; bx = x; bz = z; }
      }
      SITE[i * 2] = bx; SITE[i * 2 + 1] = bz; taken.push([bx, bz, r]); WREG[i] = k;
    }
  });
  const shapes = [], bounds = [], plaques = new Float32Array(WONDERS.length * 12);
  const ground = (x, z) => { const f = floorsAt(x, z); return f.length ? f[f.length - 2] : -45; };
  for (let w = 0; w < WONDERS.length; w++) {
    const big = w < NBIG, row = WONDERS[w], rx = SITE[w * 2], rz = SITE[w * 2 + 1], sr = 2;
    const rad = big ? row[9] : row[6], H = big ? row[10] : row[7], front = big ? row[11] : row[8];
    // the flattest open seabed in the region: one surface (no overhang) under the whole footprint, room above
    // within a couple of metres of the site, the flattest spot (first with one surface and room above, then any)
    let best = 1e9, X = rx, Z = rz, Y = -45;
    for (let pass = 0; pass < 2 && best === 1e9; pass++) for (let i = 0; i < 120; i++) {
      const a = rnd() * TAU, d = i ? sqrt(rnd()) * sr : 0, x = rx + cos(a) * d, z = rz + sin(a) * d;
      let lo = 1e9, hi = -1e9, ok = true;
      for (let k = 0; k < 25 && ok; k++) {
        const aa = k < 16 ? k / 16 * TAU : (k - 16) / 8 * TAU, r = k < 16 ? rad : k < 24 ? rad * 0.5 : 0, f = floorsAt(x + cos(aa) * r, z + sin(aa) * r);
        if (!f.length || (!pass && (f.length !== 2 || f[1] < H + 2))) ok = false;
        else { const y = f[f.length - 2]; lo = min(lo, y); hi = max(hi, y); }
      }
      if (ok && hi - lo + d * 0.05 < best) { best = hi - lo + d * 0.05; X = x; Z = z; Y = lo - 0.4; }
    }
    if (best > 6) console.warn(`${WONDERS[w][0]}: uneven site (${best.toFixed(1)} m)`);
    // face the most open side (the longest run of water just above the seabed), the middle of the world on a tie
    let f = atan2(-X, -Z), run = -1;
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * TAU, dx = sin(a), dz = cos(a); let n = 0;
      for (let r = rad + 2; r < rad + 34 && water(X + dx * r, Y + 3, Z + dz * r) && water(X + dx * r, Y + 7, Z + dz * r); r += 2) n++;
      const sc = n + 0.5 * cos(a - atan2(-X, -Z));
      if (sc > run) { run = sc; f = a; }
    }
    WP.set([X, Z, rad, Y, f], w * 5);
    const cf = cos(f), sf = sin(f), q = qAxis(0, 1, 0, f);
    const wx = (lx, lz) => X + lx * cf + lz * sf, wz = (lx, lz) => Z - lx * sf + lz * cf;
    const s0 = shapes.length;
    const S = (t, lx, ly, lz, yaw, ...p) => { const g = f + yaw; shapes.push(t, wx(lx, lz), Y + ly, wz(lx, lz), cos(g), sin(g), ...p); while (shapes.length % 12) shapes.push(0); };
    const put = (mesh, lx, ly, lz, sc, qq, stone) => solid(mesh, wx(lx, lz), Y + ly, wz(lx, lz), sc, qMul(q, qq), 6, typeof stone === 'number' ? stone / 4096 : stoneSeed(stone), 1, 0);
    const rubble = (n, r0, r1, stone, big = 1) => { for (let i = 0; i < n; i++) { const a = rnd() * TAU, r = rr(r0, r1), lx = cos(a) * r, lz = sin(a) * r, sc = rr(0.5, 1.2) * big; solid(WM + 8, wx(lx, lz), ground(wx(lx, lz), wz(lx, lz)) + 0.15 * sc, wz(lx, lz), sc, qMul(qAxis(0, 1, 0, rnd() * TAU), qAxis(1, 0, 1, rr(-0.5, 0.5))), 6, stone / 4096, 1, 0); } };
    const I = [0, 0, 0, 1];
    if (w === 0) { put(WM, 0, 0, 0, 1, I, 0); S(2, 0, 0, 0, 0, 16, 20.4); rubble(16, 15, 24, 0); }
    else if (w === 1) {
      put(WM + 1, 0, 0, 0, 1, I, 1);
      S(0, 0, 0.9, 0, 0, 13, 0.9, 13); S(1, 0, 5.95, 0, 0, 5.9, 4.15); S(1, 0, 14.6, 0, 0, 3.9, 4.5);
      for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) S(1, a * 11.3, 8.4, b * 11.3, 0, 1.0, 6.6);
    } else if (w === 2) {
      put(WM + 2, 0, 0, 0, 1, I, 2);
      S(3, 0, 0, 0, 0, 15, 12.5, 0.75, 4.8, -4, 4); S(3, 0, 0, 0, 0, 15, 12.5, 0.75, 9.6, -2.6, -0.5); S(3, 0, 0, 0, 0, 11.4, 8.9, 0.55, 4.6, -4, 4);
      rubble(22, 8, 20, 2);
    } else if (w === 3) {
      put(WM + 3, 0, 0, 0, 1, I, 3);
      for (const s of hengeLayout()) if (s[8]) S(0, s[0], s[1], s[2], s[6], s[3], s[4], s[5]);
    } else if (w === 4) {
      put(WM + 4, 0, 0, 0, 1, I, 4); S(0, 0, 0.9, 0, 0, 12.8, 0.9, 2.0);
      for (const [x, sc, yaw, down, hat] of MOAI) {
        if (down) { put(WM + 5, x, 1.0, 2.7, sc, qYT(yaw, 1.5), 4); S(0, x, 0.7, 5.0, yaw, 1.0, 0.8, 2.5); continue; }
        put(WM + 5, x, 1.8, 0, sc, qAxis(0, 1, 0, yaw), 4); S(0, x, 1.8 + 2.4 * sc, 0, yaw, 1.0 * sc, 2.4 * sc, 0.75 * sc);
        if (hat) put(WM + 6, x, 1.8 + 4.62 * sc, 0.03 * sc, sc, qAxis(0, 1, 0, yaw), 5);
      }
    } else if (!big) { // a landmark: its mesh and collision shapes from its builder (landmarks.js)
      const { mesh, rec } = buildLandmark(row[10]);
      MINI.push(mesh); put(WM + 10 + w - NBIG, 0, 0, 0, 1, I, row[9]);
      for (const r of rec) S(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7] ?? 0);
    } else {
      put(WM + 7, 0, 0, 0, 1, I, 6);
      S(0, 0, 0.8, 0, 0, 8, 0.8, 8); S(0, 0, 7.25, 0, 0, 3.6, 5.65, 3.6); S(1, 0, 16.35, 0, 0, 2.9, 3.45); S(1, 0, 23.3, 0, 0, 2.0, 3.5);
      rubble(30, 9, 22, 6, 1.3);
    }
    // the stele in front, its plaque on the face turned to the visitor
    const k = big ? 1 : 0.75, sz = front + (big ? 3.2 : 2.4), sy = ground(wx(0, sz), wz(0, sz)) - 0.1 - Y;
    put(WM + 9, 0, sy, sz, k, I, 7); S(0, 0, sy + 1.3 * k, sz, 0, 1.5 * k, 1.3 * k, 0.55 * k);
    const tq = qMul(q, qAxis(1, 0, 0, -0.14)), c = qv(tq, 0, 0, 0.175 * k), r = qv(tq, 1.2 * k, 0, 0), u = qv(tq, 0, 0.75 * k, 0);
    plaques.set([wx(0, sz) + c[0], Y + sy + 1.65 * k + c[1], wz(0, sz) + c[2], w, ...r, 0, ...u, 0], w * 12);
    bounds.push(X, Z, max(rad, sz + 1) + 4, s0, shapes.length, Y + H + 1, Y - 1);
  }
  SH = new Float32Array(shapes); MB = new Float32Array(bounds);
  return plaques;
}

// ---------------------------------------------------------------- mesh helpers
// box with hard edges, optionally rotated by q; aux darkens recesses (ambient occlusion)
const BOXF = [[1, 0, 0, 0, 1, 0, 0, 0, 1], [-1, 0, 0, 0, 0, 1, 0, 1, 0], [0, 1, 0, 0, 0, 1, 1, 0, 0], [0, -1, 0, 1, 0, 0, 0, 0, 1], [0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, -1, 0, 1, 0, 1, 0, 0]];
function mBox(m, cx, cy, cz, hx, hy, hz, q = null, aux = 1) {
  for (const f of BOXF) {
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => {
      const x = (f[0] + f[3] * s + f[6] * t) * hx, y = (f[1] + f[4] * s + f[7] * t) * hy, z = (f[2] + f[5] * s + f[8] * t) * hz, p = q ? qv(q, x, y, z) : [x, y, z];
      return m.v(cx + p[0], cy + p[1], cz + p[2], aux);
    });
    m.quad(c[0], c[1], c[2], c[3]);
  }
}
// surface of revolution through [radius, height] points, bottom to top; flat: faceted sides (towers), else smooth (domes)
function mLathe(m, prof, seg, cx, cy, cz, rot = 0, flat = false) {
  const at = (p, s) => { const a = rot + s / seg * TAU; return m.v(cx + cos(a) * p[0], cy + p[1], cz + sin(a) * p[0], p[2] ?? 1); };
  if (!flat) {
    const R = prof.map((p) => Array.from({ length: seg }, (_, s) => at(p, s)));
    for (let k = 0; k < R.length - 1; k++) for (let s = 0; s < seg; s++) m.quad(R[k][s], R[k + 1][s], R[k + 1][(s + 1) % seg], R[k][(s + 1) % seg]);
  } else for (let k = 0; k < prof.length - 1; k++) for (let s = 0; s < seg; s++) m.quad(at(prof[k], s), at(prof[k + 1], s), at(prof[k + 1], s + 1), at(prof[k], s + 1));
}
// a recessed opening: a dark panel with a pointed (diamond) top, on the face at distance d out along yaw
function mArch(m, yaw, d, y, hw, hh, aux = 0.12) {
  const q = qAxis(0, 1, 0, yaw), sx = sin(yaw), cz = cos(yaw);
  mBox(m, sx * d, y, cz * d, hw, hh, 0.03, q, aux);
  mBox(m, sx * d, y + hh, cz * d, hw * 0.7, hw * 0.7, 0.03, qMul(q, qAxis(0, 0, 1, PI / 4)), aux);
}
// signed distance field -> surface nets mesh; ao > 0 bakes crevice darkness into aux
function sdfMesh(sdf, ox, oy, oz, nx, ny, nz, vs, ao = 0) {
  const D = new Float32Array(nx * ny * nz);
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) D[x + nx * (y + ny * z)] = -sdf(ox + x * vs, oy + y * vs, oz + z * vs);
  const sn = surfaceNets(D, nx, ny, nz), smp = sampler3(D, nx, ny, nz);
  const vb = new ArrayBuffer(sn.nv * 16), f = new Float32Array(vb), s = new Int8Array(vb);
  for (let k = 0; k < sn.nv; k++) {
    const x = sn.pos[k * 3], y = sn.pos[k * 3 + 1], z = sn.pos[k * 3 + 2], e = 0.7;
    let ax = smp(x - e, y, z) - smp(x + e, y, z), ay = smp(x, y - e, z) - smp(x, y + e, z), az = smp(x, y, z - e) - smp(x, y, z + e);
    const l = hypot(ax, ay, az) || 1; ax /= l; ay /= l; az /= l;
    const px = ox + x * vs, py = oy + y * vs, pz = oz + z * vs;
    f[k * 4] = px; f[k * 4 + 1] = py; f[k * 4 + 2] = pz;
    s[k * 16 + 12] = round(ax * 127); s[k * 16 + 13] = round(ay * 127); s[k * 16 + 14] = round(az * 127);
    s[k * 16 + 15] = round((ao ? clamp(sdf(px + ax * ao, py + ay * ao, pz + az * ao) / ao, 0.15, 1) : 1) * 127);
  }
  return { vb, ib: new Uint32Array(sn.idx), nv: sn.nv };
}

// ---------------------------------------------------------------- the wonders (local frame: base at y 0, front +z)
function meshPyramid() { // 17 stepped courses (the casing stones are gone), a flat top, the chevron entrance
  rseed(300);
  const m = new Mesh(), B = 16, H = 20.4, sh = 1.1;
  for (let i = 0; i < 17; i++) { const w = B * (1 - (i + 1) * sh / H) + 0.45; mBox(m, rr(-0.05, 0.05), (i + 0.5) * sh, rr(-0.05, 0.05), w + rr(0, 0.15), sh / 2, w + rr(0, 0.15), null, 0.8 + 0.2 * i / 17); }
  const ez = B * (1 - 5 * sh / H) + 0.5; // on the face of the fifth course
  mBox(m, 0, 4.95, ez, 0.7, 0.42, 0.06, null, 0.06);
  for (const s of [-1, 1]) mBox(m, s * 0.5, 5.62, ez - 0.15, 0.85, 0.18, 0.3, qAxis(0, 0, 1, -s * 0.6), 0.9);
  return m;
}
function meshTaj() { // plinth, chamfered hall with its four portals, onion dome, four chhatris and four minarets
  const m = new Mesh(), ap = 6.1 * cos(PI / 8);
  mBox(m, 0, 0.9, 0, 13, 0.9, 13);
  mLathe(m, [[6.1, 1.8], [6.1, 9.6], [6.35, 9.6], [6.35, 10.1], [0, 10.1]], 8, 0, 0, 0, PI / 8, true);
  for (let k = 0; k < 8; k++) {
    const yaw = k * PI / 4;
    if (k % 2 === 0) { mBox(m, sin(yaw) * (ap + 0.2), 6.3, cos(yaw) * (ap + 0.2), 2.8, 4.5, 0.25, qAxis(0, 1, 0, yaw)); mArch(m, yaw, ap + 0.46, 5.0, 1.9, 3.1); }
    else { mArch(m, yaw, ap + 0.03, 3.6, 0.9, 1.4); mArch(m, yaw, ap + 0.03, 7.4, 0.9, 1.3); }
  }
  mLathe(m, [[3.0, 10.1], [3.0, 12.0], [3.5, 12.6], [3.9, 13.6], [3.95, 14.5], [3.6, 15.6], [2.8, 16.6], [1.6, 17.4], [0.6, 18.0], [0.22, 18.5], [0, 18.7]], 40, 0, 0, 0);
  mLathe(m, [[0.14, 18.6], [0.2, 19.0], [0.09, 19.4], [0.17, 19.6], [0.06, 19.9], [0, 20.4]], 8, 0, 0, 0);
  for (let k = 0; k < 4; k++) {
    const a = PI / 4 + k * PI / 2, x = cos(a) * 4.4, z = sin(a) * 4.4, mx = cos(a) * 11.3 * SQRT2, mz = sin(a) * 11.3 * SQRT2;
    mLathe(m, [[0.95, 10.1], [0.95, 11.5], [1.12, 11.5], [1.12, 11.7], [0, 11.7]], 8, x, 0, z, PI / 8, true);
    mLathe(m, [[1.05, 11.7], [1.15, 12.1], [0.9, 12.7], [0.4, 13.1], [0, 13.4]], 16, x, 0, z);
    mLathe(m, [[1.0, 1.8], [0.92, 5.6], [1.25, 5.6], [1.25, 5.9], [0.9, 5.9], [0.84, 9.6], [1.15, 9.6], [1.15, 9.9], [0.82, 9.9], [0.76, 13.2], [1.05, 13.2], [1.05, 13.45], [0.85, 13.45], [0.9, 14.3], [0.95, 14.3], [0.9, 14.7], [0.55, 15.2], [0, 15.6]], 14, mx, 0, mz);
  }
  return m;
}
function meshColosseum() { // outer wall of three arcades and an attic, standing on the far side only; inner wall, seating, hypogeum
  rseed(320);
  const m = new Mesh(), TH = [0, 2.6, 5.0, 7.4, 9.6];
  const ring = (a, b, n, tw, full, inner) => {
    for (let k = 0; k < n; k++) {
      const t0 = k / n * TAU - PI, t1 = (k + 1) / n * TAU - PI, x0 = a * cos(t0), z0 = b * sin(t0), x1 = a * cos(t1), z1 = b * sin(t1);
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, len = hypot(x1 - x0, z1 - z0), yaw = atan2(-(z1 - z0), x1 - x0), q = qAxis(0, 1, 0, yaw);
      const nx = sin(yaw), nz = cos(yaw), out = nx * mx / (a * a) + nz * mz / (b * b) > 0 ? 1 : -1;
      const tm = (t0 + t1) / 2, keep = tm > -2.6 && tm < -0.5, tiers = inner ? 2 : full && keep ? 3 : rnd() < 0.7 ? 2 : 1;
      for (let t = 0; t < tiers; t++) {
        const y0 = TH[t], y1 = TH[t + 1], ph = (y1 - y0 - 0.5) / 2;
        mBox(m, x0, y0 + ph, z0, 0.42, ph, tw, q);
        if (!inner) mBox(m, x0 + nx * out * (tw + 0.08), y0 + ph, z0 + nz * out * (tw + 0.08), 0.17, ph, 0.1, q);
        mBox(m, mx, y1 - 0.25, mz, len / 2 + 0.03, 0.25, tw + 0.05, q);
        mBox(m, mx, y1 - 0.04, mz, len / 2 + 0.03, 0.06, tw + 0.18, q);
      }
      if (!inner && full && keep) {
        mBox(m, mx, (TH[3] + TH[4]) / 2, mz, len / 2 + 0.03, (TH[4] - TH[3]) / 2, tw, q);
        if (k % 2) mBox(m, mx + nx * out * tw, 8.4, mz + nz * out * tw, 0.32, 0.32, 0.03, q, 0.1);
      }
      if (!inner) { // seating: a slab from the inner wall up to the outer one
        const ix = (a - 3.6) * cos(tm), iz = (b - 3.6) * sin(tm), ox = a * cos(tm), oz = b * sin(tm), dr = hypot(ox - ix, oz - iz), y0 = 4.6, y1 = keep ? 7.2 : rr(4.6, 5.4);
        mBox(m, (ix + ox) / 2, (y0 + y1) / 2, (iz + oz) / 2, len / 2 + 0.04, 0.22, hypot(dr, y1 - y0) / 2, qMul(qAxis(0, 1, 0, yaw), qAxis(1, 0, 0, atan2(y1 - y0, dr) * -out)));
      }
    }
  };
  ring(15, 12.5, 40, 0.75, true, false);
  ring(11.4, 8.9, 32, 0.55, false, true);
  for (let i = -3; i <= 3; i++) { const z = i * 1.25, l = 9.6 * sqrt(1 - (z / 7.6) ** 2); mBox(m, 0, 0.55, z, l, 0.55, 0.22, null, 0.7); }
  return m;
}
function meshStonehenge() {
  const m = new Mesh();
  for (const s of hengeLayout()) mBox(m, s[0], s[1], s[2], s[3], s[4], s[5], qYT(s[6], s[7]), 0.9);
  return m;
}
function meshAhu() { // the stone platform, its ramp behind and paving in front
  rseed(340);
  const m = new Mesh();
  mBox(m, 0, 0.9, 0, 12.8, 0.9, 2.0);
  mBox(m, 0, 0.55, -3.6, 12.2, 0.18, 2.2, qAxis(1, 0, 0, -0.35), 0.85);
  for (let i = 0; i < 26; i++) mBox(m, rr(-12, 12), 0.06, rr(2.6, 7), rr(0.4, 0.9), 0.12, rr(0.3, 0.7), qAxis(0, 1, 0, rr(-0.3, 0.3)), 0.8);
  return m;
}
function meshMoai() { // head and torso of a moai: heavy brow, deep sockets, long nose, pursed lips, long ears, hands on the belly
  const sBox = (x, y, z, cx, cy, cz, hx, hy, hz, r) => { const qx = abs(x - cx) - hx + r, qy = abs(y - cy) - hy + r, qz = abs(z - cz) - hz + r, ax = max(qx, 0), ay = max(qy, 0), az = max(qz, 0); return sqrt(ax * ax + ay * ay + az * az) + min(max(qx, max(qy, qz)), 0) - r; };
  const sEll = (x, y, z, cx, cy, cz, rx, ry, rz) => { const a = hypot((x - cx) / rx, (y - cy) / ry, (z - cz) / rz), b = hypot((x - cx) / (rx * rx), (y - cy) / (ry * ry), (z - cz) / (rz * rz)); return a * (a - 1) / (b || 1); };
  const sCap = (x, y, z, ax, ay, az, ra, bx, by, bz, rb) => { const ux = bx - ax, uy = by - ay, uz = bz - az, px = x - ax, py = y - ay, pz = z - az, h = clamp((px * ux + py * uy + pz * uz) / (ux * ux + uy * uy + uz * uz), 0, 1); return hypot(px - ux * h, py - uy * h, pz - uz * h) - mix(ra, rb, h); };
  const smin = (a, b, k) => { const h = max(k - abs(a - b), 0) / k; return min(a, b) - h * h * k * 0.25; };
  const sdf = (x, y, z) => {
    let d = sBox(x, y, z, 0, 1.3, -0.05, 1.0 - 0.06 * max(y, 0), 1.35, 0.62, 0.3);
    d = smin(d, sBox(x, y, z, 0, 3.65, 0.02, 0.8, 1.15, 0.66, 0.28), 0.3);
    d = smin(d, sBox(x, y, z, 0, 4.05, 0.62, 0.74, 0.15, 0.16, 0.07), 0.12);
    d = smin(d, sCap(x, y, z, 0, 3.92, 0.7, 0.12, 0, 3.12, 0.98, 0.21), 0.08);
    d = smin(d, sBox(x, y, z, 0, 2.82, 0.74, 0.44, 0.11, 0.12, 0.05), 0.06);
    d = smin(d, sBox(x, y, z, 0, 2.52, 0.6, 0.55, 0.2, 0.14, 0.1), 0.15);
    for (const s of [-1, 1]) {
      d = max(d, -sEll(x, y, z, s * 0.34, 3.8, 0.76, 0.26, 0.17, 0.2));
      d = smin(d, sBox(x, y, z, s * 0.82, 3.55, 0.1, 0.07, 0.62, 0.2, 0.05), 0.05);
      d = smin(d, sBox(x, y, z, s * 0.42, 0.95, 0.58, 0.38, 0.055, 0.06, 0.03), 0.04);
      d = smin(d, sBox(x, y, z, s * (0.93 - 0.06 * 1.65), 1.65, 0.15, 0.06, 0.75, 0.16, 0.04), 0.05);
    }
    d = max(d, -sBox(x, y, z, 0, 2.79, 0.86, 0.36, 0.014, 0.1, 0));
    return max(d, -y);
  };
  const vs = LV > 1 ? 0.085 : 0.055;
  return sdfMesh(sdf, -1.4, -0.1, -1.0, ceil(2.8 / vs) + 1, ceil(5.1 / vs) + 1, ceil(2.4 / vs) + 1, vs, 0.15);
}
function meshPukao() { const m = new Mesh(); mLathe(m, [[0.6, -0.1], [0.66, 0.3], [0.6, 0.62], [0.3, 0.72], [0, 0.74]], 20, 0, 0, 0); return m; }
function meshPharos() { // square tower, octagonal middle, round lantern with columns and a cone roof, on a platform
  const m = new Mesh(), r4 = SQRT2, q4 = (k) => qAxis(0, 1, 0, k * PI / 2);
  mBox(m, 0, 0.8, 0, 8, 0.8, 8);
  mLathe(m, [[3.6 * r4, 1.6], [3.0 * r4, 12.4], [3.35 * r4, 12.4], [3.35 * r4, 12.9], [0, 12.9]], 4, 0, 0, 0, PI / 4, true);
  for (let k = 0; k < 4; k++) {
    const q = q4(k), s = sin(k * PI / 2), c = cos(k * PI / 2);
    for (const y of [4.6, 7.6, 10.6]) for (const o of [-1.4, 0, 1.4]) { const d = 3.6 - (y - 1.6) / 10.8 * 0.6 + 0.04; mBox(m, s * d + c * o, y, c * d - s * o, 0.2, 0.55, 0.03, q, 0.1); }
  }
  mBox(m, 0, 2.7, 3.62, 0.7, 1.1, 0.04, null, 0.06);
  mLathe(m, [[3.0, 12.9], [2.6, 19.4], [3.0, 19.4], [3.0, 19.8], [0, 19.8]], 8, 0, 0, 0, PI / 8, true);
  for (let k = 0; k < 8; k++) { const a = k * PI / 4, d = 2.78 * cos(PI / 8) + 0.03; mBox(m, sin(a) * d, 16.2, cos(a) * d, 0.18, 0.7, 0.03, qAxis(0, 1, 0, a), 0.1); }
  mLathe(m, [[1.75, 19.8], [1.65, 22.4], [2.0, 22.4], [2.0, 22.7], [0, 22.7]], 24, 0, 0, 0);
  for (let k = 0; k < 8; k++) { const a = k * PI / 4; mBox(m, cos(a) * 1.55, 23.65, sin(a) * 1.55, 0.14, 0.95, 0.14, qAxis(0, 1, 0, -a)); }
  mLathe(m, [[2.0, 24.6], [2.0, 24.85], [1.6, 25.1], [0.9, 25.9], [0.25, 26.6], [0.18, 26.6], [0.12, 27.6], [0, 27.9]], 24, 0, 0, 0);
  return m;
}
function meshBlock() { const m = new Mesh(); mBox(m, 0, 0, 0, 0.55, 0.4, 0.45); return m; }
function meshStele() { // plinth, a slab leaning back a little, a cap
  const m = new Mesh(), q = qAxis(1, 0, 0, -0.14), c = qv(q, 0, 1.12, 0);
  mBox(m, 0, 0.3, 0, 1.5, 0.3, 0.55);
  mBox(m, 0, 1.65, 0, 1.35, 1.05, 0.16, q);
  mBox(m, c[0], 1.65 + c[1], c[2], 1.45, 0.08, 0.24, q);
  return m;
}
// in mesh id order from WM
const meshWonders = () => [meshPyramid().build(), meshTaj().build(), meshColosseum().build(), meshStonehenge().build(), meshAhu().build(), meshMoai(), meshPukao().build(), meshPharos().build(), meshBlock().build(), meshStele().build(), ...MINI];

// ---------------------------------------------------------------- plaque text: 8 columns of 512 x 320 cells, white on black
function paintPlaques() {
  const cv = document.createElement('canvas'), W = 512, Hc = 320;
  cv.width = W * 8; cv.height = Math.ceil(WONDERS.length / 8) * Hc;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const SERIF = 'Georgia, "Times New Roman", serif';
  const fit = (t, size, style, maxW) => { let s = size; do g.font = `${style} ${s}px ${SERIF}`; while (g.measureText(t).width > maxW && --s > 12); };
  const wrap = (t, maxW) => { const out = []; let line = ''; for (const w of t.split(' ')) { const tt = line ? line + ' ' + w : w; if (g.measureText(tt).width > maxW && line) { out.push(line); line = w; } else line = tt; } if (line) out.push(line); return out; };
  WONDERS.forEach((wd, i) => {
    const x0 = (i % 8) * W, y0 = (i / 8 | 0) * Hc, cx = x0 + W / 2;
    g.lineWidth = 4; g.strokeRect(x0 + 14, y0 + 14, W - 28, Hc - 28);
    g.lineWidth = 1.5; g.strokeRect(x0 + 23, y0 + 23, W - 46, Hc - 46);
    fit(wd[0].toUpperCase(), 34, 700, W - 76); g.fillText(wd[0].toUpperCase(), cx, y0 + 70);
    g.fillRect(cx - 80, y0 + 84, 160, 2); g.beginPath(); g.arc(cx, y0 + 85, 4.5, 0, TAU); g.fill();
    fit(wd[1], 23, 'italic', W - 80); g.fillText(wd[1], cx, y0 + 116);
    fit(`${wd[2]}  ·  ${wd[3]}`, 20, '', W - 80); g.fillText(`${wd[2]}  ·  ${wd[3]}`, cx, y0 + 145);
    let fs = 19, lines; do { g.font = `${fs}px ${SERIF}`; lines = wrap(wd[4], W - 84); } while (lines.length > 3 && --fs > 13);
    lines.slice(0, 4).forEach((l, k) => g.fillText(l, cx, y0 + 182 + k * fs * 1.3));
    g.font = `italic 16px ${SERIF}`; g.fillText(wd[5], cx, y0 + Hc - 36);
  });
  return cv;
}
