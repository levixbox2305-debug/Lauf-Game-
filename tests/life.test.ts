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

// Walk to work at noon and stop there.
const rand = () => 0.3;
let walker = spawnWalker(w, 'tea', rand)!;
walker = { ...walker, x: 6.5, y: 6.5 };
let now = 0;
for (let i = 0; i < 80; i++) { now += 100; walker = stepWalker(walker, w, 'island', 12, now, 0.1, rand); }
const tile = Math.floor(walker.y) * 11 + Math.floor(walker.x);
eq('arrives next to the teahouse', [at(4, 5), at(5, 4)].includes(tile), true);
eq('working when there', [walker.phase, walker.path.length, walker.doing], ['work', 0, 'bereitet Matcha zu']);
// At night she goes home and disappears inside.
for (let i = 0; i < 200; i++) { now += 1000; walker = stepWalker(walker, w, 'island', 23, now, 1, rand); }
eq('sleeps at night', [walker.phase, walker.visible], ['home', false]);
process.exit(fails ? 1 : 0);
