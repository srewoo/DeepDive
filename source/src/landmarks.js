// ============================================================================
// landmarks: 51 smaller sunken replicas of world landmarks (load-time only)
// ============================================================================
// Each is a few lines on a small kit of parts (boxes, lathes, sweeps, roofs, arches, statues as signed distance
// fields). placeWonders() (wonders.js) builds each in its region, with a stele and plaque in front, like the six
// large wonders.
// Stone: main / accent A / accent B per landmark (palette in shaders.js, mat 6): 0 sandstone 1 marble 2 travertine
// 3 grey stone 4 tuff 5 red stone 6 limestone 7 granite 8 verdigris 9 orange 10 dark iron 11 gold 12 white
// 13 red lacquer 14 mud brick 15 blue slate. A vertex with aux < 0 takes an accent (see aA / aB).
const SQ = Math.SQRT2;
let KM = null, REC = null, KX = null; // the mesh being built, its collision shapes (local), extra parts (built SDF meshes)
const aA = (ao = 1) => -(0.5 + 0.5 * clamp(ao, 0.1, 1)), aB = (ao = 0.95) => -0.5 * clamp(ao, 0.1, 0.95);
const yq = (yaw) => (yaw ? qAxis(0, 1, 0, yaw) : null);
// box (centre, half size), yaw only; recorded for collision unless thin
function B(x, y, z, hx, hy, hz, yaw = 0, a = 1) { mBox(KM, x, y, z, hx, hy, hz, yq(yaw), a); if (min(hx, hy, hz) >= 0.12) REC.push([0, x, y, z, yaw, hx, hy, hz]); }
function BT(x, y, z, hx, hy, hz, q, a = 1) { mBox(KM, x, y, z, hx, hy, hz, q, a); }
// lathe through [radius, height] points; collision: a cylinder as wide as its lower part
function L(x, z, prof, seg = 16, a = 1, flat = false, rot = 0, col = true) {
  mLathe(KM, prof.map((p) => [p[0], p[1], a]), seg, x, 0, z, rot, flat);
  if (!col) return;
  const y0 = prof[0][1], y1 = prof[prof.length - 1][1], cut = y0 + (y1 - y0) * 0.7; let r = 0;
  for (const p of prof) if (p[1] <= cut) r = max(r, p[0]);
  if (r >= 0.15 && y1 > y0) REC.push([1, x, (y0 + y1) / 2, z, 0, r * (flat ? 0.9 : 1), (y1 - y0) / 2]);
}
// box-section sweep along a polyline; up gives the section's orientation
function SW(pts, w, h, up = [0, 1, 0], a = 1) { const n = KM.aux.length; KM.sweep(pts, w, h, () => up); for (let i = n; i < KM.aux.length; i++) KM.aux[i] = a; }
const C = (x, y, z, r, hh) => REC.push([1, x, y, z, 0, r, hh]);
const COL = (x, z, r, h, y0 = 0, a = 1) => L(x, z, [[r * 1.3, y0], [r * 1.3, y0 + r * 0.3], [r, y0 + r * 0.35], [r * 0.85, y0 + h - r * 0.45], [r * 1.25, y0 + h - r * 0.3], [r * 1.35, y0 + h], [0, y0 + h]], 10, a);
const DOME = (x, y, z, R, a = 1, seg = 20) => L(x, z, [[R, y], [R * 0.97, y + R * 0.25], [R * 0.87, y + R * 0.5], [R * 0.7, y + R * 0.72], [R * 0.45, y + R * 0.9], [0, y + R]], seg, a);
const ONION = (x, y, z, R, a = 1, seg = 16) => L(x, z, [[R * 0.7, y], [R * 0.95, y + R * 0.3], [R, y + R * 0.55], [R * 0.85, y + R * 0.85], [R * 0.5, y + R * 1.15], [R * 0.2, y + R * 1.4], [R * 0.06, y + R * 1.6], [0, y + R * 1.8]], seg, a);
const SPIRE = (x, y, z, r, h, a = 1, seg = 8) => L(x, z, [[r, y], [0, y + h]], seg, a, true, PI / seg, false);
// square tower tapering from half width w0 to w1, optionally capped flat
const T4 = (x, z, w0, w1, y0, y1, a = 1, cap = true) => L(x, z, cap ? [[w0 * SQ, y0], [w1 * SQ, y1], [0, y1]] : [[w0 * SQ, y0], [w1 * SQ, y1]], 4, a, true, PI / 4);
const RING = (n, R, f, a0 = 0) => { for (let k = 0; k < n; k++) { const a = a0 + k / n * TAU; f(cos(a) * R, sin(a) * R, a, k); } };
const ROW = (n, x0, x1, f) => { for (let k = 0; k < n; k++) f(n > 1 ? mix(x0, x1, k / (n - 1)) : x0, k); };
// faces given in local corners, rotated by yaw and moved to (x, y, z)
function FACES(x, y, z, yaw, a, V, F) {
  const q = yq(yaw), id = V.map((v) => { const p = q ? qv(q, v[0], v[1], v[2]) : v; return p; });
  for (const f of F) { const i = f.map((k) => KM.v(x + id[k][0], y + id[k][1], z + id[k][2], a)); if (i.length === 4) KM.quad(i[0], i[1], i[2], i[3]); else KM.tri(i[0], i[1], i[2]); }
}
// gable roof: ridge along local x (half length l), half width w, height h
const GABLE = (x, y, z, l, w, h, yaw = 0, a = 1) => FACES(x, y, z, yaw, a, [[-l, 0, w], [l, 0, w], [l, h, 0], [-l, h, 0], [l, 0, -w], [-l, 0, -w]], [[0, 1, 2, 3], [4, 5, 3, 2], [1, 4, 2], [5, 0, 3], [5, 4, 1, 0]]);
// hipped roof over a hx by hz rectangle (a pyramid roof when square)
const HIP = (x, y, z, hx, hz, h, yaw = 0, a = 1) => { const r = max(hx - hz, 0); FACES(x, y, z, yaw, a, [[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz], [-r, h, 0], [r, h, 0]], [[3, 2, 5, 4], [1, 0, 4, 5], [2, 1, 5], [0, 3, 4], [0, 1, 2, 3]]); };
// round arch: an archivolt band through the wall (depth hz) and blocks filling the corners above it
function ARCH(x, yc, z, R, hz, yaw = 0, a = 1) {
  const q = yq(yaw), P = (lx, ly) => { const p = q ? qv(q, lx, 0, 0) : [lx, 0, 0]; return [x + p[0], yc + ly, z + p[2]]; };
  const pts = []; for (let k = 0; k <= 12; k++) { const t = PI - k / 12 * PI; pts.push(P(cos(t) * R, sin(t) * R)); }
  SW(pts, 0.22 * R, hz * 2, q ? qv(q, 0, 0, 1) : [0, 0, 1], a);
  for (let j = 0; j < 5; j++) { const y0 = j / 5 * R, xe = sqrt(max(R * R - y0 * y0, 0)), hw = (R * 1.12 - xe) / 2; if (hw > 0.02) for (const s of [-1, 1]) { const p = P(s * (xe + hw), y0 + R / 10); BT(p[0], p[1], p[2], hw, R / 10, hz, q, a); } }
}
// a dark recess (door, window) on a face at distance d along yaw
const WIN = (yaw, d, x, y, hw, hh) => { const q = qAxis(0, 1, 0, yaw); const p = qv(q, x, 0, d); BT(p[0], y, p[2], hw, hh, 0.03, q, 0.1); };
// built meshes (SDF statues): move, turn about y, scale; merge into one buffer
function xform(b, dx, dy, dz, yaw = 0, s = 1) {
  const vb = b.vb.slice(0), f = new Float32Array(vb), i8 = new Int8Array(vb), c = cos(yaw), sn = sin(yaw);
  for (let k = 0; k < b.nv; k++) {
    const x = f[k * 4], z = f[k * 4 + 2], nx = i8[k * 16 + 12], nz = i8[k * 16 + 14];
    f[k * 4] = (x * c + z * sn) * s + dx; f[k * 4 + 1] = f[k * 4 + 1] * s + dy; f[k * 4 + 2] = (-x * sn + z * c) * s + dz;
    i8[k * 16 + 12] = round(nx * c + nz * sn); i8[k * 16 + 14] = round(-nx * sn + nz * c);
  }
  return { vb, ib: b.ib, nv: b.nv };
}
function mergeBuilt(list) {
  let nv = 0, ni = 0; for (const b of list) { nv += b.nv; ni += b.ib.length; }
  const vb = new Uint8Array(nv * 16), ib = new Uint32Array(ni); let v = 0, i = 0;
  for (const b of list) { vb.set(new Uint8Array(b.vb), v * 16); for (let k = 0; k < b.ib.length; k++) ib[i + k] = b.ib[k] + v; v += b.nv; i += b.ib.length; }
  return { vb: vb.buffer, ib, nv };
}
// run one landmark's builder; returns the mesh and its collision shapes in the local frame
function buildLandmark(fn) {
  KM = new Mesh(); REC = []; KX = [];
  fn();
  const b = KM.build(), mesh = KX.length ? mergeBuilt([b, ...KX]) : b, rec = REC;
  KM = REC = KX = null;
  return { mesh, rec };
}
// lean the whole mesh built so far about the z axis (the Leaning Tower)
const LEAN = (ang) => { const c = cos(ang), s = sin(ang); for (let i = 0; i < KM.p.length; i += 3) { const x = KM.p[i], y = KM.p[i + 1]; KM.p[i] = x * c + y * s; KM.p[i + 1] = -x * s + y * c; } for (const r of REC) { const x = r[1], y = r[2]; r[1] = x * c + y * s; r[2] = -x * s + y * c; } };

