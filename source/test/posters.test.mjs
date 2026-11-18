// Tests for posters.mjs and the extension's poster check: every still is listed once, is on disk, and is a full
// 1920x1080 JPEG encoded like the first six (same quantisation tables), so none is a lower-quality copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { POSTERS, postersScript } from '../posters.mjs';
import { checkPosters } from '../extension.mjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'extension', 'posters');

// width, height and the quantisation tables (DQT segments) of a baseline JPEG
const jpegInfo = (buf) => {
  let i = 2, w = 0, h = 0; const dqt = [];
  while (i < buf.length && buf[i] === 0xff) {
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m === 0xdb) dqt.push(buf.subarray(i + 4, i + 2 + len).toString('hex'));
    if (m === 0xc0 || m === 0xc2) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); }
    if (m === 0xda) break;
    i += 2 + len;
  }
  return { w, h, dqt: dqt.join('|') };
};

test('25 posters, each listed once with a caption', () => {
  assert.equal(POSTERS.length, 25);
  assert.equal(new Set(POSTERS.map(([n]) => n)).size, 25);
  for (const [n, cap] of POSTERS) { assert.ok(Number.isInteger(n) && n >= 1 && n <= 25); assert.ok(cap.trim().length > 0); }
});

test('the six hub scenes are spread through the rotation, not bunched together', () => {
  const at = POSTERS.map(([n], i) => (n <= 6 ? i : -1)).filter((i) => i >= 0);
  assert.equal(at.length, 6);
  for (let k = 1; k < at.length; k++) assert.ok(at[k] - at[k - 1] >= 3, `hub stills at ${at}`);
});

test('every poster is a 1920x1080 JPEG with the same encoding as the originals', () => {
  const ref = jpegInfo(readFileSync(path.join(dir, '1.jpg')));
  assert.ok(ref.dqt.length > 0);
  for (const [n] of POSTERS) {
    const info = jpegInfo(readFileSync(path.join(dir, `${n}.jpg`)));
    assert.deepEqual([info.w, info.h], [1920, 1080], `${n}.jpg size`);
    assert.equal(info.dqt, ref.dqt, `${n}.jpg quantisation differs from 1.jpg`);
  }
});

test('checkPosters passes on the real folder and fails on a missing or unlisted file', () => {
  assert.equal(checkPosters(dir), 25);
  const tmp = mkdtempSync(path.join(tmpdir(), 'posters-'));
  try {
    for (const [n] of POSTERS.slice(1)) copyFileSync(path.join(dir, `${n}.jpg`), path.join(tmp, `${n}.jpg`));
    assert.throws(() => checkPosters(tmp), /missing \[1\.jpg\]/);
    copyFileSync(path.join(dir, '1.jpg'), path.join(tmp, '1.jpg'));
    writeFileSync(path.join(tmp, '99.jpg'), '');
    assert.throws(() => checkPosters(tmp), /not listed in posters\.mjs \[99\.jpg\]/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('postersScript gives the pages the same list', () => {
  // compared as JSON: arrays made in another vm context have another Array prototype
  assert.equal(vm.runInNewContext(`${postersScript()};JSON.stringify(POSTERS)`), JSON.stringify(POSTERS));
});
