// ============================================================================
// controls: key bindings, look settings and the controls panel in the menu
// ============================================================================
// Each action has up to two keys. localStorage.abyssalKeys keeps the bindings and look settings, checked on load.
// The frame loop only reads KS (one byte per action, set by main.js key()), so input stays allocation-free.
const ACTS = ['Forward', 'Back', 'Left', 'Right', 'Up', 'Down', 'Faster', 'Look left', 'Look right', 'Look up', 'Look down'];
const A_F = 0, A_B = 1, A_L = 2, A_R = 3, A_U = 4, A_D = 5, A_S = 6, A_LL = 7, A_LR = 8, A_LU = 9, A_LD = 10, NA = ACTS.length;
const MOVE = [['KeyW'], ['KeyS'], ['KeyA'], ['KeyD'], ['KeyE', 'Space'], ['KeyQ', 'KeyC'], ['ShiftLeft', 'ShiftRight']];
const PRESETS = [
  // arrows swim, like WASD
  [['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown'], ['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight'], ...MOVE.slice(4), [], [], [], []],
  // arrows look around: for a trackpad, or no mouse at all
  [...MOVE, ['ArrowLeft'], ['ArrowRight'], ['ArrowUp'], ['ArrowDown']],
];
// keys that keep their own job (menu, stats, mute, viewpoints) or belong to the browser
const KEYOK = /^[A-Za-z0-9]{2,24}$/, RESERVED = /^(Escape|Key[HMNGP]|Digit[1-6]|F\d+|Tab|Meta\w*|OS\w*|ContextMenu)$/;
const KS = new Uint8Array(NA);
let BIND = Object.create(null), CFG, TANH = 0.6, LOOK = 0.0022, INVY = 1, CRUISE = 1, tour = false, ding = () => {};
// unlocked by exploring (progress.js), read by render(): LIGHT 0 natural, 1 golden hour, 2 moonlight, 3 tropical blue; BUDDY the turtle
let LIGHT = 0, BUDDY = 0;

const copyB = (b) => b.map((s) => s.slice());
const num = (v, lo, hi, d) => (typeof v === 'number' && v >= lo && v <= hi ? v : d);
function loadCfg() {
  let o = null;
  try { o = JSON.parse(localStorage.abyssalKeys || 'null'); } catch {}
  const ok = o && typeof o === 'object' && Array.isArray(o.b) && o.b.length === NA, seen = new Set();
  // a key bound twice, reserved or malformed is dropped, so a damaged save can't break the controls
  const b = ok ? o.b.map((s) => (Array.isArray(s) ? s : []).filter((c) => typeof c === 'string' && KEYOK.test(c) && !RESERVED.test(c) && !seen.has(c) && seen.add(c)).slice(0, 2)) : copyB(PRESETS[0]);
  return { b, sens: num(o?.sens, 0.25, 3, 1), inv: o?.inv === true, fov: num(o?.fov, 50, 75, 62), bright: num(o?.bright, 0.5, 1.8, 1), rays: num(o?.rays, 0, 2, 1), swim: num(o?.swim, 0.5, 2.5, 1), map: o?.map !== false };
}
function applyCfg() {
  BIND = Object.create(null);
  CFG.b.forEach((s, a) => { for (const c of s) BIND[c] = a; });
  LOOK = 0.0022 * CFG.sens; INVY = CFG.inv ? -1 : 1; TANH = Math.tan(CFG.fov * PI / 360);
}
const saveCfg = () => { applyCfg(); keep('abyssalKeys', JSON.stringify(CFG)); drawControls(); };
CFG = loadCfg(); applyCfg();

// ---------------------------------------------------------------- key names (the real letters of the keyboard layout)
let LAYOUT = null;
const KNAME = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt', PageUp: 'PgUp', PageDown: 'PgDn', Backspace: '⌫', Enter: 'Enter', Space: 'Space' };
const keyName = (c) => KNAME[c] || LAYOUT?.get(c) || c.replace(/^(Key|Digit)/, '').replace(/^Numpad/, 'Num ');
try { navigator.keyboard?.getLayoutMap().then((m) => { LAYOUT = m; drawControls(); }, () => 0); } catch {}