// ---------------------------------------------------------------- signed distance helpers for the statues
const dBox = (x, y, z, cx, cy, cz, hx, hy, hz, r = 0) => { const qx = abs(x - cx) - hx + r, qy = abs(y - cy) - hy + r, qz = abs(z - cz) - hz + r, ax = max(qx, 0), ay = max(qy, 0), az = max(qz, 0); return sqrt(ax * ax + ay * ay + az * az) + min(max(qx, max(qy, qz)), 0) - r; };
const dEll = (x, y, z, cx, cy, cz, rx, ry, rz) => { const a = hypot((x - cx) / rx, (y - cy) / ry, (z - cz) / rz), b = hypot((x - cx) / (rx * rx), (y - cy) / (ry * ry), (z - cz) / (rz * rz)); return a * (a - 1) / (b || 1); };
const dCap = (x, y, z, ax, ay, az, ra, bx, by, bz, rb) => { const ux = bx - ax, uy = by - ay, uz = bz - az, px = x - ax, py = y - ay, pz = z - az, h = clamp((px * ux + py * uy + pz * uz) / (ux * ux + uy * uy + uz * uz), 0, 1); return hypot(px - ux * h, py - uy * h, pz - uz * h) - mix(ra, rb, h); };
const sm = (a, b, k) => { const h = max(k - abs(a - b), 0) / k; return min(a, b) - h * h * k * 0.25; };
const SDF = (sdf, x0, y0, z0, x1, y1, z1, vs) => { vs *= LV > 1 ? 1.5 : 1; return sdfMesh(sdf, x0, y0, z0, Math.ceil((x1 - x0) / vs) + 1, Math.ceil((y1 - y0) / vs) + 1, Math.ceil((z1 - z0) / vs) + 1, vs, 0.12); };
// a seated pharaoh (Abu Simbel): throne, legs, torso, nemes headdress and crown, facing +z, 3.9 m tall
const pharaoh = (x, y, z) => {
  let d = dBox(x, y, z, 0, 0.9, -0.25, 0.75, 0.9, 0.55, 0.05);
  d = sm(d, dBox(x, y, z, 0, 1.0, 0.35, 0.62, 0.22, 0.45, 0.1), 0.1);
  for (const s of [-1, 1]) { d = sm(d, dBox(x, y, z, s * 0.28, 0.45, 0.62, 0.2, 0.45, 0.2, 0.08), 0.06); d = sm(d, dBox(x, y, z, s * 0.42, 1.28, 0.4, 0.13, 0.08, 0.38, 0.05), 0.05); }
  d = sm(d, dBox(x, y, z, 0, 1.9, -0.15, 0.55, 0.65, 0.32, 0.18), 0.15);
  d = sm(d, dEll(x, y, z, 0, 2.85, -0.08, 0.28, 0.34, 0.28), 0.1);
  d = sm(d, dBox(x, y, z, 0, 2.7, -0.2, 0.46, 0.38, 0.2, 0.08), 0.08);
  d = sm(d, dCap(x, y, z, 0, 3.15, -0.1, 0.2, 0, 3.75, -0.12, 0.12), 0.08);
  d = sm(d, dCap(x, y, z, 0, 2.5, 0.15, 0.05, 0, 2.3, 0.2, 0.04), 0.03);
  return max(d, -y);
};
// Lady Liberty on the top of her pedestal: robe, raised torch arm, tablet, crown of rays; 5.6 m
const liberty = (x, y, z) => {
  let d = dCap(x, y, z, 0, 0.3, 0, 0.62, 0, 3.0, 0, 0.42);
  d = sm(d, dEll(x, y, z, 0, 3.2, 0, 0.5, 0.45, 0.33), 0.15);
  d = sm(d, dCap(x, y, z, 0.33, 3.45, 0, 0.14, 0.6, 4.6, 0.05, 0.11), 0.08);
  d = sm(d, dCap(x, y, z, 0.6, 4.6, 0.05, 0.1, 0.66, 5.0, 0.05, 0.08), 0.03);
  d = sm(d, dCap(x, y, z, -0.38, 3.35, 0, 0.12, -0.44, 2.75, 0.25, 0.1), 0.06);
  d = min(d, dBox(x, y, z, -0.45, 2.75, 0.34, 0.17, 0.3, 0.05, 0.02));
  d = sm(d, dCap(x, y, z, 0, 3.5, 0, 0.13, 0, 3.65, 0, 0.12), 0.04);
  d = sm(d, dEll(x, y, z, 0, 3.85, 0.02, 0.2, 0.25, 0.22), 0.05);
  for (let k = -3; k <= 3; k++) { const a = k * 0.42; d = min(d, dCap(x, y, z, sin(a) * 0.15, 4.0, cos(a) * 0.12, 0.035, sin(a) * 0.55, 4.2, cos(a) * 0.45, 0.01)); }
  for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; d = sm(d, dCap(x, y, z, cos(a) * 0.5, 0.25, sin(a) * 0.5, 0.06, cos(a) * 0.38, 2.6, sin(a) * 0.36, 0.03), 0.08); }
  return max(d, -y);
};
// the Sphinx, lying with its paws forward (+z): 8 m long, 3.9 m tall
const sphinx = (x, y, z) => {
  let d = dBox(x, y, z, 0, 1.1, -1.4, 1.35, 1.0, 3.2, 0.5);
  d = sm(d, dEll(x, y, z, 0, 1.35, -3.6, 1.4, 1.2, 1.1), 0.4);
  d = sm(d, dBox(x, y, z, 0, 1.6, 0.8, 1.1, 1.3, 0.9, 0.4), 0.3);
  for (const s of [-1, 1]) d = sm(d, dBox(x, y, z, s * 0.62, 0.32, 2.4, 0.38, 0.32, 1.6, 0.12), 0.1);
  d = sm(d, dBox(x, y, z, 0, 3.05, 1.25, 0.6, 0.65, 0.55, 0.15), 0.15);
  d = sm(d, dBox(x, y, z, 0, 2.75, 0.95, 0.95, 0.75, 0.4, 0.12), 0.08);
  d = sm(d, dEll(x, y, z, 0, 3.55, 1.25, 0.62, 0.38, 0.6), 0.1);
  d = max(d, -dBox(x, y, z, 0, 3.0, 1.82, 0.06, 0.06, 0.1, 0));
  return max(d, -y);
};
// the Colossus lying broken on the seabed: torso, crowned head, arm with torch, two legs
const colossus = (x, y, z) => {
  let d = dEll(x, y, z, 0, 0.75, 0, 1.0, 0.75, 1.7);
  d = sm(d, dEll(x, y, z, 0, 0.6, 2.75, 0.55, 0.55, 0.62), 0.25);
  for (let k = 0; k < 7; k++) { const a = (k - 3) * 0.45; d = min(d, dCap(x, y, z, sin(a) * 0.3, 0.6 + cos(a) * 0.3, 3.0, 0.07, sin(a) * 0.95, 0.6 + cos(a) * 0.95, 3.15, 0.02)); }
  d = sm(d, dCap(x, y, z, 0.9, 0.55, 1.1, 0.3, 2.9, 0.35, 2.2, 0.24), 0.2);
  d = min(d, dCap(x, y, z, 2.9, 0.35, 2.2, 0.14, 3.6, 0.4, 2.7, 0.18));
  d = min(d, dCap(x, y, z, 0.55, 0.45, -2.3, 0.45, 1.5, 0.38, -5.4, 0.32));
  d = min(d, dCap(x, y, z, -0.7, 0.45, -2.6, 0.45, -2.2, 0.4, -5.2, 0.32));
  return max(d, -y);
};

