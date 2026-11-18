// ============================================================================
// play: the guided tour, landmarks to discover, viewpoint fades, cruise speed
// ============================================================================
// Runs after main.js (it uses the camera, the flight path and the viewpoints) and allocates nothing per frame:
// discover() is called every frame and only compares distances.
const toastEl = $('t');
let fadeT = 0, seen = 0;
try { seen = (+localStorage.abyssalSeen | 0) & 63; } catch {}
// landmark i is the spot viewpoint i + 1 looks at; swimming within LMR metres (horizontally) of it finds it
const LMN = ['Stone whale fluke', 'Sunken ship', 'Hall of light', 'Sponge garden', 'Kelp cathedral', 'Purple grotto'], LMR = 15;
// news (finds, unlocks, a region complete) waits its turn so nothing is lost; small talk (swim speed) shows only
// when no news is on screen
const news = []; let newsOn = false;
function show(m) {
  toastEl.textContent = m;
  return toastEl.animate([{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 4000 });
}
function toast(m, isNews) {
  if (!isNews) { if (!newsOn) show(m); return; }
  news.push(m); if (newsOn) return;
  const next = () => { const n = news.shift(); newsOn = n !== undefined; if (newsOn) show(n).finished.then(next, next); };
  next();
}
const bits = (b) => { let n = 0; for (let i = 0; i < 6; i++) n += b >> i & 1; return n; };
const found = () => bits(seen);
const nSeen = () => { let n = 0; for (let i = 0; i < wonSeen.length; i++) n += wonSeen[i]; return n; };
const drawFound = () => { $('vl').textContent = `${found()} / 6`; $('vw').textContent = `${nSeen()} / ${WONDERS.length}`; };
// sunken wonders (wonders.js): their details card shows while you are near one (with some hysteresis, so it doesn't
// flicker at the edge); coming within 6 m of a wonder's footprint finds it
// found wonders, by name (so the list can grow), in localStorage.abyssalWonders
const wonSeen = new Uint8Array(WONDERS.length); let wonAt = -1;
try { const s = new Set(JSON.parse(localStorage.abyssalWonders || '[]')); WONDERS.forEach((w, i) => { wonSeen[i] = s.has(w[0]) ? 1 : 0; }); } catch {}
const saveSeen = () => keep('abyssalWonders', JSON.stringify(WONDERS.filter((w, i) => wonSeen[i]).map((w) => w[0])));
function showCard(i) {
  $('y').classList.toggle('on', i >= 0);
  if (i < 0) return;
  const w = WONDERS[i];
  $('ys').textContent = WREG[i] >= 0 ? `Sunken wonder · ${REGIONS[WREG[i]][0]}` : 'Sunken wonder';
  $('yn').textContent = w[0]; $('ya').textContent = w[1]; $('yb').textContent = `${w[2]} · ${w[3]}`; $('yf').textContent = w[4]; $('yr').textContent = w[5];
}
// entering a region (within 260 m of its centre) says its name, once per visit
let regAt = -1;
function regions() {
  let k = -1;
  for (let i = 0; i < REGC.length; i++) { const dx = REGC[i][0] - F[CX], dz = REGC[i][1] - F[CZ]; if (dx * dx + dz * dz < 260 * 260) k = i; }
  if (k !== regAt) { regAt = k; if (k >= 0) toast(`${REGIONS[k][0]} · ${REGIONS[k].length - 1} sunken wonders`); }
}
function wonders() {
  regions();
  let best = -1, bd = 1e9, found6 = -1;
  for (let i = 0; i < WONDERS.length; i++) {
    // distance to the footprint, plus up to 16 m for one behind you: the card follows what you are looking at
    const dx = WP[i * 5] - F[CX], dz = WP[i * 5 + 1] - F[CZ], l = sqrt(dx * dx + dz * dz), d = l - WP[i * 5 + 2];
    const fl = sqrt(F[FX] * F[FX] + F[FZ] * F[FZ]) || 1, look = d + 8 * (1 - (dx * F[FX] + dz * F[FZ]) / (l * fl || 1));
    if (d < (i === wonAt ? 22 : 16) && look < bd) { bd = look; best = i; }
    if (d < 6 && !wonSeen[i]) found6 = i;
  }
  if (best !== wonAt) { wonAt = best; showCard(best); }
  dailyCheck();
  if (found6 >= 0) { best = found6;
    wonSeen[best] = 1; saveSeen(); drawFound(); ding();
    toast(`Discovered: ${WONDERS[best][0]} · ${nSeen()} / ${WONDERS.length} wonders`, 1);
    regionDone(WREG[best]); progressed();
  }
}
// the last wonder of a region found: say so (wonders.js names the regions; wonders outside any region have r = -1)
function regionDone(r) {
  if (r < 0) return;
  for (let i = 0; i < WONDERS.length; i++) if (WREG[i] === r && !wonSeen[i]) return;
  setTimeout(ding, 600); toast(`Region complete: ${REGIONS[r][0]} · every wonder found`, 1);
}
const regionCount = (r) => { let n = 0, t = 0; for (let i = 0; i < WONDERS.length; i++) if (WREG[i] === r) { t++; n += wonSeen[i]; } return [n, t]; };
function discover() {
  const cx = F[CX], cz = F[CZ];
  for (let i = 0; i < 6; i++) {
    if (seen >> i & 1) continue;
    const p = POSES[i], dx = p[3] - cx, dz = p[5] - cz;
    if (dx * dx + dz * dz < LMR * LMR) {
      seen |= 1 << i; keep('abyssalSeen', seen); drawFound(); ding();
      toast(`Garden spot found: ${LMN[i]} · ${found()} / 6`, 1); progressed();
    }
  }
}
// a short fade to black hides a jump of the camera
function fade(fn) {
  canvas.animate([{ opacity: 1 }, { opacity: 0, offset: 0.45 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { duration: 600 });
  clearTimeout(fadeT); fadeT = setTimeout(fn, 280);
}
const still = () => { F[VX] = F[VY] = F[VZ] = 0; };
const jump = (i) => fade(() => { tour = false; lookAt(...POSES[i]); still(); });
// the tour: the one-minute camera path the world is built around. Any movement key, or moving the mouse after
// the first second, hands the camera back
function tourStart() { fade(() => { tour = true; F[FLT] = 0; flyAt(); still(); toast('The tour · move or look around to take over', 1); }); }
function tourStop() { if (tour) { tour = false; still(); } }
// the new-tab scene (AMB) flies the path at half speed, round and round, with a fade where the ends meet. The camera
// holds the last pose until the fade's callback restarts it: fade() cancels a pending callback, so it is asked once a lap
let lapping = false;
function tourStep(dt) {
  if (lapping) return;
  F[FLT] += AMB ? dt * 0.5 : dt; flyAt();
  if (F[FLT] < FLYT) return;
  if (!AMB) { tourStop(); return; }
  F[FLT] = FLYT; lapping = true;
  fade(() => { F[FLT] = 0; flyAt(); lapping = false; });
}
addEventListener('mousemove', (e) => { if (tour && !AMB && F[FLT] > 1 && abs(e.movementX) + abs(e.movementY) > 2) tourStop(); });
// mouse wheel: cruise speed, 0.4x to 2.5x
addEventListener('wheel', (e) => {
  if (menu || !e.deltaY) return;
  CRUISE = clamp(CRUISE * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.4, 2.5);
  toast(`Swim speed ${CRUISE.toFixed(1)}×`);
}, { passive: true });
$('tb').onclick = () => { go(); tourStart(); };

// ---------------------------------------------------------------- radar: a round map in the corner, turning with you
// The seabed (from the outer height map, drawn once), the wonders within MMR metres (gold ring: not found yet, grey: found),
// and an arrow on the rim to the nearest one not found yet, with its distance. 10 times a second, outside the frame loop;
// the only allocation is the distance text, when it changes.
const mm = $('mm'), mmd = $('mmd'), mx = mm.getContext('2d'), mmBase = document.createElement('canvas');
let MMR = 300, sonarUntil = 0; // a sonar ping (progress.js) shows three times as far for a while
mmBase.width = mmBase.height = 512;
{
  const g = mmBase.getContext('2d'), im = g.createImageData(512, 512), n = OH.n;
  for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) {
    const h = OH.h[round(i / 511 * (n - 1)) + n * round(j / 511 * (n - 1))], t = clamp((h + 50) / 46, 0, 1), o = (i + 512 * j) * 4;
    im.data[o] = 12 + 170 * t * t * t; im.data[o + 1] = 52 + 150 * t; im.data[o + 2] = 72 + 105 * t; im.data[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
}
let mmLast = -1;
function radar() {
  const show = !menu && CFG.map && !dead && !AMB; mm.hidden = mmd.hidden = !show; if (!show) return;
  const now = performance.now(), sonar = now < sonarUntil; MMR = sonar ? 900 : 300;
  const W2 = mm.width, R = W2 / 2, s = (R - 4) / MMR, cx = F[CX], cz = F[CZ], fl = hypot(F[FX], F[FZ]) || 1;
  const th = -PI / 2 - atan2(F[FZ] / fl, F[FX] / fl), c = cos(th), sn = sin(th);
  mx.setTransform(1, 0, 0, 1, 0, 0); mx.clearRect(0, 0, W2, W2);
  mx.save(); mx.beginPath(); mx.arc(R, R, R - 1, 0, TAU); mx.clip();
  mx.translate(R, R); mx.rotate(th); mx.scale(s, s); mx.translate(-cx, -cz);
  mx.drawImage(mmBase, -WORLD, -WORLD, 2 * WORLD, 2 * WORLD);
  mx.restore();
  mx.fillStyle = '#03131c55'; mx.beginPath(); mx.arc(R, R, R - 1, 0, TAU); mx.fill();
  if (sonar) { // the ping: a ring running out from you once a second
    const k = (now % 1000) / 1000; mx.strokeStyle = `rgba(127,243,255,${1 - k})`; mx.lineWidth = 3;
    mx.beginPath(); mx.arc(R, R, 8 + k * (R - 10), 0, TAU); mx.stroke();
  }
  let best = -1, bd = 1e18;
  const td = daily.done ? -1 : daily.i; // today's dive leads the way until it is done
  if (td >= 0) { const dx = WP[td * 5] - cx, dz = WP[td * 5 + 1] - cz; best = td; bd = dx * dx + dz * dz; }
  for (let i = 0; i < WONDERS.length; i++) {
    const dx = WP[i * 5] - cx, dz = WP[i * 5 + 1] - cz, d = dx * dx + dz * dz;
    if (td < 0 && !wonSeen[i] && d < bd) { bd = d; best = i; }
    if (d < MMR * MMR) {
      const px = R + (dx * c - dz * sn) * s, py = R + (dx * sn + dz * c) * s;
      mx.beginPath(); mx.arc(px, py, wonSeen[i] ? 5 : 8, 0, TAU);
      if (wonSeen[i]) { mx.fillStyle = '#a9c4ca'; mx.fill(); } else { mx.lineWidth = 4; mx.strokeStyle = '#f0c060'; mx.stroke(); }
      if (i === daily.i) { mx.fillStyle = '#7ff3ff'; mx.beginPath(); mx.moveTo(px, py - 13); mx.lineTo(px + 10, py); mx.lineTo(px, py + 13); mx.lineTo(px - 10, py); mx.closePath(); mx.fill(); }
    }
  }
  if (best >= 0) { // the nearest one not found yet: an arrow on the rim when it is out of range
    const dx = WP[best * 5] - cx, dz = WP[best * 5 + 1] - cz, ax = dx * c - dz * sn, az = dx * sn + dz * c, l = hypot(ax, az) || 1;
    if (l > MMR) {
      const ux = ax / l, uz = az / l, px = R + ux * (R - 14), py = R + uz * (R - 14);
      mx.fillStyle = best === td ? '#7ff3ff' : '#f0c060'; mx.beginPath(); mx.moveTo(px + ux * 12, py + uz * 12); mx.lineTo(px - uz * 9 - ux * 6, py + ux * 9 - uz * 6); mx.lineTo(px + uz * 9 - ux * 6, py - ux * 9 - uz * 6); mx.fill();
    }
  }
  const nx = R + sn * (R - 16), ny = R - c * (R - 16); // north (-z)
  mx.fillStyle = '#e8fbff'; mx.font = '700 22px system-ui, sans-serif'; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillText('N', nx, ny);
  mx.fillStyle = '#ffffff'; mx.strokeStyle = '#03131c'; mx.lineWidth = 3; // you, facing up
  mx.beginPath(); mx.moveTo(R, R - 14); mx.lineTo(R + 10, R + 11); mx.lineTo(R, R + 5); mx.lineTo(R - 10, R + 11); mx.closePath(); mx.stroke(); mx.fill();
  const m = best < 0 ? -2 : round(sqrt(bd) / 10) * 10 + (best === td ? 0.5 : 0);
  if (m !== mmLast) { mmLast = m; mmd.textContent = m === -2 ? 'All wonders found' : best === td ? `Today’s dive · ${floor(m)} m` : `Next wonder · ${m} m`; }
  mmd.style.color = best >= 0 && best === td ? '#7ff3ff' : '';
}
setInterval(radar, 100);
drawFound();
