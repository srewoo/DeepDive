// Packages the built page as a Chrome (MV3) extension.
// MV3 extension pages forbid inline <script>, so the game code is moved into game.js.
// The toolbar button opens the game; the new tab shows a still of the world, the time, today's dive and a search box,
// with an opt-in live scene. The one permission, "search", lets that box use the browser's default search engine
// (chrome.search.query); it shows no install warning.
// Icons in source/icons/ are rendered from store/src/icon*.svg; posters in source/extension/posters/ are stills of the
// world listed in posters.mjs (see store/README.md for both).
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { POSTERS, postersScript } from './posters.mjs';

export const MANIFEST = {
  manifest_version: 3,
  name: 'Deep Dive',
  version: '1.1.0',
  description: 'Swim a dreamy underwater world of kelp, shipwrecks and mantas, made of code. A calm still and clock on every new tab.',
  minimum_chrome_version: '116', // WebGPU (113) + runtime.getContexts (116)
  action: { default_title: 'Dive in' },
  background: { service_worker: 'background.js' },
  chrome_url_overrides: { newtab: 'newtab.html' },
  permissions: ['search'],
  icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
};
const STATIC = ['background.js', 'newtab.html', 'newtab.js', 'newtab.css'];

export const writeExtension = (dir, html, src) => {
  const m = html.match(/<script>([^]*)<\/script>/);
  if (!m) throw new Error('extension build: no inline <script> found in the page');
  if (/\son[a-z]+=/i.test(html)) throw new Error('extension build: inline event handlers are blocked by MV3 CSP');
  const posters = checkPosters(path.join(src, 'extension', 'posters'));
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(path.join(dir, 'icons'), { recursive: true });
  // data-posters tells fallback.js it can show the stills when the live scene can't run
  writeFileSync(path.join(dir, 'index.html'), html.replace(m[0], () => '<script src=game.js></script>').replace('<body class=l>', `<body class=l data-posters=${posters}>`));
  writeFileSync(path.join(dir, 'game.js'), m[1]);
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(MANIFEST, null, 2) + '\n');
  for (const f of STATIC) copyFileSync(path.join(src, 'extension', f), path.join(dir, f));
  copyFileSync(path.join(src, 'src', 'daily.js'), path.join(dir, 'daily.js')); // shared with the game: today's dive, the streak
  writeFileSync(path.join(dir, 'posters.js'), postersScript()); // which still each day shows, and its caption
  mkdirSync(path.join(dir, 'posters'));
  for (const [n] of POSTERS) copyFileSync(path.join(src, 'extension', 'posters', `${n}.jpg`), path.join(dir, 'posters', `${n}.jpg`));
  for (const n of [16, 32, 48, 128]) copyFileSync(path.join(src, 'icons', `${n}.png`), path.join(dir, 'icons', `${n}.png`));
};

// every listed poster is there exactly once, and nothing in the folder is left out of the list
export const checkPosters = (folder) => {
  const files = readdirSync(folder).filter((f) => f.endsWith('.jpg')).sort();
  const listed = POSTERS.map(([n]) => `${n}.jpg`), unique = new Set(listed);
  if (unique.size !== listed.length) throw new Error('extension build: a poster is listed twice in posters.mjs');
  const missing = listed.filter((f) => !files.includes(f)), extra = files.filter((f) => !unique.has(f));
  if (missing.length || extra.length) throw new Error(`extension build: posters missing [${missing}] or not listed in posters.mjs [${extra}]`);
  return listed.length;
};

// The Chrome Web Store upload: manifest.json must sit at the zip root. -X drops macOS extra attributes.
export const zipExtension = (dir, zipPath) => {
  rmSync(zipPath, { force: true });
  execFileSync('zip', ['-r', '-X', '-q', zipPath, '.'], { cwd: dir });
};
