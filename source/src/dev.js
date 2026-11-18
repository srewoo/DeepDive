// ============================================================================
// development tools: only in dev.html (npm run build:dev), never in index.html
// ============================================================================
//   F    fly the camera along the scripted path (FLY in main.js), one minute through the whole world
//   B    the same flight as a benchmark: the resolution stays fixed, every frame is timed, the result is shown at the end
//   F, B or 1-6 during a flight stop it
{
  const LOGN = 1 << 16, logFrame = new Float32Array(LOGN), logGpu = new Float32Array(LOGN);
  let flying = false, bench = false, last = 0, nFrame = 0, nGpu = 0, wonderAt = 0, regionAt = 0;
  const stop = () => { flying = bench = false; dynT = 0; };
  const report = () => {
    const st = (a, n) => { const s = Array.from(a.subarray(0, n)).sort((x, y) => x - y); let sum = 0; for (const v of s) sum += v; return { n, avg: sum / n, p99: s[min(n - 1, floor(n * 0.99))], max: s[n - 1] }; };
    const fm = (o) => `avg ${o.avg.toFixed(2)}  p99 ${o.p99.toFixed(2)}  max ${o.max.toFixed(2)} ms`;
    const f = st(logFrame, nFrame);
    info.textContent = `Fly-through ${W}x${H}, ${f.n} frames\nframe  ${fm(f)}\nGPU    ${nGpu ? fm(st(logGpu, nGpu)) : 'timestamp-query unavailable'}`;
  };
  // frame() moves the free camera and then calls render(): step in between and put the camera on the path instead
  const draw = render;
  render = () => {
    if (flying) {
      const dtr = F[LAST] - last; last = F[LAST];
      F[FLT] += min(dtr / 1000, 0.1); flyAt();
      if (bench) { if (nFrame < LOGN) logFrame[nFrame++] = dtr; if (F[GPU] > 0 && nGpu < LOGN) logGpu[nGpu++] = F[GPU]; }
      if (F[FLT] >= FLYT) { if (bench) report(); stop(); }
    }
    draw();
  };
  addEventListener('keydown', (e) => {
    if (menu || e.repeat) return;
    if (e.code === 'KeyF' || e.code === 'KeyB') {
      if (flying) stop();
      else {
        flying = true; bench = e.code === 'KeyB'; F[FLT] = 0; last = F[LAST]; nFrame = nGpu = 0;
        // a benchmark hides the stats line and holds the resolution: dynT at -Infinity keeps frame() from tuning it
        if (bench) { hud = false; info.textContent = ''; dynT = -Infinity; }
      }
    } else if (e.code === 'KeyG') { // jump in front of the next sunken wonder
      stop(); const i = (wonderAt++ % WONDERS.length) * 5, x = WP[i], z = WP[i + 1], r = WP[i + 2] + 10, y = WP[i + 3], f = WP[i + 4];
      lookAt(x + sin(f) * r, y + 8, z + cos(f) * r, x, y + 5, z);
    } else if (e.code === 'KeyJ') { // jump to the middle of the next region
      stop(); const c = REGC[regionAt++ % REGC.length], y = ohAt(c[0], c[1]) + 10; lookAt(c[0] * 0.8, y + 4, c[1] * 0.8, c[0], y, c[1]);
    } else if (/Digit[1-6]/.test(e.code)) stop();
  });
}
// camera and placement helpers for checking the world from the console (dev.html only)
window.__look = (...p) => { stop(); lookAt(...p); };
window.__spacing = () => {
  const n = WP.length / 5, nn = [], regs = REGC.map((c) => Math.round(Math.hypot(c[0], c[1])));
  for (let i = 0; i < n; i++) { let d = 1e9; for (let j = 0; j < n; j++) if (i !== j) d = Math.min(d, Math.hypot(WP[i * 5] - WP[j * 5], WP[i * 5 + 1] - WP[j * 5 + 1])); nn.push(d); }
  nn.sort((a, b) => a - b); const rc = []; for (let k = 0; k < REGC.length; k++) rc.push(Math.round(Math.hypot(REGC[k][0] - REGC[(k + 1) % REGC.length][0], REGC[k][1] - REGC[(k + 1) % REGC.length][1])));
  return { wonders: n, nearestNeighbour_m: { min: +nn[0].toFixed(1), median: +nn[n >> 1].toFixed(1), max: +nn[n - 1].toFixed(1) }, regionCentreFromHub_m: regs[0], betweenRegions_m: rc[0], unassigned: Array.from(WREG).filter((r) => r < 0).length, collisionBricks: CG.length / 64 };
};
window.__wonders = () => ({ tris: meshes.slice(WM).map((m) => m.ib.length / 3),  WP: Array.from(WP, (v) => +v.toFixed(1)), ranges: Wd.solids.ranges.filter((r) => r[2] >= WM), cam: [F[CX], F[CY], F[CZ]].map((v) => +v.toFixed(1)) });
// put the camera beside creature i of a kind (same path as the shader, at the current time)
window.__creature = (kind, i = 0, dist = 8) => {
  const g = Wd.cre.ranges[kind]; if (i >= g[1]) return 'none';
  const d = Wd.cre.data, o = (g[0] + i) * 12, t = F[TIME], a = d.subarray(o, o + 4), b = d.subarray(o + 4, o + 8), c = d.subarray(o + 8, o + 12);
  const path = (t) => { const w = b[3], ph = c[0]; if (c[3] > 1.5) return [a[0], a[1], a[2]]; if (c[3] > 0.5) { const th = w * t + ph, r = b[0] + b[2] * Math.sin(0.37 * w * t + ph); return [Math.cos(th) * r, a[1] + b[1] * Math.sin(0.5 * w * t + ph), Math.sin(th) * r]; } return [a[0] + b[0] * Math.sin(w * t + ph), a[1] + b[1] * Math.sin(1.7 * w * t + 2 * ph), a[2] + b[2] * Math.sin(0.83 * w * t + 3 * ph)]; };
  const p = path(t + 1.5); stop(); lookAt(p[0] + dist, p[1] + dist * 0.25, p[2] + dist * 0.3, p[0], p[1], p[2]); return p.map((v) => +v.toFixed(1));
};
// stills (the extension's new-tab posters): hold full resolution and full draw distance, then frame wonder i from
// its front turned by `turn` rad, `dist` m beyond its footprint, the camera `up` m above its base and looking `look` m
// up it, aimed `side` (a fraction of the distance) to one side so it sits off centre, clear of the clock
window.__full = () => { dynT = -Infinity; pix = min(PIXMAX, DW * DH); det = 1; resize(); };
window.__shot = (i, turn = 0.5, dist = 14, up = 2, look = 8, side = 0.3) => {
  stop(); const o = i * 5, x = WP[o], z = WP[o + 1], r = WP[o + 2], y = WP[o + 3], f = WP[o + 4] + turn, d = r + dist;
  const cx = x + sin(f) * d, cz = z + cos(f) * d, cy = max(y + up, ohAt(cx, cz) + 1.5);
  lookAt(cx, cy, cz, x + cos(f) * side * d, y + look, z - sin(f) * side * d);
  return WONDERS[i][0];
};
