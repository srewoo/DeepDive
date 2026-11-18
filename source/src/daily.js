// ============================================================================
// daily: today's dive, the streak and the unlock ladder, as pure functions
// ============================================================================
// No DOM and no game state, so the extension's new tab (newtab.js) shares this file and test/daily.test.mjs runs it.
// Days are local calendar days, written 'YYYY-MM-DD'.
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayNum = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
// the same wonder for everyone on a given day; an FNV-1a hash of the date, so neighbouring days land far apart
const dailyPick = (key, n) => { let h = 2166136261; for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619); return (h >>> 0) % n; };
// today's dive done: one more day if the last one was yesterday, otherwise the streak starts again at 1
const nextStreak = (s, key) => {
  if (s.last === key) return s;
  const n = s.last && dayNum(key) - dayNum(s.last) === 1 ? s.n + 1 : 1;
  return { last: key, n, best: Math.max(s.best || 0, n) };
};
// the streak still counts while its last day is today or yesterday (today's dive can still extend it)
const liveStreak = (s, key) => (s && s.last && dayNum(key) - dayNum(s.last) <= 1 ? s.n : 0);
// [name, what it takes, how many, what it gives]. 'all' means every wonder and every garden spot
const UNLOCKS = [
  ['Golden hour', 'wonders', 5, 'A warm evening light. G changes the light.'],
  ['Sonar', 'wonders', 10, 'P sends a ping: the map reaches three times as far.'],
  ['Turtle companion', 'spots', 6, 'A sea turtle swims at your side.'],
  ['Moonlight', 'wonders', 20, 'A cold, quiet night dive.'],
  ['Tropical blue', 'wonders', 35, 'Clear, vivid tropical water.'],
  ['Master diver', 'all', 1, 'Every sunken wonder and garden spot found.'],
];
// w wonders found of `total`, s garden spots of 6
const unlocked = (u, w, s, total) => (u[1] === 'wonders' ? w >= u[2] : u[1] === 'spots' ? s >= u[2] : w >= total && s >= 6);
// progress towards one unlock, 0..1
const unlockShare = (u, w, s, total) => (u[1] === 'wonders' ? w / u[2] : u[1] === 'spots' ? s / u[2] : (w + s) / (total + 6));
