import { applyRun, createGame, migrate, streakInfo, type GameState } from '../src/lib/game';
const DAY = 86400000;
const now = new Date('2026-10-21T12:00:00').getTime(); // Wednesday
const run = (daysAgo: number, km = 5) => ({ startedAt: now - daysAgo * DAY, endedAt: now - daysAgo * DAY + 1800000, distanceM: km * 1000, durationS: 1800 });
let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };

let s: GameState = createGame();
eq('empty', streakInfo(s.runs, now), { weeks: 0, thisWeekRuns: 0, thisWeekDone: false });
// 3 weeks ago, 2 weeks ago, last week: 2 runs each; this week 1 run
for (const d of [22, 20, 15, 13, 8, 6]) s = applyRun(s, run(d)).state;
eq('3 past weeks, current in progress', streakInfo(s.runs, now), { weeks: 3, thisWeekRuns: 0, thisWeekDone: false });
eq('rewards for 1 and 2 weeks', s.inventory, { bell: 1, koinobori: 1 });
let o = applyRun(s, run(1));
eq('bonus 30% on 50 energy', [o.record.energy, o.record.bonusEnergy], [65, 15]);
eq('one run this week', o.streak, { weeks: 3, thisWeekRuns: 1, thisWeekDone: false });
o = applyRun(o.state, run(0));
eq('week done -> 4 weeks, zen reward', [o.streak.weeks, o.rewards], [4, ['zen']]);
eq('short run does not count', streakInfo(applyRun(createGame(), run(0, 0.5)).state.runs, now).thisWeekRuns, 0);
// gap breaks streak
let g = createGame();
for (const d of [22, 20, 8, 6]) g = applyRun(g, run(d)).state;
eq('gap breaks streak', streakInfo(g.runs, now).weeks, 1);
// rewards only once
let r = createGame();
for (const d of [8, 6]) r = applyRun(r, run(d)).state;
r = { ...r, runs: [] }; // pretend streak was lost
for (const d of [1, 0]) r = applyRun(r, run(d)).state;
eq('bell not given twice', r.inventory.bell, 1);
// migration from v2 doesn't award retroactively
const v2 = { version: 2, energy: 5, runs: s.runs, world: s.world };
const m = migrate(v2 as never);
eq('migrate v2', [m.version, m.inventory, m.claimedStreaks], [3, {}, [1, 2]]);
// too fast run gets no bonus
const fast = applyRun(s, { ...run(0, 10), durationS: 600 });
eq('rejected run no bonus', [fast.record.energy, fast.record.rejectedReason !== undefined], [0, true]);
process.exit(fails ? 1 : 0);