// ---------------------------------------------------------------- the landmarks
// name, where, built, size, fact, replica | footprint radius, height, front, [main, accent A, accent B], builder
const LANDMARKS = [
  ['Eiffel Tower', 'Paris, France', 'Built 1887–1889', '330 m tall', 'Built as the entrance arch to the 1889 World’s Fair, it was only meant to stand for 20 years.', 'Replica at 1:20', 7.5, 17, 5.5, [10, 11, 0], () => {
    const s0 = (t) => 5 - 3.25 * pow(t, 0.8), s1 = (t) => 1.75 - 1.35 * pow(t, 0.7);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const lo = [], hi = []; for (let k = 0; k <= 6; k++) { const t = k / 6; lo.push([sx * s0(t), t * 5.4, sz * s0(t)]); hi.push([sx * s1(t), 5.4 + t * 7.6, sz * s1(t)]); }
      SW(lo, 0.7, 0.7, [sx, 0, sz]); SW(hi, 0.42, 0.42, [sx, 0, sz]);
    }
    for (let f = 0; f < 4; f++) {
      const q = qAxis(0, 1, 0, f * PI / 2), P = (x, y, z) => qv(q, x, y, z), br = (y0, y1, sf, w) => { const a = sf(y0), b = sf(y1); SW([P(-a, 0, a), P(b, 0, b)].map((p, i) => [p[0], i ? y1 : y0, p[2]]), w, w); SW([P(a, 0, a), P(-b, 0, b)].map((p, i) => [p[0], i ? y1 : y0, p[2]]), w, w); };
      for (const [y0, y1] of [[2.9, 4.1], [4.1, 5.3]]) br(y0, y1, (y) => s0(y / 5.4), 0.1);
      for (let y = 5.6; y < 12.4; y += 1.3) br(y, y + 1.3, (yy) => s1(min((yy - 5.4) / 7.6, 1)), 0.08);
      const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12 * PI; pts.push(P(cos(t) * 3.3, 0, 4.0)); pts[k][1] = 0.6 + sin(t) * 1.75; }
      SW(pts, 0.22, 0.3, P(0, 0, 1));
    }
    for (let f = 0; f < 4; f++) { const yaw = f * PI / 2; B(sin(yaw) * 3.45, 2.6, cos(yaw) * 3.45, 3.75, 0.28, 0.42, yaw); B(sin(yaw) * 1.8, 5.4, cos(yaw) * 1.8, 2.05, 0.22, 0.32, yaw); }
    B(0, 13.15, 0, 0.55, 0.25, 0.55); L(0, 0, [[0.32, 13.4], [0.26, 14.2], [0.13, 15.2], [0.05, 16.2], [0, 16.7]], 8, aA()); C(0, 9.3, 0, 1.0, 3.7);
  }],
  ['Leaning Tower of Pisa', 'Pisa, Italy', 'Built 1173–1372', '56 m tall', 'The bell tower began to lean during construction because of soft ground. Work from 1990 to 2001 reduced its tilt.', 'Replica at 1:6', 4, 11, 2.5, [1, 0, 0], () => {
    L(0, 0, [[1.75, 0], [1.75, 1.6], [1.85, 1.6], [1.85, 1.72], [1.45, 1.72]], 24);
    for (let f = 0; f < 6; f++) {
      const y = 1.72 + f * 1.15;
      L(0, 0, [[1.4, y], [1.4, y + 1.0]], 24, 0.55);
      RING(16, 1.68, (x, z) => COL(x, z, 0.07, 0.95, y, 1), f * 0.2);
      L(0, 0, [[1.85, y + 0.95], [1.85, y + 1.15], [1.4, y + 1.15]], 24);
    }
    L(0, 0, [[1.2, 8.62], [1.2, 9.6], [1.3, 9.6], [1.3, 9.7], [0, 9.7]], 24); RING(10, 1.22, (x, z) => WIN(atan2(x, z), 1.21, 0, 9.1, 0.12, 0.3));
    LEAN(0.07);
  }],
  ['Big Ben', 'London, England', 'Completed 1859', '96 m tall', 'Big Ben is really the name of the great bell. The tower itself was renamed Elizabeth Tower in 2012.', 'Replica at 1:6', 3.5, 16, 2.5, [6, 11, 15], () => {
    B(0, 0.3, 0, 1.5, 0.3, 1.5); T4(0, 0, 1.3, 1.22, 0.6, 8.6);
    for (let f = 0; f < 4; f++) { const yaw = f * PI / 2; for (const x of [-0.75, -0.25, 0.25, 0.75]) WIN(yaw, 1.27, x, 4.6, 0.12, 3.6); }
    B(0, 9.4, 0, 1.45, 0.85, 1.45);
    for (let f = 0; f < 4; f++) { const yaw = f * PI / 2, q = qAxis(0, 1, 0, yaw), p = qv(q, 0, 0, 1.47); BT(p[0], 9.4, p[2], 0.8, 0.8, 0.03, q, aA()); const d = qv(q, 0, 0, 1.5); BT(d[0], 9.4, d[2], 0.62, 0.62, 0.02, q, 0.95); for (const [a, l] of [[0.4, 0.42], [2.1, 0.3]]) BT(d[0] + qv(q, sin(a) * l / 2, 0, 0)[0], 9.4 + cos(a) * l / 2, d[2] + qv(q, sin(a) * l / 2, 0, 0)[2], 0.025, l / 2, 0.03, qMul(q, qAxis(0, 0, 1, -a)), 0.1); }
    T4(0, 0, 1.25, 1.2, 10.25, 11.3, 1, false); for (let f = 0; f < 4; f++) WIN(f * PI / 2, 1.23, 0, 10.8, 0.5, 0.35);
    L(0, 0, [[1.4 * SQ, 11.3], [0.8 * SQ, 12.7], [0.35 * SQ, 14.6], [0, 15.6]], 4, aB(), true, PI / 4);
    RING(4, 1.25 * SQ, (x, z) => SPIRE(x, 11.3, z, 0.18, 1.6, aA()), PI / 4); L(0, 0, [[0.06, 15.5], [0.02, 16.0], [0, 16.1]], 6, aA(), false, 0, false);
  }],
  ['Tower Bridge', 'London, England', 'Built 1886–1894', 'Towers 65 m tall', 'Its two road decks, the bascules, lift up to let tall ships pass along the Thames.', 'Replica at 1:7', 11.5, 10, 2.2, [6, 15, 0], () => {
    for (const s of [-1, 1]) {
      const x = s * 4.5;
      B(x, 0.75, 0, 1.7, 0.75, 1.5);
      for (const z of [-0.85, 0.85]) B(x, 3.9, z, 1.25, 2.4, 0.42);
      B(x, 6.9, 0, 1.25, 0.6, 1.27);
      for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { L(x + cx * 1.15, cz * 1.15, [[0.33, 1.5], [0.33, 8.2]], 10); SPIRE(x + cx * 1.15, 8.2, cz * 1.15, 0.36, 0.9, aA()); }
      HIP(x, 7.5, 0, 1.2, 1.2, 1.7, 0, aA()); ARCH(x, 3.6, 0, 0.42, 1.27, PI / 2, 0.5);
      B(s * 7.9, 2.65, 0, 3.4, 0.15, 1.0);
      const ch = []; for (let k = 0; k <= 10; k++) { const t = k / 10; ch.push([s * mix(4.5, 11.3, t), mix(6.6, 2.8, t) - 1.4 * sin(t * PI), 0]); }
      for (const z of [-1.0, 1.0]) SW(ch.map((p) => [p[0], p[1], z]), 0.14, 0.14, [0, 1, 0], aA());
      BT(s * 2.39, 4.0, 0, 1.6, 0.12, 1.0, qAxis(0, 0, 1, -s * 1.0)); // the bascules, raised
    }
    for (const z of [-0.45, 0.45]) B(0, 6.75, z, 3.25, 0.22, 0.2, 0, aA());
  }],
  ['Arc de Triomphe', 'Paris, France', 'Built 1806–1836', '50 m tall', 'Commissioned by Napoleon after his victory at Austerlitz. The Tomb of the Unknown Soldier lies beneath it.', 'Replica at 1:5', 5.5, 10.5, 2.4, [6, 0, 0], () => {
    for (const s of [-1, 1]) { B(s * 3.0, 3.6, 0, 1.5, 3.6, 2.2); WIN(0, 2.21, s * 3.0, 3.0, 0.9, 1.4); WIN(PI, 2.21, s * 3.0, 3.0, 0.9, 1.4); ARCH(s * 4.5, 2.2, 0, 0.7, 0.75, PI / 2, 0.9); }
    ARCH(0, 5.7, 0, 1.5, 2.2); B(0, 8.0, 0, 4.5, 0.8, 2.2); B(0, 8.9, 0, 4.65, 0.12, 2.35); B(0, 9.5, 0, 4.5, 0.55, 2.2);
    for (const z of [-2.21, 2.21]) for (let k = -3; k <= 3; k++) BT(k * 1.25, 9.5, z, 0.45, 0.3, 0.03, null, 0.55);
  }],
  ['Brandenburg Gate', 'Berlin, Germany', 'Built 1788–1791', '26 m tall', 'Crowned by the Quadriga, a chariot drawn by four horses, it became a symbol of German reunification in 1990.', 'Replica at 1:4', 6, 7.5, 1.8, [0, 8, 0], () => {
    B(0, 0.2, 0, 5.6, 0.2, 1.5);
    ROW(6, -4.4, 4.4, (x) => { for (const z of [-0.95, 0.95]) COL(x, z, 0.3, 4.4, 0.4); if (abs(x) > 1) B(x, 2.4, 0, 0.18, 2.0, 0.85); });
    B(0, 5.15, 0, 5.2, 0.35, 1.35); B(0, 5.6, 0, 5.3, 0.1, 1.45); B(0, 6.1, 0, 3.0, 0.4, 1.1);
    for (const s of [-1, 1]) B(s * 6.0, 2.4, 0, 0.6, 2.4, 1.2);
    B(0, 6.75, -0.1, 0.45, 0.25, 0.35, 0, aA());
    ROW(4, -0.75, 0.75, (x) => { B(x, 7.0, 0.55, 0.12, 0.25, 0.45, 0, aA()); BT(x, 7.4, 0.95, 0.09, 0.2, 0.12, qAxis(1, 0, 0, -0.5), aA()); });
    L(0, -0.1, [[0.1, 6.95], [0.08, 8.0], [0, 8.05]], 6, aA()); B(0, 8.0, -0.1, 0.25, 0.04, 0.04, 0, aA());
  }],
  ['Parthenon', 'Athens, Greece', 'Built 447–432 BC', '13.7 m tall', 'A Doric temple to the goddess Athena, built on the Acropolis at the height of ancient Athens.', 'Replica at 1:2', 8.5, 7.5, 7.6, [1, 0, 0], () => {
    rseed(400);
    B(0, 0.12, 0, 3.75, 0.12, 7.75); B(0, 0.36, 0, 3.5, 0.12, 7.5); B(0, 0.6, 0, 3.3, 0.12, 7.3);
    const gone = new Set([3, 11, 19, 26, 33, 38]); let n = 0;
    const col = (x, z) => { if (gone.has(n++)) return; COL(x, z, 0.3, 4.2, 0.72); };
    ROW(8, -2.9, 2.9, (x) => { col(x, 7.0); col(x, -7.0); });
    ROW(15, -6.1, 6.1, (z) => { col(-2.9, z); col(2.9, z); });
    for (const z of [-7.0, 7.0]) { B(0, 5.25, z, 3.25, 0.32, 0.38); B(0, 5.7, z, 3.3, 0.12, 0.42); GABLE(0, 5.82, z, 0.38, 3.3, 1.0, PI / 2); }
    for (const s of [-1, 1]) for (const [z0, z1] of [[-7, -1.5], [2.5, 7]]) B(s * 2.9, 5.25, (z0 + z1) / 2, 0.38, 0.32, (z1 - z0) / 2);
    B(0, 1.4, -1.5, 1.9, 0.7, 4.0, 0, 0.8);
    for (let k = 0; k < 3; k++) BT(rr(-6, 6), 0.3, rr(8.5, 10), 0.3, 0.3, rr(0.4, 0.9), qAxis(0, 1, 0, rr(0, 3)));
  }],
  ['Pantheon', 'Rome, Italy', 'Built c. AD 113–125', '43 m tall', 'Its dome, open to the sky through the oculus, is still the largest unreinforced concrete dome in the world.', 'Replica at 1:5', 8, 9.5, 7.4, [2, 7, 0], () => {
    L(0, 0, [[4.2, 0], [4.2, 4.9], [4.4, 4.9], [4.4, 5.1], [4.2, 5.1], [4.2, 5.4], [4.0, 5.4], [4.0, 5.65], [3.9, 6.3], [3.45, 7.35], [2.65, 8.15], [1.45, 8.75], [0.6, 9.0], [0.6, 8.95]], 36);
    RING(8, 4.21, (x, z, a) => { if (cos(a) < 0.9) WIN(atan2(x, z), 4.21, 0, 2.6, 0.5, 1.2); });
    B(0, 3.1, 4.6, 2.7, 3.1, 0.9); WIN(0, 5.5, 0, 2.2, 0.8, 1.6);
    ROW(8, -3.0, 3.0, (x) => COL(x, 7.1, 0.28, 4.6, 0.3, aA()));
    for (const z of [6.15, 5.25]) for (const x of [-3.0, -2.15, 2.15, 3.0]) COL(x, z, 0.28, 4.6, 0.3, aA());
    B(0, 0.15, 6.2, 3.5, 0.15, 1.7); B(0, 5.25, 6.2, 3.35, 0.35, 1.5); GABLE(0, 5.6, 6.2, 1.5, 3.45, 1.35, PI / 2);
  }],
  ['Sagrada Família', 'Barcelona, Spain', 'Begun in 1882', 'Main tower 172.5 m', 'Antoni Gaudí’s basilica has been under construction for more than 140 years.', 'Replica at 1:10', 6.5, 17.5, 6.0, [0, 11, 8], () => {
    B(0, 2.3, -1.5, 3.4, 2.3, 4.6); GABLE(0, 4.6, -1.5, 4.6, 3.4, 2.2, PI / 2, 0.9);
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) SPIRE(s * 3.5, 4.6, -5 + k * 1.9, 0.3, 1.6);
    const tower = (x, z, h, r) => {
      L(x, z, [[r, 0], [r, h * 0.45], [r * 0.85, h * 0.62], [r * 0.6, h * 0.8], [r * 0.32, h * 0.93], [0.08, h]], 12);
      for (let y = 1.2; y < h * 0.8; y += 0.7) L(x, z, [[r * (1.02 - y / h * 0.5), y], [r * (1.02 - y / h * 0.5), y + 0.18]], 12, 0.3, false, 0, false);
      L(x, z, [[0.16, h], [0.24, h + 0.3], [0.12, h + 0.6], [0, h + 0.7]], 10, aA(), false, 0, false);
    };
    tower(-2.6, 3.4, 10.5, 0.62); tower(-0.95, 3.6, 12.2, 0.66); tower(0.95, 3.6, 12.2, 0.66); tower(2.6, 3.4, 10.5, 0.62);
    B(0, 2.7, 3.4, 3.2, 2.7, 0.35); ARCH(0, 2.8, 3.8, 0.9, 0.3, 0, aB()); WIN(0, 3.78, 0, 1.4, 0.75, 1.4);
    tower(0, -1.2, 16.6, 1.3); for (const [x, z] of [[-2, -0.2], [2, -0.2], [-2, -2.6], [2, -2.6]]) tower(x, z, 12.6, 0.62); tower(0, -4.8, 13.8, 0.8);
    B(0, 17.6, -1.2, 0.08, 0.5, 0.08, 0, aA()); B(0, 17.75, -1.2, 0.32, 0.08, 0.08, 0, aA());
  }],
  ['Saint Basil’s Cathedral', 'Moscow, Russia', 'Built 1555–1561', '47.5 m tall', 'Ordered by Ivan the Terrible; its chapels are crowned with brightly painted onion domes.', 'Replica at 1:5', 5.5, 10.5, 4.2, [13, 8, 11], () => {
    B(0, 0.6, 0, 4.4, 0.6, 4.4, PI / 4);
    L(0, 0, [[1.4, 1.2], [1.4, 5.0], [1.55, 5.0], [1.55, 5.3], [1.3, 5.3]], 8, 1, true, PI / 8);
    L(0, 0, [[1.3, 5.3], [0.45, 8.6], [0, 8.65]], 8, aB(), true, PI / 8); L(0, 0, [[0.32, 8.55], [0.32, 8.9]], 8); ONION(0, 8.9, 0, 0.42, aB());
    RING(8, 3.1, (x, z, a, k) => {
      const big = k % 2 === 0, r = big ? 0.95 : 0.62, h = big ? 4.6 : 3.6;
      L(x, z, [[r, 1.2], [r, h], [r * 1.1, h], [r * 1.1, h + 0.2], [r * 0.6, h + 0.2]], 8, 1, true, PI / 8);
      L(x, z, [[r * 0.58, h + 0.2], [r * 0.58, h + 0.75]], 10, 0.9);
      ONION(x, h + 0.75, z, r * 0.95, k % 3 === 1 ? aB() : aA(), 14);
      WIN(atan2(x, z), r * 0.93 + hypot(x, z), 0, h * 0.6, r * 0.25, 0.45);
    });
  }],
  ['Neuschwanstein Castle', 'Bavaria, Germany', 'Built 1869–1886', '65 m tall', 'Built for King Ludwig II, who lived there for only a few months. It inspired many fairy-tale castles.', 'Replica at 1:6', 6.5, 11, 3.5, [12, 15, 6], () => {
    B(0, 0.8, 0, 5.4, 0.8, 2.8, 0, aB()); B(0.2, 4.4, -0.3, 4.2, 2.8, 1.4); GABLE(0.2, 7.2, -0.3, 4.2, 1.45, 1.7, 0, aA());
    for (const z of [1.11, -1.71]) for (let r = 0; r < 3; r++) for (let k = -3; k <= 3; k++) WIN(z > 0 ? 0 : PI, abs(z), (z > 0 ? 1 : -1) * (0.2 + k * 1.15), 2.6 + r * 1.5, 0.18, 0.4);
    L(3.0, 1.3, [[0.75, 1.6], [0.75, 8.4], [0.85, 8.4], [0.85, 8.6]], 14); L(3.0, 1.3, [[0.88, 8.6], [0, 10.7]], 14, aA(), false, 0, false);
    T4(-3.6, 0.2, 0.95, 0.9, 1.6, 7.6); HIP(-3.6, 7.6, 0.2, 1.05, 1.05, 1.5, 0, aA());
    for (const [x, z, h] of [[-1.4, 1.25, 7.0], [1.2, 1.3, 6.2], [4.6, -1.4, 7.4], [-2.2, -1.9, 6.6]]) { L(x, z, [[0.32, 1.6], [0.32, h]], 10); SPIRE(x, h, z, 0.36, 1.2, aA(), 10); }
    B(1.6, 2.6, 2.2, 1.6, 1.0, 0.8, 0, aB()); GABLE(1.6, 3.6, 2.2, 1.6, 0.85, 0.7, 0, aA());
  }],
  ['Hagia Sophia', 'Istanbul, Türkiye', 'Built AD 532–537', '55 m tall', 'For nearly a thousand years it was the largest cathedral in the world.', 'Replica at 1:8', 7.5, 9, 5.0, [2, 15, 11], () => {
    B(0, 1.75, 0, 4.6, 1.75, 4.6); for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) B(x * 3.3, 2.9, z * 3.3, 1.1, 0.6, 1.1);
    L(0, 0, [[3.2, 3.5], [3.2, 4.4], [3.35, 4.4], [3.35, 4.55]], 32); RING(20, 3.21, (x, z) => WIN(atan2(x, z), 3.21, 0, 3.95, 0.16, 0.3));
    L(0, 0, [[3.3, 4.55], [3.05, 5.5], [2.35, 6.3], [1.25, 6.85], [0, 7.0]], 32, aA());
    for (const z of [-2.7, 2.7]) DOME(0, 3.4, z, 2.1, aA(), 24);
    RING(4, 6.6, (x, z) => { L(x, z, [[0.3, 0], [0.26, 5.5], [0.42, 5.5], [0.42, 5.65], [0.25, 5.65], [0.23, 7.6], [0.36, 7.6], [0.36, 7.72], [0.22, 7.72]], 12); SPIRE(x, 7.72, z, 0.24, 1.2, aA(), 12); }, PI / 4);
    L(0, 0, [[0.06, 7.0], [0.04, 7.6], [0, 7.65]], 6, aB(), false, 0, false);
  }],
  ['Notre-Dame de Paris', 'Paris, France', 'Built 1163–1345', 'Towers 69 m tall', 'Its spire fell in a fire in 2019; the restored cathedral reopened in December 2024.', 'Replica at 1:7', 10, 13.5, 5.0, [6, 15, 0], () => {
    for (const s of [-1, 1]) { B(s * 2.0, 4.75, 3.6, 1.25, 4.75, 1.25); for (const x of [-0.45, 0.45]) WIN(0, 4.86, s * 2.0 + x, 7.9, 0.18, 0.9); }
    B(0, 3.6, 3.6, 0.8, 3.6, 1.15); B(0, 7.4, 3.6, 0.8, 0.25, 1.15);
    for (let x = -2.7; x <= 2.71; x += 0.36) B(x, 4.0, 4.88, 0.12, 0.25, 0.04, 0, 0.6);
    RING(12, 0.55, (x, z) => BT(x, 5.6 + z, 4.78, 0.09, 0.09, 0.03, null, 0.12)); BT(0, 5.6, 4.78, 0.18, 0.18, 0.03, null, 0.12);
    for (const x of [-2.0, 0, 2.0]) WIN(0, 4.86, x, 1.3, 0.5, 1.0);
    B(0, 3.0, -3.0, 2.0, 3.0, 5.3); GABLE(0, 6.0, -3.0, 5.3, 2.05, 2.2, PI / 2, aA());
    B(0, 3.0, -3.6, 4.1, 3.0, 1.2); GABLE(0, 6.0, -3.6, 4.1, 1.25, 2.0, 0, aA());
    L(0, -8.4, [[2.0, 0], [2.0, 6.0]], 14); L(0, -8.4, [[2.1, 6.0], [0, 8.0]], 14, aA(), false, 0, false);
    L(0, -3.6, [[0.42, 8.0], [0.42, 9.0], [0, 13.2]], 8, aA(), true, PI / 8, false);
    for (const s of [-1, 1]) for (const z of [1.2, -0.4, -6.2, -7.6]) { B(s * 3.7, 1.9, z, 0.35, 1.9, 0.35); BT(s * 2.9, 4.4, z, 0.95, 0.09, 0.14, qAxis(0, 0, 1, s * 0.62)); }
  }],
  ['Windmills of Kinderdijk', 'South Holland, Netherlands', 'Built 1738–1740', '19 windmills', 'The mills pumped water out of the low-lying polders to keep the land dry.', 'Miniature replica', 8.5, 8, 2.8, [10, 12, 6], () => {
    for (const [x, z, yaw] of [[-5.5, -0.6, 0.15], [0, 0.4, -0.05], [5.5, -0.4, 0.1]]) {
      L(x, z, [[1.5, 0], [1.5, 0.6]], 8, aB(), true, PI / 8); L(x, z, [[1.25, 0.6], [0.85, 4.8]], 8, 1, true, PI / 8); L(x, z, [[0.95, 4.8], [0.95, 5.1], [0.5, 5.7], [0, 5.85]], 12, 0.85);
      const q = qAxis(0, 1, 0, yaw), hub = qv(q, 0, 0, 1.15);
      for (let k = 0; k < 4; k++) {
        const a = k * PI / 2 + 0.35, qa = qMul(q, qAxis(0, 0, 1, a)), m = qv(qa, 0, 1.45, 0), pn = qv(qa, 0.17, 1.6, -0.03);
        BT(x + hub[0] + m[0], 5.05 + m[1], z + hub[2] + m[2], 0.05, 1.45, 0.05, qa);
        BT(x + hub[0] + pn[0], 5.05 + pn[1], z + hub[2] + pn[2], 0.22, 1.2, 0.015, qa, aA());
      }
      B(x, 0.9, z + 1.3, 0.35, 0.3, 0.25, 0, 0.12);
    }
  }],
  ['White Tower', 'Tower of London, England', 'Begun c. 1078', '27 m tall', 'Built for William the Conqueror. The Tower of London has been a royal palace, a prison and home of the Crown Jewels.', 'Replica at 1:3', 7, 10, 3.0, [6, 15, 0], () => {
    B(0, 3.3, 0, 3.4, 3.3, 2.8);
    for (const [x, z] of [[-3.4, 2.8], [3.4, 2.8], [3.4, -2.8]]) { T4(x, z, 0.7, 0.68, 0, 7.8); ONION(x, 7.8, z, 0.62, aA(), 12); }
    L(-3.4, -2.8, [[0.85, 0], [0.82, 7.8]], 16); ONION(-3.4, 7.8, -2.8, 0.72, aA(), 12);
    for (let x = -3.0; x <= 3.01; x += 0.5) for (const z of [-2.85, 2.85]) B(x, 6.75, z, 0.14, 0.15, 0.08);
    for (let z = -2.4; z <= 2.41; z += 0.5) for (const x of [-3.45, 3.45]) B(x, 6.75, z, 0.08, 0.15, 0.14);
    for (const [yaw, d] of [[0, 2.81], [PI, 2.81]]) for (let r = 0; r < 3; r++) for (const x of [-2.2, -1.1, 0, 1.1, 2.2]) WIN(yaw, d, x, 1.6 + r * 1.7, 0.16, 0.35);
    RING(24, 6.2, (x, z, a) => { if (abs(a - PI * 0.5) > 0.4) { B(x, 0.8, z, 0.85, 0.8, 0.35, PI / 2 - a); B(x, 1.75, z, 0.25, 0.15, 0.3, PI / 2 - a); } });
  }],
  ['Rialto Bridge', 'Venice, Italy', 'Built 1588–1591', 'Span 28.8 m', 'The oldest of the four bridges across the Grand Canal, lined with shops along its arch.', 'Replica at 1:3.6', 6.5, 4.5, 2.4, [1, 6, 0], () => {
    const R = 5.6, cy = -2.9, pts = []; for (let k = 0; k <= 16; k++) { const t = mix(PI * 0.79, PI * 0.21, k / 16); pts.push([cos(t) * R, cy + sin(t) * R, 0]); }
    SW(pts, 0.45, 4.4, [0, 0, 1]);
    for (const s of [-1, 1]) { B(s * 5.0, 0.75, 0, 1.0, 0.75, 2.3); BT(s * 2.4, 2.0, 0, 2.5, 0.12, 1.0, qAxis(0, 0, 1, -s * 0.33)); for (const z of [-1.95, 1.95]) BT(s * 2.4, 2.35, z, 2.5, 0.22, 0.12, qAxis(0, 0, 1, -s * 0.33), aA()); }
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const x = s * (0.9 + k * 1.15), y = 2.95 - k * 0.38; for (const z of [-1.4, 1.4]) { B(x, y + 0.5, z, 0.5, 0.55, 0.4); GABLE(x, y + 1.05, z, 0.5, 0.45, 0.32, 0, aA(0.8)); } }
    B(0, 3.6, 0, 0.6, 0.95, 1.9); GABLE(0, 4.55, 0, 1.9, 0.7, 0.55, PI / 2); for (const z of [-1.91, 1.91]) WIN(z > 0 ? 0 : PI, 1.91, 0, 3.4, 0.3, 0.55);
  }],
  ['Florence Cathedral', 'Florence, Italy', 'Dome built 1420–1436', '114.5 m tall', 'Filippo Brunelleschi’s dome is still the largest brick dome ever built.', 'Replica at 1:9', 8, 13, 7.5, [1, 13, 8], () => {
    B(0, 2.3, 2.6, 2.6, 2.3, 4.6); GABLE(0, 4.6, 2.6, 4.6, 2.65, 1.3, PI / 2, aA());
    for (let k = 0; k < 6; k++) for (const s of [-1, 1]) BT(s * 2.61, 2.3, -1.4 + k * 1.6, 0.03, 2.2, 0.08, null, aB());
    B(0, 2.8, 7.25, 2.6, 2.8, 0.15); GABLE(0, 5.6, 7.25, 0.15, 2.6, 1.3, 0); for (const x of [-1.5, 0, 1.5]) WIN(0, 7.42, x, 1.3, 0.38, 0.8);
    L(0, -4, [[3.4, 0], [3.4, 6.5]], 8, 1, true, PI / 8);
    const prof = [[3.2, 6.5], [3.15, 7.4], [2.8, 8.6], [2.0, 9.8], [1.0, 10.6], [0.6, 10.8]];
    L(0, -4, prof, 8, aA(), true, PI / 8);
    for (let k = 0; k < 8; k++) { const a = PI / 8 + k * PI / 4; SW(prof.map(([r, y]) => [cos(a) * r * 1.01, y, -4 + sin(a) * r * 1.01]), 0.16, 0.12, [cos(a), 0, sin(a)]); }
    L(0, -4, [[0.6, 10.8], [0.6, 11.5], [0.3, 11.9], [0, 12.7]], 8, 1, true, PI / 8); L(0, -4, [[0.12, 12.6], [0.14, 12.8], [0, 13.0]], 8, aB(), false, 0, false);
    for (const a of [0, PI / 2, -PI / 2]) { const x = sin(a) * 3.6, z = -4 - cos(a) * 3.6; L(x, z, [[1.5, 0], [1.5, 3.4]], 8, 1, true, PI / 8); DOME(x, 3.4, z, 1.5, aA(), 16); }
    T4(4.6, 6.0, 0.95, 0.9, 0, 9.4); for (let y = 1.8; y < 9; y += 1.8) T4(4.6, 6.0, 0.97, 0.97, y, y + 0.12, aB(), false);
  }],
  ['Great Wall of China', 'Northern China', 'Built 7th century BC – AD 1644', 'Over 21,000 km long', 'Most of the wall standing today was built during the Ming dynasty.', 'Miniature replica', 13, 5.5, 3.0, [3, 0, 0], () => {
    const P = [[-12.5, 0, 1.2], [-6.5, 0, -0.6], [0, 0, 0.9], [6.5, 0, -0.8], [12.5, 0, 0.6]];
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], l = hypot(dx, dz), yaw = atan2(-dz, dx), ux = dx / l, uz = dz / l;
      B((a[0] + b[0]) / 2, 1.2, (a[2] + b[2]) / 2, l / 2 + 0.3, 1.2, 0.95, yaw);
      for (let t = 0.4; t < l; t += 0.75) for (const s of [-1, 1]) B(a[0] + ux * t - uz * s * 0.85, 2.6, a[2] + uz * t + ux * s * 0.85, 0.2, 0.2, 0.1, yaw);
    }
    for (const p of [P[0], P[2], P[4]]) { B(p[0], 2.0, p[2], 1.5, 2.0, 1.5); for (let k = -2; k <= 2; k++) for (const s of [-1, 1]) { B(p[0] + k * 0.6, 4.2, p[2] + s * 1.42, 0.17, 0.2, 0.08); B(p[0] + s * 1.42, 4.2, p[2] + k * 0.6, 0.08, 0.2, 0.17); } for (const s of [-1, 1]) BT(p[0], 2.5, p[2] + s * 1.52, 0.35, 0.55, 0.03, null, 0.1); }
  }],
  ['Forbidden City', 'Beijing, China', 'Built 1406–1420', 'About 980 buildings', 'The imperial palace of China’s emperors for nearly 500 years. This is its Hall of Supreme Harmony.', 'Miniature replica', 8, 7.5, 4.6, [13, 11, 12], () => {
    B(0, 0.3, 0, 6.8, 0.3, 4.4, 0, aB()); B(0, 0.9, 0, 6.2, 0.3, 3.9, 0, aB()); B(0, 1.5, 0, 5.6, 0.3, 3.4, 0, aB());
    for (let x = -5.6; x <= 5.61; x += 0.4) for (const z of [-3.4, 3.4]) B(x, 1.95, z, 0.04, 0.15, 0.04, 0, aB());
    B(0, 0.9, 4.6, 1.2, 0.05, 1.0, 0, aB()); BT(0, 1.0, 4.4, 1.0, 0.08, 1.0, qAxis(1, 0, 0, 0.45), aB());
    B(0, 2.95, -0.2, 4.4, 1.15, 2.0); ROW(11, -4.5, 4.5, (x) => COL(x, 2.3, 0.15, 2.3, 1.8));
    HIP(0, 4.1, 0, 5.3, 2.9, 0.75, 0, aA()); B(0, 4.65, -0.1, 3.8, 0.4, 1.6); HIP(0, 5.05, -0.1, 4.8, 2.4, 1.45, 0, aA());
    for (const s of [-1, 1]) B(s * 2.4, 6.55, -0.1, 0.12, 0.2, 0.08, 0, aA());
  }],
  ['Temple of Heaven', 'Beijing, China', 'Built 1406–1420', 'Hall 38 m tall', 'Emperors prayed here for good harvests. Its round hall stands on three white marble terraces.', 'Replica at 1:5.5', 6.5, 7.5, 6.2, [13, 15, 12], () => {
    for (const [r, y] of [[6.0, 0], [5.2, 0.5], [4.4, 1.0]]) { L(0, 0, [[r, y], [r, y + 0.5], [0, y + 0.5]], 36, aB()); RING(48, r - 0.05, (x, z) => B(x, y + 0.6, z, 0.035, 0.1, 0.035, 0, aB())); }
    for (const a of [0, PI / 2, PI, 1.5 * PI]) BT(sin(a) * 5.6, 0.75, cos(a) * 5.6, 0.55, 0.06, 1.0, qMul(qAxis(0, 1, 0, a), qAxis(1, 0, 0, 0.42)), aB());
    L(0, 0, [[2.4, 1.5], [2.4, 3.2]], 24); RING(12, 2.42, (x, z) => WIN(atan2(x, z), 2.42, 0, 2.3, 0.22, 0.55));
    L(0, 0, [[3.0, 3.2], [3.0, 3.3], [1.9, 3.95], [0, 3.95]], 28, aA()); L(0, 0, [[1.95, 3.9], [1.95, 4.5]], 24);
    L(0, 0, [[2.5, 4.5], [2.5, 4.6], [1.5, 5.15], [0, 5.15]], 28, aA()); L(0, 0, [[1.5, 5.1], [1.5, 5.6]], 24);
    L(0, 0, [[2.0, 5.6], [2.0, 5.7], [0.35, 6.85], [0, 6.9]], 28, aA()); L(0, 0, [[0.12, 6.85], [0.16, 7.2], [0, 7.45]], 8, 0.9, false, 0, false);
  }],
  ['Angkor Wat', 'Siem Reap, Cambodia', 'Built 12th century', 'Central tower 65 m', 'The largest religious monument in the world, first built as a Hindu temple to Vishnu.', 'Replica at 1:6', 10, 11, 9.5, [3, 0, 0], () => {
    const bud = (x, z, y, s) => L(x, z, [[1.2, 0], [1.2, 0.8], [1.05, 1.0], [1.1, 1.6], [0.95, 1.8], [1.0, 2.5], [0.8, 2.8], [0.75, 3.4], [0.5, 3.8], [0.45, 4.3], [0.2, 4.8], [0, 5.3]].map(([r, h]) => [r * s, y + h * s]), 8, 1, true, PI / 8);
    B(0, 0.5, 0, 7.0, 0.5, 7.0); B(0, 1.6, 0, 5.2, 0.6, 5.2); B(0, 2.9, 0, 3.6, 0.7, 3.6);
    for (const [w, y] of [[7.0, 1.0], [5.2, 2.2]]) for (let k = 0; k < 4; k++) { const yaw = k * PI / 2; B(sin(yaw) * (w - 0.3), y + 0.4, cos(yaw) * (w - 0.3), w - 0.6, 0.4, 0.25, yaw); }
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) bud(x * 3.0, z * 3.0, 3.6, 0.82);
    bud(0, 0, 3.6, 1.3);
    for (let k = 0; k < 4; k++) { const yaw = k * PI / 2; BT(sin(yaw) * 4.4, 2.6, cos(yaw) * 4.4, 0.6, 0.08, 1.5, qMul(qAxis(0, 1, 0, yaw), qAxis(1, 0, 0, 0.75))); }
    B(0, 0.3, 8.6, 0.9, 0.3, 1.8);
  }],
  ['Borobudur', 'Central Java, Indonesia', 'Built 9th century', '35 m tall', 'The world’s largest Buddhist temple, with 504 Buddha statues and 72 stupas around its summit.', 'Replica at 1:4.7', 8, 8, 7.2, [3, 0, 0], () => {
    const ws = [7.0, 6.2, 5.4, 4.6, 3.8]; ws.forEach((w, i) => { B(0, i * 0.7 + 0.35, 0, w, 0.35, w); for (let k = 0; k < 4; k++) { const yaw = k * PI / 2; B(sin(yaw) * (w - 0.1), i * 0.7 + 0.82, cos(yaw) * (w - 0.1), w - 0.2, 0.12, 0.08, yaw); } });
    const bell = (x, z, y, s) => L(x, z, [[0.32, 0], [0.36, 0.2], [0.3, 0.5], [0.15, 0.7], [0.06, 0.78], [0.05, 0.95], [0, 1.02]].map(([r, h]) => [r * s, y + h * s]), 10);
    [[3.3, 3.5, 16], [2.7, 3.95, 12], [2.1, 4.4, 8]].forEach(([r, y, n], i) => { L(0, 0, [[r + 0.3, y], [r + 0.3, y + 0.45], [0, y + 0.45]], 32); RING(n, r, (x, z) => bell(x, z, y + 0.45, 1.0), i * 0.2); });
    bell(0, 0, 4.85, 3.0);
    for (let k = 0; k < 4; k++) { const yaw = k * PI / 2; BT(sin(yaw) * 6.0, 1.9, cos(yaw) * 6.0, 0.5, 0.08, 2.2, qMul(qAxis(0, 1, 0, yaw), qAxis(1, 0, 0, 0.6))); }
  }],
  ['Himeji Castle', 'Hyōgo, Japan', 'Keep completed 1609', '46 m tall', 'Called the White Heron Castle for its brilliant white walls; it has survived wars, earthquakes and bombing.', 'Replica at 1:4', 6.5, 11.5, 4.5, [12, 15, 7], () => {
    L(0, 0, [[4.2 * SQ, 0], [3.3 * SQ, 2.2], [0, 2.2]], 4, aB(), true, PI / 4);
    const st = [[3.0, 2.3, 1.5], [2.6, 2.0, 1.3], [2.2, 1.7, 1.2], [1.8, 1.4, 1.1], [1.45, 1.15, 1.1]]; let y = 2.2;
    st.forEach(([hx, hz, h], i) => {
      B(0, y + h / 2, 0, hx, h / 2, hz); for (const z of [hz, -hz]) for (let k = -1; k <= 1; k++) WIN(z > 0 ? 0 : PI, hz + 0.01, k * hx * 0.55, y + h * 0.45, 0.14, 0.18);
      HIP(0, y + h, 0, hx + 0.45, hz + 0.45, i === st.length - 1 ? 1.4 : 0.55, 0, aA());
      if (i % 2 === 0) for (const s of [-1, 1]) GABLE(0, y + h, s * (hz + 0.2), 0.45, 0.7, 0.6, PI / 2, aA()); y += h + 0.15;
    });
    for (const s of [-1, 1]) { B(s * 3.6, 3.3, -1.2, 1.1, 1.1, 0.9); HIP(s * 3.6, 4.4, -1.2, 1.5, 1.3, 0.9, 0, aA()); }
  }],
  ['Tō-ji Pagoda', 'Kyoto, Japan', 'Rebuilt 1644', '55 m tall', 'The tallest wooden pagoda in Japan.', 'Replica at 1:6', 4.5, 10, 3.5, [10, 15, 11], () => {
    B(0, 0.25, 0, 2.2, 0.25, 2.2, 0, 0.9); let y = 0.5;
    for (let k = 0; k < 5; k++) {
      const w = 1.4 - k * 0.12, h = 0.85;
      B(0, y + h / 2, 0, w, h / 2, w); for (let f = 0; f < 4; f++) WIN(f * PI / 2, w + 0.01, 0, y + h * 0.45, w * 0.3, h * 0.32);
      L(0, 0, [[w * 1.95 * SQ, y + h], [w * 2.0 * SQ, y + h + 0.06], [w * 0.95 * SQ, y + h + 0.5]], 4, aA(), true, PI / 4); y += h + 0.4;
    }
    L(0, 0, [[0.14, y - 0.4], [0.1, y + 2.4]], 10, aB()); for (let k = 0; k < 9; k++) L(0, 0, [[0.24, y - 0.1 + k * 0.22], [0.24, y + k * 0.22], [0.1, y + k * 0.22]], 10, aB(), false, 0, false);
    L(0, 0, [[0.18, y + 2.3], [0.2, y + 2.5], [0, y + 2.7]], 10, aB(), false, 0, false);
  }],
  ['Shwedagon Pagoda', 'Yangon, Myanmar', 'Built c. 6th–10th century', '99 m tall', 'Its stupa is covered in gold plates and crowned with thousands of diamonds.', 'Replica at 1:8', 7, 13, 6.0, [11, 12, 0], () => {
    L(0, 0, [[6.0, 0], [6.0, 0.5], [5.2, 0.5], [5.2, 0.9], [4.5, 0.9], [4.5, 1.2], [0, 1.2]], 8, aA(), true, PI / 8);
    L(0, 0, [[3.8, 1.2], [3.6, 1.6], [3.9, 1.9], [3.4, 2.3], [3.3, 2.7], [3.0, 3.0], [3.1, 3.6], [2.9, 4.6], [2.4, 5.6], [1.7, 6.4], [1.2, 6.9], [1.0, 7.4], [0.9, 7.6], [1.0, 7.9], [0.7, 8.6], [0.6, 9.0], [0.45, 9.8], [0.35, 10.6], [0.2, 11.6], [0.08, 12.4], [0, 12.9]], 28);
    RING(12, 5.0, (x, z, a, k) => L(x, z, [[0.4, 1.2], [0.42, 1.5], [0.3, 1.9], [0.12, 2.4], [0, 2.8 + (k % 2) * 0.4]], 10), PI / 12);
  }],
  ['Treasury of Petra', 'Petra, Jordan', 'Carved 1st century AD', '40 m tall', 'Carved straight into the rose-red sandstone cliff by the Nabataeans.', 'Replica at 1:4.5', 8, 12.5, 2.4, [0, 5, 0], () => {
    rseed(410);
    for (let k = 0; k < 7; k++) BT(rr(-7, 7), rr(5, 11), rr(-3.5, -2), rr(2, 3.5), rr(2.5, 4), rr(1.5, 2.5), qAxis(0, 1, 0, rr(-0.3, 0.3)), aA());
    B(0, 6.2, -1.6, 7.5, 6.2, 1.4, 0, aA());
    B(0, 0.2, 0.6, 4.0, 0.2, 1.2); ROW(6, -2.7, 2.7, (x) => COL(x, 1.3, 0.28, 3.9, 0.4));
    B(0, 4.6, 0.6, 3.3, 0.3, 1.0); GABLE(0, 4.9, 0.9, 0.4, 1.6, 0.8, PI / 2); WIN(0, 0.3, 0, 2.0, 0.55, 1.1);
    B(0, 5.5, 0, 3.3, 0.45, 0.9); for (const s of [-1, 1]) { B(s * 2.4, 7.1, 0.1, 0.9, 1.4, 0.7); GABLE(s * 2.4, 8.5, 0.2, 0.2, 0.95, 0.6, PI / 2); for (const x of [-0.6, 0.6]) COL(s * 2.4 + x, 0.75, 0.13, 2.6, 5.9); }
    L(0, 0.3, [[0.95, 5.9], [0.95, 8.4]], 16); RING(8, 1.12, (x, z) => COL(x, 0.3 + z, 0.1, 2.4, 5.95), PI / 8);
    L(0, 0.3, [[1.25, 8.4], [1.25, 8.6], [0.2, 9.4], [0.25, 9.6], [0.38, 9.9], [0, 10.3]], 16);
  }],
  ['Qutub Minar', 'Delhi, India', 'Built c. 1199–1220', '72.5 m tall', 'The tallest brick minaret in the world, carved with bands of calligraphy.', 'Replica at 1:7.5', 3.5, 10, 2.6, [5, 0, 0], () => {
    const fl = (r0, r1, y0, y1) => { // fluted: 24 facets pushed in and out
      const n0 = KM.p.length / 3; mLathe(KM, [0, 1, 2, 3].map((i) => [mix(r0, r1, i / 3), mix(y0, y1, i / 3), 1]), 24, 0, 0, 0, 0, true);
      for (let i = n0; i < KM.p.length / 3; i++) { const x = KM.p[i * 3], z = KM.p[i * 3 + 2], f = 1 + 0.07 * cos(atan2(z, x) * 12); KM.p[i * 3] = x * f; KM.p[i * 3 + 2] = z * f; }
      REC.push([1, 0, (y0 + y1) / 2, 0, 0, (r0 + r1) / 2, (y1 - y0) / 2]);
    };
    fl(1.45, 1.25, 0, 3.0); fl(1.2, 1.05, 3.15, 5.3); fl(1.0, 0.88, 5.45, 7.1); fl(0.84, 0.74, 7.25, 8.3); fl(0.7, 0.62, 8.45, 9.2);
    for (const [y, r] of [[3.0, 1.25], [5.3, 1.05], [7.1, 0.88], [8.3, 0.74]]) { L(0, 0, [[r, y - 0.2], [r + 0.4, y], [r + 0.4, y + 0.15], [r - 0.05, y + 0.15]], 24, aA()); for (let k = 0; k < 2; k++) L(0, 0, [[r * 1.07, y - 0.75 - k * 0.35], [r * 1.07, y - 0.65 - k * 0.35]], 24, aA(0.85), false, 0, false); }
    L(0, 0, [[0.6, 9.2], [0.6, 9.6], [0.68, 9.6], [0.4, 10.0], [0, 10.15]], 12, aA());
  }],
  ['Gateway of India', 'Mumbai, India', 'Built 1913–1924', '26 m tall', 'Built to mark the 1911 visit of King George V and Queen Mary to India.', 'Replica at 1:4', 5, 7, 2.0, [0, 0, 0], () => {
    for (const s of [-1, 1]) B(s * 2.25, 2.6, 0, 1.15, 2.6, 1.6); ARCH(0, 3.4, 0, 1.1, 1.6); B(0, 5.0, 0, 3.4, 0.55, 1.6);
    for (const s of [-1, 1]) for (const z of [-1, 1]) { L(s * 3.0, z * 1.35, [[0.5, 0], [0.5, 6.0]], 8, 1, true, PI / 8); DOME(s * 3.0, 6.0, z * 1.35, 0.5, 1, 12); }
    for (const s of [-1, 1]) { WIN(0, 1.61, s * 2.25, 2.4, 0.4, 1.0); WIN(PI, 1.61, -s * 2.25, 2.4, 0.4, 1.0); }
    L(0, 0, [[0.9, 5.55], [0.9, 6.0]], 12); DOME(0, 6.0, 0, 0.95, 1, 16);
    for (let x = -2.4; x <= 2.41; x += 0.6) B(x, 5.7, 1.5, 0.12, 0.15, 0.1);
  }],
  ['Blue Mosque', 'Istanbul, Türkiye', 'Built 1609–1616', 'Minarets 64 m tall', 'Named for the blue İznik tiles inside, it is one of the few mosques with six minarets.', 'Replica at 1:6', 10.5, 11, 10.0, [6, 15, 11], () => {
    B(0, 1.5, 0, 4.5, 1.5, 4.5);
    L(0, 0, [[2.6, 3.0], [2.6, 3.6]], 28); RING(16, 2.61, (x, z) => WIN(atan2(x, z), 2.61, 0, 3.3, 0.1, 0.18)); DOME(0, 3.6, 0, 2.6, aA(), 28);
    for (let k = 0; k < 4; k++) { const a = k * PI / 2; DOME(sin(a) * 2.7, 2.8, cos(a) * 2.7, 1.65, aA(), 20); }
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { L(x * 3.3, z * 3.3, [[0.6, 3.0], [0.6, 3.4]], 12); DOME(x * 3.3, 3.4, z * 3.3, 0.62, aA(), 12); }
    L(0, 0, [[0.06, 6.2], [0.05, 6.8], [0, 6.85]], 6, aB(), false, 0, false);
    for (let z = 5; z <= 9.5; z += 1.5) for (const s of [-1, 1]) { B(s * 4.3, 0.9, z, 0.3, 0.9, 0.6); DOME(s * 4.3, 1.8, z, 0.5, aA(), 10); }
    B(0, 0.9, 9.9, 4.6, 0.9, 0.3);
    for (const [x, z] of [[4.9, 4.9], [-4.9, 4.9], [4.9, -4.9], [-4.9, -4.9], [5.0, 10.0], [-5.0, 10.0]]) {
      L(x, z, [[0.32, 0], [0.27, 6.0], [0.42, 6.0], [0.42, 6.12], [0.26, 6.12], [0.24, 8.0], [0.38, 8.0], [0.38, 8.1], [0.23, 8.1], [0.21, 9.4]], 12);
      SPIRE(x, 9.4, z, 0.23, 1.3, aA(), 12); L(x, z, [[0.03, 10.65], [0.03, 11.0], [0, 11.05]], 4, aB(), false, 0, false);
    }
  }],
  ['Persepolis', 'Fars, Iran', 'Founded c. 518 BC', 'Columns up to 20 m tall', 'The ceremonial capital of the Persian Empire; this is its Gate of All Nations.', 'Replica at 1:3', 6, 7.5, 5.0, [3, 0, 0], () => {
    B(0, 0.25, 0, 5.5, 0.25, 5.0);
    for (const z of [3.6, -3.6]) for (const s of [-1, 1]) {
      B(s * 1.35, 2.6, z, 0.55, 2.35, 1.2); B(s * 1.35, 5.1, z, 0.6, 0.15, 1.25);
      const f = z > 0 ? 1 : -1; B(s * 0.72, 1.7, z + f * 0.4, 0.22, 0.75, 0.7, 0, 0.85); B(s * 0.72, 2.75, z + f * 1.0, 0.2, 0.3, 0.3, 0, 0.85); BT(s * 0.68, 2.8, z, 0.06, 0.55, 0.85, qAxis(1, 0, 0, f * 0.3), 0.7);
    }
    for (const [x, z, h] of [[-1.7, 1.2, 6.3], [1.7, 1.2, 6.3], [1.7, -1.2, 2.2]]) { COL(x, z, 0.32, h, 0.5); if (h > 5) { B(x, h + 0.7, z, 0.35, 0.22, 0.35); B(x, h + 1.05, z, 1.0, 0.18, 0.3); for (const s of [-1, 1]) B(x + s * 0.75, h + 1.05, z, 0.22, 0.3, 0.32); } }
    BT(-1.0, 0.75, -2.0, 0.32, 0.3, 1.6, qAxis(0, 1, 0, 0.6));
  }],
  ['Great Sphinx of Giza', 'Giza, Egypt', 'Carved c. 2500 BC', '20 m tall, 73 m long', 'Carved from a single ridge of limestone bedrock, with the body of a lion and the head of a king.', 'Replica at 1:5', 7, 5, 4.0, [6, 0, 0], () => {
    KX.push(SDF(sphinx, -1.8, -0.05, -5.0, 1.8, 4.0, 4.1, 0.07));
    REC.push([0, 0, 1.2, -1.2, 0, 1.4, 1.2, 3.6], [0, 0, 3.0, 1.2, 0, 0.9, 0.9, 0.7], [0, 0, 0.35, 2.4, 0, 1.0, 0.35, 1.6]);
    B(0, 0.1, 0, 3.0, 0.1, 5.5, 0, 0.75);
  }],
  ['Abu Simbel', 'Aswan, Egypt', 'Built c. 1264–1244 BC', 'Statues 20 m tall', 'In the 1960s the temples were cut into blocks and moved 65 m higher to escape the rising Lake Nasser.', 'Replica at 1:5', 8, 8.5, 2.0, [0, 0, 0], () => {
    B(0, 4.2, -1.3, 7.2, 4.2, 1.5); WIN(0, 0.21, 0, 1.4, 0.55, 1.0);
    for (let x = -5.8; x <= 5.81; x += 0.55) B(x, 8.15, 0.25, 0.16, 0.25, 0.15, 0, 0.8);
    const st = SDF(pharaoh, -0.85, -0.05, -0.85, 0.85, 3.95, 0.85, 0.05);
    for (const x of [-4.4, -1.6, 1.6, 4.4]) { KX.push(xform(st, x, 0.6, 0.85, 0, 1.15)); REC.push([0, x, 2.6, 0.75, 0, 0.9, 2.0, 0.8]); }
    B(0, 0.3, 0.9, 6.6, 0.3, 1.2);
  }],
  ['Karnak Temple', 'Luxor, Egypt', 'Hypostyle Hall c. 1290–1224 BC', 'Columns up to 21 m tall', 'Its Great Hypostyle Hall holds 134 giant columns carved with hieroglyphs.', 'Replica at 1:4', 7.5, 7, 5.5, [0, 11, 0], () => {
    const pap = (x, z, h) => { L(x, z, [[0.55, 0], [0.6, 0.25], [0.5, 0.55], [0.48, h - 0.8], [0.72, h - 0.3], [0.78, h - 0.1], [0, h - 0.1]], 12); B(x, h + 0.05, z, 0.5, 0.15, 0.5); for (let y = 0.9; y < h - 1; y += 0.6) L(x, z, [[0.5, y], [0.5, y + 0.25]], 12, 0.6, false, 0, false); };
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = (i - 1.5) * 2.0, z = (j - 1.5) * 2.0, mid = i === 1 || i === 2; pap(x, z, mid ? 5.2 : 3.9); }
    for (const x of [-1, 1]) B(x, 5.45, 0, 0.35, 0.2, 3.8);
    for (const x of [-3, 3]) B(x, 4.15, 0, 0.35, 0.18, 3.8);
    B(0, 5.85, 1.0, 1.5, 0.18, 1.2); B(-2.0, 4.5, -1.0, 1.2, 0.15, 1.2);
    T4(5.6, 4.2, 0.45, 0.3, 0, 6.4, 1, false); L(5.6, 4.2, [[0.3 * SQ, 6.4], [0, 6.9]], 4, aA(), true, PI / 4);
  }],
  ['Great Mosque of Djenné', 'Djenné, Mali', 'Rebuilt 1907', '16 m tall', 'The largest mud-brick building in the world; the town replasters it every year.', 'Replica at 1:2.3', 7.5, 7.5, 3.6, [14, 10, 12], () => {
    B(0, 0.3, 0, 6.6, 0.3, 4.0); B(0, 2.4, -0.4, 6.0, 2.1, 3.0);
    for (let x = -5.6; x <= 5.61; x += 0.8) for (const z of [2.62, -3.42]) { B(x, 2.6, z, 0.18, 2.3, 0.15); SPIRE(x, 4.9, z, 0.18, 0.6, 1, 6); }
    for (const x of [-3.0, 0, 3.0]) { T4(x, 2.8, 0.9, 0.55, 0, 6.6, 1, false); L(x, 2.8, [[0.55 * SQ, 6.6], [0, 7.3]], 4, 1, true, PI / 4); L(x, 2.8, [[0.12, 7.25], [0.14, 7.4], [0, 7.55]], 8, aB(), false, 0, false); }
    rseed(420); for (let k = 0; k < 110; k++) { const x = rr(-5.9, 5.9), y = rr(1.0, 4.4), front = rnd() < 0.6; B(x, y, front ? 2.75 : -3.55, 0.03, 0.03, 0.22, 0, aA()); }
    for (let k = 0; k < 30; k++) { const x = rr(-0.9, 0.9), y = rr(1.5, 6.0); B([-3, 0, 3][k % 3] + x * (1 - y / 7), y, 2.8 + 0.95 * (1 - y / 7) + 0.15, 0.03, 0.03, 0.2, 0, aA()); }
  }],
  ['Church of St George', 'Lalibela, Ethiopia', 'Carved c. 12th–13th century', '12 m deep', 'Carved downward out of a single block of rock, in the shape of a cross.', 'Replica at 1:2.6', 7.5, 5, 6.2, [5, 0, 0], () => {
    for (let k = 0; k < 3; k++) { const s = 1 - k * 0.06; B(0, k * 0.25 + 0.12, 0, 3.6 * s, 0.12, 1.3 * s); B(0, k * 0.25 + 0.12, 0, 1.3 * s, 0.12, 3.6 * s); }
    B(0, 2.6, 0, 3.3, 1.9, 1.05); B(0, 2.6, 0, 1.05, 1.9, 3.3);
    for (const [hx, hz] of [[3.0, 0.35], [0.35, 3.0]]) B(0, 4.56, 0, hx, 0.06, hz, 0, 0.8);
    for (const [hx, hz] of [[1.6, 0.18], [0.18, 1.6]]) B(0, 4.6, 0, hx, 0.06, hz, 0, 0.7);
    for (let k = 0; k < 4; k++) { const yaw = k * PI / 2; for (const x of [-0.5, 0.5]) WIN(yaw, 3.31, x, 3.4, 0.16, 0.35); WIN(yaw, 1.06, 2.2 * (k % 2 ? 1 : -1), 2.0, 0.2, 0.3); }
    for (let k = 0; k < 4; k++) { const yaw = k * PI / 2 + PI / 4; B(sin(yaw) * 6.3, 2.2, cos(yaw) * 6.3, 2.0, 2.2, 0.6, yaw, 0.85); }
    WIN(0, 3.31, 0, 1.4, 0.4, 0.9);
  }],
  ['Statue of Liberty', 'New York, USA', 'Dedicated 1886', '93 m with pedestal', 'A gift from the people of France to the United States, made of copper sheets that have turned green.', 'Replica at 1:8.5', 5.5, 11.5, 4.5, [8, 3, 11], () => {
    for (let k = 0; k < 11; k++) { const a = k / 11 * TAU; B(sin(a) * 3.6, 0.45, cos(a) * 3.6, 1.0, 0.45, 1.35, a, aA()); }
    B(0, 0.45, 0, 3.4, 0.45, 3.4, 0, aA()); T4(0, 0, 1.55, 1.3, 0.9, 5.2, aA());
    B(0, 3.6, 0, 1.4, 0.18, 1.4, 0, aA()); B(0, 5.3, 0, 1.45, 0.12, 1.45, 0, aA());
    for (let f = 0; f < 4; f++) for (const x of [-0.5, 0, 0.5]) WIN(f * PI / 2, 1.42, x, 4.3, 0.1, 0.25);
    KX.push(xform(SDF(liberty, -0.8, -0.05, -0.75, 0.95, 5.35, 0.75, 0.045), 0, 5.42, 0, 0, 1.0));
    L(0.66, 0.05, [[0.08, 10.45], [0.13, 10.6], [0.1, 10.8], [0, 10.9]], 10, aB(), false, 0, false);
    C(0, 7.0, 0, 0.6, 1.6);
  }],
  ['Golden Gate Bridge', 'San Francisco, USA', 'Built 1933–1937', 'Towers 227 m tall', 'When it opened it had the longest suspension span in the world. Its colour is called International Orange.', 'Replica at 1:18', 18.5, 13, 2.0, [9, 0, 0], () => {
    for (const s of [-1, 1]) {
      const x = s * 9;
      for (const z of [-1.2, 1.2]) { B(x, 3.2, z, 0.38, 3.2, 0.5); B(x, 8.2, z, 0.32, 1.8, 0.42); B(x, 11.3, z, 0.26, 1.3, 0.35); }
      for (const y of [4.3, 7.8, 10.2, 12.4]) B(x, y, 0, 0.3, 0.22, 1.2);
      B(x, 0.6, 0, 1.0, 0.6, 2.0, 0, 0.8);
      for (const z of [-1.2, 1.2]) {
        const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([s * mix(18.5, 9, t), mix(4.9, 12.6, t * t), z]); } SW(pts, 0.14, 0.14);
        for (let k = 1; k < 8; k++) { const p = pts[k]; if (p[1] > 5.3) BT(p[0], (p[1] + 4.9) / 2, z, 0.025, (p[1] - 4.9) / 2, 0.025, null); }
      }
    }
    for (const z of [-1.2, 1.2]) {
      const pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16, x = mix(-9, 9, t); pts.push([x, 5.3 + 7.3 * pow(abs(x) / 9, 2), z]); } SW(pts, 0.14, 0.14);
      for (let k = 1; k < 16; k++) { const p = pts[k]; BT(p[0], (p[1] + 4.9) / 2, z, 0.025, (p[1] - 4.9) / 2, 0.025, null); }
    }
    B(0, 4.6, 0, 18.5, 0.15, 1.3); B(0, 4.2, 0, 18.5, 0.25, 1.1, 0, 0.6);
    for (const s of [-1, 1]) B(s * 18.6, 2.4, 0, 0.9, 2.4, 1.6, 0, 0.8);
  }],
  ['Empire State Building', 'New York, USA', 'Built 1930–1931', '443 m with antenna', 'Built in just over a year, it was the world’s tallest building for nearly 40 years.', 'Replica at 1:25', 4.5, 17.5, 2.6, [6, 15, 12], () => {
    B(0, 1.1, 0, 3.2, 1.1, 2.4); B(0, 2.7, 0, 2.6, 0.5, 1.9); B(0, 7.5, 0, 2.0, 4.3, 1.4);
    for (const [yaw, d, w] of [[0, 1.41, 2.0], [PI, 1.41, 2.0], [PI / 2, 2.01, 1.4], [-PI / 2, 2.01, 1.4]]) for (let x = -w + 0.2; x <= w - 0.19; x += 0.32) { const q = qAxis(0, 1, 0, yaw), p = qv(q, x, 0, d); BT(p[0], 7.4, p[2], 0.07, 4.0, 0.02, q, aA(0.7)); }
    B(0, 12.1, 0, 1.6, 0.3, 1.1); B(0, 12.65, 0, 1.2, 0.25, 0.9); B(0, 13.1, 0, 0.8, 0.2, 0.8);
    L(0, 0, [[0.55, 13.3], [0.5, 14.3], [0.32, 14.9], [0.2, 15.6], [0.06, 16.9], [0, 17.4]], 8, aB(), true, PI / 8);
  }],
  ['Chichen Itza', 'Yucatán, Mexico', 'El Castillo c. 9th–12th century', '30 m tall', 'At the equinoxes the setting sun casts a serpent of light and shadow down its stairway.', 'Replica at 1:4', 8, 7.5, 7.2, [6, 0, 0], () => {
    for (let k = 0; k < 9; k++) { const w = 7.0 - k * 0.4; L(0, 0, [[w * SQ, k * 0.62], [(w - 0.2) * SQ, k * 0.62 + 0.55], [(w - 0.25) * SQ, k * 0.62 + 0.62], [0, k * 0.62 + 0.62]], 4, 1, true, PI / 4); }
    for (let f = 0; f < 4; f++) {
      const yaw = f * PI / 2, q = qAxis(0, 1, 0, yaw);
      for (let k = 0; k < 22; k++) { const t = k / 22, p = qv(q, 0, 0, mix(7.3, 3.6, t)); BT(p[0], t * 5.6 + 0.12, p[2], 0.95, 0.13, 0.2, q, 0.85 - (k % 2) * 0.1); }
      for (const s of [-1, 1]) { const a = qv(q, s * 1.05, 0, 5.45), b = qv(q, s * 1.05, 0, 3.55); SW([[a[0], 0.3, a[2]], [b[0], 5.7, b[2]]], 0.22, 0.3); if (f === 0) { const h = qv(q, s * 1.05, 0, 7.5); B(h[0], 0.3, h[2], 0.3, 0.3, 0.4, yaw, 0.8); } }
    }
    B(0, 6.4, 0, 2.0, 0.8, 2.0); for (let f = 0; f < 4; f++) WIN(f * PI / 2, 2.01, 0, 6.3, 0.35, 0.55); B(0, 7.3, 0, 2.1, 0.12, 2.1);
  }],
  ['Machu Picchu', 'Cusco Region, Peru', 'Built c. 1450', '2,430 m above sea level', 'An Inca citadel high in the Andes, brought to world attention by Hiram Bingham in 1911.', 'Miniature replica', 10, 11, 7.0, [3, 10, 0], () => {
    for (let k = 0; k < 6; k++) { const z = 6.2 - k * 1.0, y = k * 0.55; B(0, y / 2 + 0.28, z - 0.4, 8.5 - k * 0.4, y / 2 + 0.28, 0.55); }
    B(0, 1.65, -2.6, 7.0, 1.65, 3.2);
    rseed(430); for (let k = 0; k < 9; k++) { const x = -5.5 + (k % 5) * 2.6 + rr(-0.3, 0.3), z = -1.6 - (k / 5 | 0) * 2.4 + rr(-0.3, 0.3), yaw = rr(-0.2, 0.2); B(x, 3.75, z, 0.95, 0.45, 0.65, yaw); { const q = qAxis(0, 1, 0, yaw), p = qv(q, 0, 0, 0.66); BT(x + p[0], 3.7, z + p[2], 0.18, 0.3, 0.03, q, 0.1); } GABLE(x, 4.2, z, 1.0, 0.75, 0.75, yaw, aA()); }
    L(2.8, 0.2, [[0.95, 3.3], [0.95, 4.3]], 16); WIN(0, 1.15, 2.8, 3.9, 0.15, 0.2);
    L(0, -8.5, [[4.2, 0], [3.9, 2.0], [3.2, 4.5], [2.1, 7.2], [1.1, 9.6], [0.4, 11.0], [0, 11.3]], 7, 0.9, true, 0.3);
  }],
  ['Washington Monument', 'Washington, D.C., USA', 'Built 1848–1884', '169 m tall', 'The world’s tallest obelisk. A change in the marble’s colour shows where building paused for over 20 years.', 'Replica at 1:10', 3.5, 17, 1.6, [1, 6, 0], () => {
    T4(0, 0, 0.88, 0.72, 0, 5.0, aA(), false); T4(0, 0, 0.72, 0.6, 5.0, 15.0, 1, false); L(0, 0, [[0.6 * SQ, 15.0], [0, 16.8]], 4, 1, true, PI / 4);
    L(0, 0, [[2.6, 0], [2.6, 0.12], [0, 0.12]], 32, 0.85);
  }],
  ['Lincoln Memorial', 'Washington, D.C., USA', 'Built 1914–1922', '30 m tall', 'Its 36 columns stand for the 36 states in the Union when Abraham Lincoln died.', 'Replica at 1:6', 7.5, 5.5, 4.4, [1, 0, 0], () => {
    B(0, 0.3, 0, 6.4, 0.3, 4.4); B(0, 0.7, 0, 6.0, 0.15, 3.9); BT(0, 0.45, 4.6, 2.0, 0.08, 0.6, qAxis(1, 0, 0, 0.45));
    ROW(12, -5.2, 5.2, (x) => { COL(x, 3.2, 0.22, 3.0, 0.85); COL(x, -3.2, 0.22, 3.0, 0.85); });
    ROW(8, -3.2, 3.2, (z, k) => { if (k && k < 7) { COL(-5.2, z, 0.22, 3.0, 0.85); COL(5.2, z, 0.22, 3.0, 0.85); } });
    B(0, 2.4, 0, 4.4, 1.55, 2.4); WIN(0, 2.41, 0, 2.0, 1.6, 1.15);
    B(0, 4.2, 0, 5.55, 0.35, 3.45); B(0, 4.9, 0, 5.2, 0.35, 3.1); B(0, 1.4, 1.9, 0.35, 0.45, 0.3, 0, 0.9);
  }],
  ['Gateway Arch', 'St. Louis, USA', 'Built 1963–1965', '192 m tall', 'The tallest arch in the world: as wide at its base as it is tall.', 'Replica at 1:14', 8, 14, 1.5, [1, 0, 0], () => {
    const a = 2.82, pts = []; for (let k = 0; k <= 40; k++) { const x = mix(-6.6, 6.6, k / 40); pts.push([x, 14 - a * (Math.cosh(x / a) - 1), 0]); }
    SW(pts, (k) => 0.85 - 0.4 * sin(k / 40 * PI), (k) => 0.85 - 0.4 * sin(k / 40 * PI), [0, 0, 1]);
    for (const s of [-1, 1]) C(s * 6.4, 2.0, 0, 0.45, 2.0);
  }],
  ['Space Needle', 'Seattle, USA', 'Built 1961–1962', '184 m tall', 'Built for the 1962 World’s Fair; its top level now has a rotating glass floor.', 'Replica at 1:13', 4, 14.5, 3.0, [12, 9, 0], () => {
    L(0, 0, [[0.38, 0], [0.38, 11.6]], 12);
    for (let k = 0; k < 3; k++) for (const o of [-0.16, 0.16]) { const a = k / 3 * TAU + o; SW([0, 0.25, 0.5, 0.75, 1].map((t) => { const r = t < 0.55 ? mix(2.6, 0.6, t / 0.55) : mix(0.6, 1.05, (t - 0.55) / 0.45); return [cos(a) * r, t * 10.6, sin(a) * r]; }), 0.16, 0.16, [cos(a), 0, sin(a)]); }
    L(0, 0, [[0.8, 10.5], [2.6, 10.95], [2.7, 11.15], [2.15, 11.45]], 32); L(0, 0, [[2.15, 11.45], [2.45, 11.85], [1.2, 12.25], [0.6, 12.35], [0, 12.35]], 32, aA());
    L(0, 0, [[0.18, 12.35], [0.08, 14.0], [0, 14.3]], 8, 1, false, 0, false); C(0, 11.4, 0, 2.6, 0.9);
    L(0, 0, [[1.3, 0], [1.3, 1.2], [0, 1.2]], 16, 0.9);
  }],
  ['Pyramid of the Sun', 'Teotihuacan, Mexico', 'Built c. AD 200', '65 m tall', 'One of the largest pyramids in the Americas, at the heart of one of the largest cities of the ancient world.', 'Replica at 1:11', 11, 6.5, 8.5, [4, 0, 0], () => {
    let y = 0; for (const [w0, w1, h] of [[8.0, 7.0, 1.6], [6.4, 5.6, 1.4], [5.0, 4.3, 1.2], [3.8, 3.2, 1.0], [2.8, 2.3, 0.8]]) { L(0, 0, [[w0 * SQ, y], [w1 * SQ, y + h], [0, y + h]], 4, 1, true, PI / 4); y += h; }
    BT(0, 2.95, 5.3, 1.1, 0.12, 3.55, qAxis(1, 0, 0, 0.98), 0.8); B(0, 0.3, 8.6, 1.3, 0.3, 0.6);
  }],
  ['Tikal Temple I', 'Petén, Guatemala', 'Built c. AD 732', '47 m tall', 'A steep Maya temple-pyramid built as the tomb of the ruler Jasaw Chan K’awiil I.', 'Replica at 1:4.4', 5, 11, 4.2, [6, 0, 0], () => {
    for (let k = 0; k < 9; k++) { const w = 3.6 - k * 0.2, d = 3.2 - k * 0.2; B(0, k * 0.8 + 0.4, -0.2, w, 0.4, d); }
    BT(0, 3.7, 2.4, 0.95, 0.1, 4.1, qAxis(1, 0, 0, 1.1), 0.85);
    B(0, 8.0, -0.6, 1.25, 0.8, 0.95); WIN(0, 0.36, 0, 7.8, 0.3, 0.5); B(0, 9.65, -0.9, 1.05, 0.85, 0.3); for (const x of [-0.5, 0, 0.5]) WIN(0, -0.59, x, 9.7, 0.12, 0.3);
  }],
  ['Sydney Harbour Bridge', 'Sydney, Australia', 'Built 1923–1932', '134 m tall', 'Nicknamed “the Coathanger” for the shape of its great steel arch.', 'Replica at 1:16', 15.5, 9, 2.5, [10, 3, 0], () => {
    for (const z of [-1.2, 1.2]) {
      const lo = [], hi = []; for (let k = 0; k <= 20; k++) { const x = mix(-10.5, 10.5, k / 20); lo.push([x, 1.0 + 6.3 * (1 - (x / 10.5) ** 2), z]); hi.push([x, 3.2 + 5.3 * (1 - (x / 10.5) ** 2), z]); }
      SW(lo, 0.3, 0.3); SW(hi, 0.22, 0.22);
      for (let k = 0; k < 20; k++) { const a = lo[k], b = hi[k + 1]; SW([a, b], 0.08, 0.08); SW([hi[k], lo[k + 1]], 0.08, 0.08); }
      for (let k = 2; k < 19; k += 2) { const p = lo[k]; if (p[1] > 3.4) BT(p[0], (p[1] + 3.1) / 2, z, 0.05, (p[1] - 3.1) / 2, 0.05, null); }
    }
    for (let k = 1; k < 20; k += 3) { const x = mix(-10.5, 10.5, k / 20); B(x, 3.2 + 5.3 * (1 - (x / 10.5) ** 2), 0, 0.1, 0.1, 1.25); }
    B(0, 3.0, 0, 15.5, 0.15, 1.5); B(0, 2.65, 0, 15.5, 0.2, 1.2, 0, 0.6);
    for (const s of [-1, 1]) for (const z of [-1.6, 1.6]) { B(s * 11.6, 3.0, z, 0.8, 3.0, 0.65, 0, aA()); B(s * 11.6, 6.15, z, 0.65, 0.15, 0.55, 0, aA()); }
    for (const s of [-1, 1]) for (const x of [13.2, 15.0]) B(s * x, 1.4, 0, 0.4, 1.4, 1.0, 0, aA());
  }],
  ['Pyramid of Djoser', 'Saqqara, Egypt', 'Built c. 2670 BC', '62 m tall', 'The oldest of Egypt’s pyramids: six stone platforms stacked one on another.', 'Replica at 1:10', 8.5, 6.5, 5.5, [0, 0, 0], () => {
    let y = 0; [[6.5, 5.4, 1.2], [5.8, 4.8, 1.15], [5.1, 4.2, 1.1], [4.4, 3.6, 1.05], [3.7, 3.0, 1.0], [3.0, 2.4, 0.95]].forEach(([hx, hz, h]) => { B(0, y + h / 2, 0, hx, h / 2, hz); y += h; });
    rseed(440); for (let k = 0; k < 8; k++) BT(rr(-6, 6), 0.25, rr(5.8, 7.5), rr(0.3, 0.6), 0.25, rr(0.3, 0.5), qAxis(0, 1, 0, rr(0, 3)));
  }],
  ['Temple of Artemis', 'Ephesus, Türkiye', 'Built c. 550 BC', 'Columns about 18 m tall', 'One of the Seven Wonders of the Ancient World. Burned by an arsonist in 356 BC and rebuilt; a single column stands on the site today.', 'Reconstruction at 1:4', 9, 7, 7.8, [1, 0, 0], () => {
    rseed(450);
    B(0, 0.15, 0, 4.6, 0.15, 8.0); B(0, 0.45, 0, 4.3, 0.15, 7.7);
    const fall = new Set([5, 17, 22]); let n = 0;
    const col = (x, z) => { if (fall.has(n++)) { BT(x + 1.4, 0.95, z, 0.3, 2.0, 0.3, qMul(qAxis(0, 1, 0, rr(-0.4, 0.4)), qAxis(0, 0, 1, -1.5))); return; } COL(x, z, 0.26, 4.6, 0.6); };
    ROW(8, -3.6, 3.6, (x) => { col(x, 7.2); col(x, -7.2); col(x, 6.2); });
    ROW(13, -5.8, 5.8, (z) => { col(-3.6, z); col(3.6, z); });
    for (const z of [7.2, -7.2]) { B(0, 5.5, z, 3.9, 0.3, 0.45); GABLE(0, 5.8, z, 0.45, 3.95, 1.1, PI / 2); }
    B(-3.6, 5.5, 2.0, 0.4, 0.3, 5.6); B(3.6, 5.5, -3.0, 0.4, 0.3, 4.6); B(0, 1.6, -0.8, 2.2, 1.0, 5.0, 0, 0.85);
  }],
  ['Colossus of Rhodes', 'Rhodes, Greece', 'Completed c. 280 BC', 'About 33 m tall', 'One of the Seven Wonders of the Ancient World. An earthquake toppled it in 226 BC, only 54 years after it was finished.', 'Reconstruction at 1:3.3', 7.5, 4, 4.0, [8, 1, 0], () => {
    KX.push(SDF(colossus, -3.2, -0.05, -5.8, 3.9, 1.75, 3.6, 0.065));
    REC.push([0, 0, 0.75, 0, 0, 1.0, 0.75, 1.6], [1, 0, 0.6, 2.75, 0, 0.55, 0.55]);
    L(-4.0, 2.0, [[1.6, 0], [1.6, 0.9], [1.75, 0.9], [1.75, 1.1], [1.45, 1.1], [1.45, 1.5], [0, 1.5]], 16, aA());
    BT(-4.4, 1.85, 2.3, 0.3, 0.35, 0.6, qAxis(0, 1, 0, 0.4), 1); BT(-3.6, 1.8, 1.6, 0.3, 0.3, 0.5, qAxis(0, 1, 0, -0.3), 1);
  }],
  ['Mausoleum at Halicarnassus', 'Bodrum, Türkiye', 'Built c. 350 BC', 'About 45 m tall', 'One of the Seven Wonders of the Ancient World. Every grand tomb is now called a “mausoleum” after its owner, Mausolus.', 'Reconstruction at 1:5', 5.5, 9.5, 3.6, [1, 8, 0], () => {
    B(0, 1.7, 0, 4.0, 1.7, 3.2); B(0, 3.5, 0, 4.15, 0.1, 3.35);
    ROW(9, -3.7, 3.7, (x) => { COL(x, 2.9, 0.17, 2.0, 3.6); COL(x, -2.9, 0.17, 2.0, 3.6); }); ROW(7, -2.2, 2.2, (z) => { COL(-3.7, z, 0.17, 2.0, 3.6); COL(3.7, z, 0.17, 2.0, 3.6); });
    B(0, 4.6, 0, 3.0, 1.0, 2.2, 0, 0.9); B(0, 5.8, 0, 4.0, 0.2, 3.2);
    for (let k = 0; k < 8; k++) B(0, 6.15 + k * 0.32, 0, 3.6 - k * 0.38, 0.16, 2.8 - k * 0.3);
    B(0, 8.75, -0.1, 0.4, 0.2, 0.32, 0, aA()); ROW(4, -0.6, 0.6, (x) => B(x, 9.0, 0.45, 0.1, 0.22, 0.35, 0, aA())); L(0, -0.1, [[0.09, 8.95], [0.07, 9.6], [0, 9.65]], 6, aA());
  }],
];

// all of them join the wonders; placeWonders() puts each in its region (REGIONS in wonders.js)
for (const l of LANDMARKS) WONDERS.push(l);
WP = new Float32Array(WONDERS.length * 5);
