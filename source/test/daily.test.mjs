// Tests for src/daily.js: today's dive, the streak and the unlock ladder.
// daily.js is a plain script (it is concatenated into the game and loaded by the new tab), so it runs in a vm
// context here and hands back its functions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../src/daily.js', import.meta.url), 'utf8');
const D = vm.runInNewContext(`${src}\n;({ dayKey, dayNum, dailyPick, nextStreak, liveStreak, UNLOCKS, unlocked, unlockShare })`);
const U = (name) => D.UNLOCKS.find((u) => u[0] === name);

test('dayKey writes the local calendar day with zero padding', () => {
  assert.equal(D.dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(D.dayKey(new Date(2026, 10, 17, 0, 0)), '2026-11-17');
});

test('dayNum counts whole days, across month and year ends', () => {
  assert.equal(D.dayNum('2026-03-01') - D.dayNum('2026-02-28'), 1);
  assert.equal(D.dayNum('2027-01-01') - D.dayNum('2026-12-31'), 1);
  assert.equal(D.dayNum('2028-03-01') - D.dayNum('2028-02-28'), 2); // leap year
});

test('dailyPick is stable for a day, in range, and varies across days', () => {
  assert.equal(D.dailyPick('2026-11-17', 57), D.dailyPick('2026-11-17', 57));
  const picks = new Set();
  for (let d = 1; d <= 28; d++) {
    const i = D.dailyPick(`2026-02-${String(d).padStart(2, '0')}`, 57);
    assert.ok(Number.isInteger(i) && i >= 0 && i < 57);
    picks.add(i);
  }
  assert.ok(picks.size > 15, `only ${picks.size} different wonders in 28 days`);
});

test('nextStreak: first day, the next day, a gap, the same day twice', () => {
  const s1 = D.nextStreak({ last: '', n: 0, best: 0 }, '2026-11-17');
  assert.deepEqual({ ...s1 }, { last: '2026-11-17', n: 1, best: 1 });
  const s2 = D.nextStreak(s1, '2026-11-18');
  assert.deepEqual({ ...s2 }, { last: '2026-11-18', n: 2, best: 2 });
  assert.equal(D.nextStreak(s2, '2026-11-18'), s2, 'doing it twice in a day changes nothing');
  const s3 = D.nextStreak(s2, '2026-11-21');
  assert.deepEqual({ ...s3 }, { last: '2026-11-21', n: 1, best: 2 }, 'a missed day starts again but keeps the best');
});

test('liveStreak shows the streak until a whole day is missed', () => {
  const s = { last: '2026-11-17', n: 4, best: 4 };
  assert.equal(D.liveStreak(s, '2026-11-17'), 4);
  assert.equal(D.liveStreak(s, '2026-11-18'), 4, 'yesterday still counts: today can extend it');
  assert.equal(D.liveStreak(s, '2026-11-19'), 0);
  assert.equal(D.liveStreak(null, '2026-11-19'), 0);
  assert.equal(D.liveStreak({ last: '', n: 0 }, '2026-11-19'), 0);
});

test('unlocks follow wonders, garden spots, or everything', () => {
  assert.equal(D.unlocked(U('Golden hour'), 4, 0, 57), false);
  assert.equal(D.unlocked(U('Golden hour'), 5, 0, 57), true);
  assert.equal(D.unlocked(U('Turtle companion'), 57, 5, 57), false, 'the turtle needs the garden spots, not wonders');
  assert.equal(D.unlocked(U('Turtle companion'), 0, 6, 57), true);
  assert.equal(D.unlocked(U('Master diver'), 57, 5, 57), false);
  assert.equal(D.unlocked(U('Master diver'), 56, 6, 57), false);
  assert.equal(D.unlocked(U('Master diver'), 57, 6, 57), true);
});

test('the ladder climbs: every wonder threshold is reachable and in order', () => {
  const need = Array.from(D.UNLOCKS.filter((u) => u[1] === 'wonders'), (u) => u[2]); // a local array: the vm's has another prototype
  assert.deepEqual(need, [...need].sort((a, b) => a - b));
  assert.ok(need.every((n) => n > 0 && n < 57));
});

test('unlockShare runs from 0 to 1 at the threshold', () => {
  assert.equal(D.unlockShare(U('Sonar'), 0, 0, 57), 0);
  assert.equal(D.unlockShare(U('Sonar'), 5, 0, 57), 0.5);
  assert.equal(D.unlockShare(U('Turtle companion'), 0, 3, 57), 0.5);
  assert.equal(D.unlockShare(U('Master diver'), 57, 6, 57), 1);
});
