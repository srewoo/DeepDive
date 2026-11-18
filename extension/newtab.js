// The extension's new tab. It opens at once on a still of the world (a different one each day) with the time,
// today's dive and the streak, read from what the game saved (progress.js). "Live scene", off by default, loads
// the game's endless tour (index.html?ambient) behind it and shows it only once its first frames are up, so a
// computer without WebGPU just keeps the still. posters.js (the stills, in day order) and daily.js load first.
const $ = (id) => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage[k] || 'null') ?? d; } catch { return d; } };
const store = (k, v) => { try { localStorage[k] = v; } catch {} };
const today = dayKey(new Date());

const [file, caption] = POSTERS[dayNum(today) % POSTERS.length];
$('bg').src = `posters/${file}.jpg`;
$('cap').textContent = caption;

const fmtTime = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const fmtDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
function tick() {
  const d = new Date();
  $('clock').textContent = fmtTime.format(d);
  $('date').textContent = fmtDate.format(d);
  if (dayKey(d) !== today) { location.reload(); return; } // past midnight: a new still and a new dive
  setTimeout(tick, 60e3 - d.getSeconds() * 1e3 - d.getMilliseconds() + 20); // on the minute
}
tick();

// today's dive: the game saves the wonder names on its first run; before that there is nothing to show
const names = read('abyssalNames', []);
if (Array.isArray(names) && names.length) {
  const d = read('abyssalDaily', {}), done = d.date === today && d.done === true, n = liveStreak(read('abyssalStreak', null), today);
  const seen = read('abyssalWonders', []), found = Array.isArray(seen) ? seen.length : 0;
  $('tn').textContent = names[dailyPick(today, names.length)];
  $('ts').textContent = [done ? 'Done today' : 'Not done yet', n ? `${n}-day streak` : '', `${found} / ${names.length} wonders found`].filter(Boolean).join(' · ');
  $('today').hidden = false; $('today').classList.toggle('ok', done); $('hello').hidden = true;
  if (!done) $('dive').textContent = 'Go dive';
}

// search: handed to the browser's own default search engine (chrome.search, the "search" permission), so it goes
// wherever the user's address bar would send it. Only shown when that API is there (it isn't on a plain web page).
if (globalThis.chrome?.search?.query) {
  const form = $('search'), q = $('q');
  form.hidden = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = q.value.trim().slice(0, 2048);
    if (!text) return;
    try { await chrome.search.query({ text, disposition: 'CURRENT_TAB' }); } catch (err) { console.error('Deep Dive: search failed', err); }
  });
  // "/" jumps to the box, as on most search pages (but not while typing somewhere else)
  addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && document.activeElement !== q && !(document.activeElement instanceof HTMLInputElement)) { e.preventDefault(); q.focus(); }
  });
}

const live = $('live'), box = $('lvc');
function setLive(on) {
  store('abyssalNtLive', on ? '1' : '');
  document.body.classList.remove('live');
  if (on) { live.hidden = false; live.src = 'index.html?ambient'; } else { live.hidden = true; live.src = 'about:blank'; } // blank frees the GPU
}
addEventListener('message', (e) => {
  if (e.origin === location.origin && e.source === live.contentWindow && e.data === 'deepdive:ready') document.body.classList.add('live');
});
// a new tab left in the background lets its live scene go after 20 s, so tabs piling up don't each hold a world on
// the GPU; coming back shows the still at once and fades the scene in again when it is ready
let away = 0;
document.addEventListener('visibilitychange', () => {
  clearTimeout(away);
  if (!box.checked) return;
  if (document.hidden) away = setTimeout(() => { document.body.classList.remove('live'); live.src = 'about:blank'; }, 20e3);
  else if (!live.src.endsWith('?ambient')) live.src = 'index.html?ambient';
});
if (!navigator.gpu) $('lv').hidden = true;
else {
  box.checked = read('abyssalNtLive', 0) === 1;
  box.onchange = () => setLive(box.checked);
  if (box.checked) setTimeout(() => setLive(true), 250); // the still and the clock paint first
}