// ---------------------------------------------------------------- the panel and the key list under the dive button
const el = (id) => document.getElementById(id);
const mk = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
const LEGEND = [[[A_F, A_L, A_B, A_R], 'Swim'], [[A_D, A_U], 'Down / up'], [[A_S], 'Faster'], [[A_LL, A_LU, A_LD, A_LR], 'Look']];
let listen = -1; // action * 2 + slot waiting for a key, or -1
const slots = [];
{
  const rk = el('rk');
  ACTS.forEach((n, a) => { const row = mk('p'); row.append(mk('span', n)); for (let s = 0; s < 2; s++) { const b = mk('button'); b.onclick = () => { listen = a * 2 + s; drawControls(); }; slots.push(b); row.append(b); } rk.append(row); });
  el('rp').querySelectorAll('button').forEach((b, i) => { b.onclick = () => { CFG.b = copyB(PRESETS[i]); listen = -1; saveCfg(); }; });
  const sens = el('rs'), fov = el('rf'), inv = el('ri');
  sens.value = CFG.sens; fov.value = CFG.fov; inv.checked = CFG.inv;
  // brightness, light rays and swim speed: multipliers on the scene's defaults
  const SL = [['rbr', 'bright'], ['rry', 'rays'], ['rsw', 'swim']];
  for (const [id, k] of SL) { const e = el(id); e.value = CFG[k]; e.oninput = () => { CFG[k] = +e.value; saveCfg(); }; }
  sens.oninput = () => { CFG.sens = +sens.value; saveCfg(); };
  fov.oninput = () => { CFG.fov = +fov.value; saveCfg(); };
  inv.onchange = () => { CFG.inv = inv.checked; saveCfg(); };
  el('rx').onclick = () => { CFG = { b: copyB(PRESETS[0]), sens: 1, inv: false, fov: 62, bright: 1, rays: 1, swim: 1, map: true }; sens.value = 1; fov.value = 62; inv.checked = false; for (const [id] of SL) el(id).value = 1; listen = -1; saveCfg(); };
  el('rc').onclick = () => panel(false);
  el('cb').onclick = () => panel(true);
  // touch: hold-to-rise / hold-to-sink buttons at the side of the screen
  el('u').querySelectorAll('button').forEach((b, i) => {
    const set = (v) => (e) => { e.preventDefault(); KS[i ? A_D : A_U] = v; };
    b.addEventListener('pointerdown', set(1)); for (const n of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(n, set(0));
  });
}
function panel(open) {
  listen = -1; el('g').hidden = open; el('r').hidden = !open; drawControls();
  (open ? el('rc') : el('cb')).focus();
}
function drawControls() {
  slots.forEach((b, i) => { const c = CFG.b[i >> 1][i & 1]; b.textContent = i === listen ? 'Press a key' : c ? keyName(c) : '—'; b.className = i === listen ? 'on' : ''; });
  const same = (p) => p.every((s, a) => s.length === CFG.b[a].length && s.every((c, j) => c === CFG.b[a][j]));
  el('rp').querySelectorAll('button').forEach((b, i) => { b.className = same(PRESETS[i]) ? 'on' : ''; });
  el('rv').textContent = `${CFG.fov}°`; el('rw').textContent = `${CFG.sens.toFixed(2)}×`;
  el('rbv').textContent = `${Math.round(CFG.bright * 100)}%`; el('ryv').textContent = CFG.rays ? `${Math.round(CFG.rays * 100)}%` : 'off'; el('rsv').textContent = `${CFG.swim.toFixed(1)}×`;
  // the key list: first keys, then the second keys when they differ (W A S D / ↑ ← ↓ →)
  const kk = el('kk'); kk.textContent = '';
  for (const [acts, label] of LEGEND) {
    const i = mk('i'); let any = false, prev = '';
    for (let s = 0; s < 2; s++) {
      const names = acts.map((a) => (CFG.b[a][s] ? keyName(CFG.b[a][s]) : ''));
      if (names.every((n) => !n) || names.join() === prev) continue;
      if (any) i.append('/');
      for (const n of names) if (n) i.append(mk('b', n));
      any = true; prev = names.join();
    }
    if (any) kk.append(i, label);
  }
}
// while a slot waits, the next key goes to it (before main.js sees it). Esc cancels, Backspace clears the slot.
// A key already used elsewhere moves here, and that slot takes this slot's old key.
addEventListener('keydown', (e) => {
  if (listen < 0) { if (e.code === 'Escape' && !el('r').hidden) panel(false); return; }
  e.preventDefault(); e.stopImmediatePropagation();
  const c = e.code, a = listen >> 1, s = listen & 1, cur = CFG.b[a], old = cur[s];
  if (c === 'Backspace') cur.splice(s, 1);
  else if (c !== 'Escape') {
    if (RESERVED.test(c) || !KEYOK.test(c)) { slots[listen].textContent = 'Reserved'; return; }
    for (const sl of CFG.b) { const j = sl.indexOf(c); if (j >= 0 && sl !== cur) { if (old) sl[j] = old; else sl.splice(j, 1); } }
    const nb = [cur[0], cur[1]]; nb[s] = c; if (nb[1 - s] === c) nb[1 - s] = old; // within one action: swap
    CFG.b[a] = nb.filter(Boolean);
  }
  listen = -1; saveCfg();
}, true);
drawControls();
