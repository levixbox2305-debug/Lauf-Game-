import { applyRun, createGame, type GameState } from '../src/lib/game';
import { mergeStates, sameState } from '../src/lib/sync';
const DAY = 86400000;
const now = Date.now();
const run = (daysAgo: number, km = 5) => ({ startedAt: now - daysAgo * DAY, endedAt: now - daysAgo * DAY + 1800000, distanceM: km * 1000, durationS: 1800 });
let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };
const touch = (s: GameState, t: number): GameState => ({ ...s, updatedAt: t });

// Phone has a save; a brand-new device logs in -> must take the cloud save, not wipe it.
let phone = touch(applyRun(createGame(), run(2)).state, 1000);
phone = touch({ ...phone, world: { ...phone.world, tiles: phone.world.tiles.map((t, i) => (i === 0 ? { unlocked: true, item: 'bamboo' } : t)) } }, 2000);
const fresh = createGame();
let m = mergeStates(fresh, phone);
eq('fresh device takes cloud world', m.world.tiles[0], { unlocked: true, item: 'bamboo' });
eq('fresh device takes cloud runs/energy', [m.runs.length, m.energy], [1, 50]);

// Two devices each ran once while offline: both runs kept, energy of both counted.
const base = touch(applyRun(createGame(), run(10)).state, 1000);
const a = touch(applyRun(base, run(3)).state, 3000);
const b = touch(applyRun(base, run(1, 2)).state, 2000);
m = mergeStates(a, b);
eq('both runs kept, sorted newest first', m.runs.map((r) => r.distanceM), [2000, 5000, 5000]);
eq('energy = newer + missing run', m.energy, 50 + 50 + 20);
eq('newer updatedAt kept', m.updatedAt, 3000);
eq('merge is symmetric for runs', mergeStates(b, a).runs.length, 3);

// Merge with itself is a no-op (prevents sync loops).
eq('idempotent', sameState(mergeStates(m, m), m), true);
eq('stable after re-merge', sameState(mergeStates(m, mergeStates(m, b)), mergeStates(m, b)), true);

// Each device has one run in the same week: together they complete the streak week -> one bell.
const c1 = touch(applyRun(createGame(), run(0.1)).state, 5000);
const c2 = touch(applyRun(createGame(), run(0.2)).state, 4000);
// pretend c2 is not fresh
m = mergeStates(c1, c2);
const week = new Date(now); const dow = (week.getDay() + 6) % 7;
if (dow >= 1) { eq('combined runs earn the bell once', [m.inventory.bell, m.claimedStreaks], [1, [1]]); }
else console.log('skip  (Monday: runs may fall into last week)');

// Bell earned on both devices separately must not be doubled.
const d1 = touch(applyRun(applyRun(createGame(), run(0.2)).state, run(0.1)).state, 6000);
const d2 = touch(applyRun(applyRun(createGame(), run(0.4)).state, run(0.3)).state, 5000);
if (dow >= 1) eq('bell from both devices not doubled', mergeStates(d1, d2).inventory.bell, 1);

// Placed collectible on the newer device stays placed, older device still has it in inventory -> no duplicate.
const p1 = touch({ ...d1, inventory: {}, world: { ...d1.world, tiles: d1.world.tiles.map((t, i) => (i === 60 ? { ...t, item: 'bell' } : t)) } }, 9000);
const pm = mergeStates(p1, d1);
if (dow >= 1) eq('placed bell not duplicated', [pm.inventory.bell ?? 0, pm.world.tiles[60].item], [0, 'bell']);
process.exit(fails ? 1 : 0);
