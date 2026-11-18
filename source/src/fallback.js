// ============================================================================
// fallback: the screen shown when the live scene can't run
// ============================================================================
// Loaded outside the game's async function (build.mjs), so it works even when the game never gets going. It names
// the problem, says how to fix it and offers a retry; the extension also ships stills of the world (body
// data-posters; POSTERS, from posters.mjs, comes before this file) and shows them as a slow slideshow, so the page is
// still worth a look.
const FALLBACK_TIPS = {
  nogpu: 'Update your browser, or open this in a current Chrome or Edge (version 113 or newer) on Windows, macOS, ChromeOS or Android.',
  noadapter: 'In Chrome, open Settings › System and turn on “Use graphics acceleration when available”, then relaunch. If it is already on, the page chrome://gpu shows whether your graphics driver is blocked.',
  lost: 'Close other heavy tabs or apps and try again. Updating your graphics driver often helps.',
  busy: 'Close other Deep Dive tabs (new tabs showing the live scene count too) or other 3D apps, then try again.',
};
function fallback(e) {
  console.error(e);
  const b = document.body, $ = (id) => document.getElementById(id), cause = e?.cause, msg = e?.message || String(e);
  // a fault once the scene is up (the frame loop runs, body is m or g) is logged, not shown over a working world
  if (!b.classList.contains('l')) return;
  b.className = 'l e f';
  $('s').textContent = cause ? msg : `Failed to start: ${msg}`;
  $('ft').textContent = FALLBACK_TIPS[cause] || 'Reload the page to try again, or try Low detail.';
  // the level this load ran at: the saved one, else quality.js's default for this device
  let lv; try { lv = (localStorage.abyssal || '').split(',')[0]; } catch {}
  const mem = navigator.deviceMemory, mob = matchMedia('(pointer:coarse)').matches;
  lv = lv ? +lv : mob ? (mem > 7 ? 1 : 2) : mem <= 4 ? 2 : 0;
  $('fr').onclick = () => location.reload();
  $('fl').hidden = lv >= 2 || cause === 'nogpu' || cause === 'noadapter' || cause === 'busy'; // Low detail can't fix those
  $('fl').onclick = () => { try { localStorage.abyssal = 2; localStorage.abyssalLoad = ''; } catch {} location.reload(); };
  // the new tab only shows its scene once it runs, so a failed one needs no pictures
  const n = new URLSearchParams(location.search).has('ambient') ? 0 : +b.dataset.posters || 0, box = $('fp');
  if (!n || box.childElementCount) return;
  // each still loads just before its turn (the one showing and the next), not all of them at once
  const shots = POSTERS.slice(0, n), figs = shots.map(([, name]) => {
    const f = document.createElement('figure'), img = new Image(), cap = document.createElement('figcaption');
    img.alt = name; img.decoding = 'async'; cap.textContent = name; f.append(img, cap); return f;
  });
  const load = (i) => { const img = figs[i].firstChild; if (!img.src) img.src = `posters/${shots[i][0]}.jpg`; };
  box.append(...figs);
  let k = 0; load(0); load(1 % n); figs[0].className = 'on';
  setInterval(() => { figs[k].className = ''; k = (k + 1) % n; figs[k].className = 'on'; load((k + 1) % n); }, 7000);
}
