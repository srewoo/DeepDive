// ============================================================================
// progress: unlocks earned by exploring, today's dive and its streak, the dive log, the new-tab scene
// ============================================================================
// Runs after play.js (found wonders and spots, toast, the radar) and audio.js (ding). The rules live in daily.js.
// Saved: abyssalUnlocked (names already announced), abyssalLight, abyssalStreak; abyssalDaily and abyssalNames are
// written for the extension's new tab, which shows today's dive and the streak without building the world.
const TODAY = dayKey(new Date());
const readJ = (k, d) => { try { return JSON.parse(localStorage[k] || 'null') ?? d; } catch { return d; } };
const LIGHTS = ['Natural light', 'Golden hour', 'Moonlight', 'Tropical blue'], LIGHT_BY = [null, 'Golden hour', 'Moonlight', 'Tropical blue'];
const has = (name) => { const u = UNLOCKS.find((x) => x[0] === name); return unlocked(u, nSeen(), found(), WONDERS.length); };
const okStreak = (s) => s && typeof s.last === 'string' && Number.isInteger(s.n) && s.n >= 0 ? s : { last: '', n: 0, best: 0 };
let streak = okStreak(readJ('abyssalStreak', null));
const daily = { i: dailyPick(TODAY, WONDERS.length), done: false };
{ const d = readJ('abyssalDaily', {}); daily.done = d.date === TODAY && d.done === true; }
const announced = new Set([].concat(readJ('abyssalUnlocked', [])).filter((x) => typeof x === 'string'));

function saveDaily() {
  keep('abyssalDaily', JSON.stringify({ date: TODAY, done: daily.done, found: nSeen(), spots: found(), total: WONDERS.length, master: has('Master diver') }));
}
// what the unlocks switch on: the companion, and a light that is no longer earned falls back to natural
function apply() {
  BUDDY = has('Turtle companion') ? 1 : 0;
  if (LIGHT && !has(LIGHT_BY[LIGHT])) LIGHT = 0;
}
// after every find: announce what it unlocked (once, ever), then refresh what depends on it
function progressed() {
  for (const u of UNLOCKS) {
    if (announced.has(u[0]) || !unlocked(u, nSeen(), found(), WONDERS.length)) continue;
    announced.add(u[0]); setTimeout(ding, 900);
    toast(`Unlocked: ${u[0]} · ${u[3]}`, 1);
  }
  keep('abyssalUnlocked', JSON.stringify([...announced]));
  apply(); saveDaily(); drawDaily();
}
// G: the next light you have earned
function cycleLight() {
  const own = [0, 1, 2, 3].filter((k) => !k || has(LIGHT_BY[k]));
  if (own.length < 2) { toast(`Find ${max(0, 5 - nSeen())} more sunken wonders to unlock Golden hour`); return; }
  LIGHT = own[(own.indexOf(LIGHT) + 1) % own.length]; keep('abyssalLight', LIGHT); toast(LIGHTS[LIGHT]);
}
// P: the radar shows three times as far for 10 s (once it has run out)
function ping() {
  if (!has('Sonar')) { toast(`Find ${max(0, 10 - nSeen())} more sunken wonders to unlock Sonar`); return; }
  const now = performance.now(); if (now < sonarUntil) return;
  sonarUntil = now + 10e3; if (!CFG.map) { CFG.map = true; saveCfg(); }
  ding(); toast('Sonar ping · the map reaches 900 m');
}
// every frame (from wonders()): reaching today's wonder, found before or not, completes today's dive
function dailyCheck() {
  if (daily.done) return;
  const i = daily.i, dx = WP[i * 5] - F[CX], dz = WP[i * 5 + 1] - F[CZ];
  if (sqrt(dx * dx + dz * dz) - WP[i * 5 + 2] > 6) return;
  daily.done = true; streak = nextStreak(streak, TODAY); keep('abyssalStreak', JSON.stringify(streak));
  saveDaily(); drawDaily(); setTimeout(ding, 300);
  toast(`Today’s dive done: ${WONDERS[i][0]} · ${streak.n}-day streak`, 1);
}

