import { CHARACTER_BY_ID } from '../src/lib/characters';
import { createWorld, type ItemId, type World } from '../src/lib/game';
import { findPath, phaseAt, spawnWalker, spotsNear, stepWalker } from '../src/world/life';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };

// 11x11 world, centre 3x3 unlocked (rows/cols 4..6). Index = r * 11 + c.
const at = (r: number, c: number) => r * 11 + c;
const place = (w: World, r: number, c: number, item: ItemId | null, unlocked = true): World => ({
  ...w,
  tiles: w.tiles.map((t, i) => (i === at(r, c) ? { unlocked, item } : t)),
});
let w = place(createWorld(), 5, 5, null);
w = place(w, 4, 4, 'teahouse');

eq('day phases', ['tea', 'tea', 'tea', 'tea'].map((id, k) => phaseAt(CHARACTER_BY_ID[id as 'tea'], [7, 12, 19, 23][k])), ['stroll', 'work', 'social', 'home']);
eq('night watchman works at night', [phaseAt(CHARACTER_BY_ID.watch, 23), phaseAt(CHARACTER_BY_ID.watch, 12)], ['work', 'home']);
eq('spots next to teahouse', spotsNear(w, ['teahouse']).sort((a, b) => a - b), [at(4, 5), at(5, 4)]);
eq('path ends at the target', findPath(w, at(6, 6), [at(4, 5)])?.at(-1), at(4, 5));
eq('path length is shortest', findPath(w, at(6, 6), [at(4, 5)])?.length, 3);
eq('buildings block the way', findPath(place(place(w, 4, 5, 'pagoda'), 5, 4, 'pagoda'), at(6, 6), spotsNear(w, ['teahouse'])), null);
eq('locked land is not walkable', findPath(w, at(5, 5), [at(0, 0)]), null);

// At noon she goes to work and makes tea there between her rounds.
const rand = () => 0.3;
let walker = spawnWalker(w, 'tea', rand)!;
walker = { ...walker, x: 6.5, y: 6.5 };
let now = 0;
let reachedWork = false;
let madeTea = false;
for (let i = 0; i < 300; i++) {
  now += 100;
  walker = stepWalker(walker, w, 'island', 12, now, 0.1, rand);
  const tile = Math.floor(walker.y) * 11 + Math.floor(walker.x);
  if ([at(4, 5), at(5, 4)].includes(tile) && !walker.path.length) reachedWork = true;
  if (walker.doing === 'bereitet Matcha zu') madeTea = true;
}
eq('reaches a spot next to the teahouse', reachedWork, true);
eq('makes tea while working', [walker.phase, madeTea], ['work', true]);
// At night she goes home and disappears inside.
for (let i = 0; i < 200; i++) { now += 1000; walker = stepWalker(walker, w, 'island', 23, now, 1, rand); }
eq('sleeps at night', [walker.phase, walker.visible], ['home', false]);
eq('sleeps in the teahouse', walker.sleepTile, at(4, 4));
// During the day nobody stays put for long.
// Seeded, so the result is the same on every run.
let seed = 42;
const seededRand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
for (const [name, world] of [['small island', w], ['big island', bigWorld()]] as const) {
  let moving = 0;
  let w2 = spawnWalker(world, 'tea', seededRand)!;
  for (let i = 0; i < 3000; i++) {
    now += 100;
    const before = w2.x + w2.y;
    w2 = stepWalker(w2, world, 'island', 12, now, 0.1, seededRand);
    if (w2.x + w2.y !== before) moving++;
  }
  console.log(`     ${name}: walking ${Math.round((moving / 3000) * 100)} % of the time`);
  eq(`walks most of the day (${name})`, moving / 3000 > 0.45, true);
}
function bigWorld(): World {
  // 9x9 land with the teahouse in a corner, so walks are longer.
  const base = createWorld();
  return { ...base, tiles: base.tiles.map((t, i) => {
    const r = Math.floor(i / 11), c = i % 11;
    const inside = r >= 1 && r <= 9 && c >= 1 && c <= 9;
    return { unlocked: inside, item: r === 1 && c === 1 ? 'teahouse' : null };
  }) };
}
process.exit(fails ? 1 : 0);
