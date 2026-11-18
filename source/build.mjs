// Bundles src/*.js into the single self-contained ../index.html
//   npm run build            minified
//   npm run build:readable   unminified, for debugging
//   npm run build:dev        ../dev.html: unminified, plus the development tools in src/dev.js
//   npm run build:extension  ../extension/: unpacked Chrome MV3 extension (load via chrome://extensions)
//   npm run package:extension  the above, plus ../store/deep-dive-<version>.zip for the Chrome Web Store
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { MANIFEST, writeExtension, zipExtension } from './extension.mjs';
import { postersScript } from './posters.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const FILES = ['quality.js', 'daily.js', 'math.js', 'shaders.js', 'world.js', 'wonders.js', 'landmarks.js', 'creatures.js', 'controls.js', 'main.js', 'play.js', 'audio.js', 'progress.js']; // concatenation order matters
const dev = process.argv.includes('--dev'), readable = dev || process.argv.includes('--readable');
const ext = process.argv.includes('--extension');
const out = dev ? 'dev.html' : 'index.html';
if (dev) FILES.push('dev.js');

let js = FILES.map((f) => readFileSync(path.join(here, 'src', f), 'utf8')).join('\n');
const tpl = readFileSync(path.join(here, 'template.html'), 'utf8');
// everything runs inside one async function; startup errors are shown on screen
// fallback.js sits outside, so it still runs when the game fails before it gets going; it needs the poster list
const FALLBACK = postersScript() + readFileSync(path.join(here, 'src', 'fallback.js'), 'utf8');
const wrap = (body) => `${FALLBACK}\n(async()=>{${body}\n})().catch(fallback);`;

let html;
if (readable) {
  html = tpl.replace('/*SCRIPT*/', () => wrap(js));
} else {
  // shrink the WGSL inside /*wgsl*/ template literals, then minify the JS and the page's CSS
  const minWgsl = (s) => s.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ').replace(/ ?([{}()\[\];,:=+\-*\/<>&|!%@]) ?/g, '$1').trim();
  js = js.replace(/\/\*wgsl\*\/`([^`]*)`/g, (_, w) => '`' + minWgsl(w) + '`');
  const code = transformSync(wrap(js), { minify: true, target: 'es2022', legalComments: 'none' }).code.trim();
  const css = (_, s) => '<style>' + transformSync(s, { loader: 'css', minify: true }).code.trim();
  html = tpl.replace(/<style>([^]*?)(?=<\/style>)/, css).replace(/>\s+</g, '><').replace('/*SCRIPT*/', () => code).replace(/<script>\s+/, '<script>').replace(/\s+<\/script>/, '</script>');
}
if (ext) {
  const dir = path.join(here, '..', 'extension');
  writeExtension(dir, html, here);
  console.log('extension/: unpacked Chrome extension written');
  if (process.argv.includes('--zip')) {
    const zip = path.join(here, '..', 'store', `deep-dive-${MANIFEST.version}.zip`);
    zipExtension(dir, zip);
    console.log(`store/${path.basename(zip)}: Chrome Web Store upload written`);
  }
  process.exit(0);
}
writeFileSync(path.join(here, '..', out), html);
const gz = gzipSync(Buffer.from(html), { level: 9 }).length;
console.log(`${out}: ${(html.length / 1024).toFixed(1)} kB${readable ? ' (readable)' : ''}, ${(gz / 1024).toFixed(1)} kB gzipped`);