// ---------------------------------------------------------------- menu: today's dive pill and the dive log panel
function drawDaily() {
  const n = liveStreak(streak, TODAY), e = $('vd');
  e.hidden = false; e.className = daily.done ? 'ok' : '';
  e.textContent = '';
  e.append(daily.done ? 'Today’s dive done' : 'Today’s dive: ', ...(daily.done ? [] : [Object.assign(document.createElement('b'), { textContent: WONDERS[daily.i][0] })]));
  if (n) e.append(` · ${n}-day streak`);
}
// open / close; touches only the page, because the menu calls it before this file has run
function logPanel(open) {
  $('lg').hidden = !open; if (open) $('r').hidden = true;
  $('g').hidden = open || !$('r').hidden;
  if (open) { drawLog(); $('lgc').focus(); }
}
function drawLog() {
  const w = nSeen(), s = found(), T = WONDERS.length, mk2 = (t, txt, c) => Object.assign(document.createElement(t), { textContent: txt ?? '', className: c ?? '' });
  const n = liveStreak(streak, TODAY), wi = WREG[daily.i];
  $('lgd').replaceChildren(
    mk2('b', `Today’s dive: ${WONDERS[daily.i][0]}`),
    mk2('span', `${wi >= 0 ? REGIONS[wi][0] + ' · ' : ''}${daily.done ? 'done today' : 'follow the cyan arrow on the map'}`),
    mk2('span', `Streak ${n} ${n === 1 ? 'day' : 'days'} · best ${streak.best || 0}`),
  );
  $('lgu').replaceChildren(...UNLOCKS.map((u) => {
    const ok = unlocked(u, w, s, T), li = mk2('li', null, ok ? 'on' : '');
    const need = u[1] === 'wonders' ? `${min(w, u[2])} / ${u[2]} wonders` : u[1] === 'spots' ? `${s} / 6 garden spots` : `${w + s} / ${T + 6} finds`;
    const bar = mk2('i'); bar.style.setProperty('--k', min(1, unlockShare(u, w, s, T)).toFixed(3));
    li.append(mk2('b', u[0]), mk2('span', ok ? u[3] : need), bar);
    return li;
  }));
  $('lgr').replaceChildren(mk2('p', `Garden · ${s} / 6`, s === 6 ? 'on' : ''), ...REGIONS.map((r, k) => { const [a, t] = regionCount(k); return mk2('p', `${r[0]} · ${a} / ${t}`, a === t ? 'on' : ''); }));
}
$('lb').onclick = () => logPanel(true);
$('lgc').onclick = () => { logPanel(false); $('lb').focus(); };
addEventListener('keydown', (e) => { if (e.code === 'Escape' && !$('lg').hidden) logPanel(false); });

// the first wonder lies 500 m or more from every viewpoint, past the 300 m map, while the garden spots are close
// (reports/balance-check-progression-2026-11-17.md): 20 s into a first dive with nothing found, say once which way to go
let hintAt = 0;
function firstHint() {
  if (menu || tour || AMB || nSeen() || readJ('abyssalHint', 0) === 1) { hintAt = 0; return; }
  if (!hintAt) { hintAt = performance.now(); return; }
  if (performance.now() - hintAt < 20e3) return;
  let d = 1e9; for (let i = 0; i < WONDERS.length; i++) d = min(d, hypot(WP[i * 5] - F[CX], WP[i * 5 + 1] - F[CZ]) - WP[i * 5 + 2]);
  const fast = CFG.b[A_S][0] ? keyName(CFG.b[A_S][0]) : 'the Faster key';
  keep('abyssalHint', 1);
  toast(`The nearest sunken wonder is ${round(max(0, d) / 50) * 50} m away: follow the arrow on the map, and hold ${fast} to cross open water`, 1);
}
setInterval(firstHint, 1000);

// ---------------------------------------------------------------- start
// unlocks earned before this version are taken as already announced; the dive log lists them
for (const u of UNLOCKS) if (unlocked(u, nSeen(), found(), WONDERS.length)) announced.add(u[0]);
keep('abyssalUnlocked', JSON.stringify([...announced]));
{ const l = readJ('abyssalLight', 0); LIGHT = Number.isInteger(l) && l >= 0 && l <= 3 ? l : 0; }
keep('abyssalNames', JSON.stringify(WONDERS.map((x) => x[0])));
apply(); saveDaily(); drawDaily();
// the new-tab scene: no menu, the tour round and round; tells the new tab when the first frames are up
if (AMB) {
  menu = false; body.className = 'g a'; tour = true; F[FLT] = 0; flyAt(); still();
  requestAnimationFrame(() => requestAnimationFrame(() => { if (parent !== window) parent.postMessage('deepdive:ready', location.origin); }));
}
