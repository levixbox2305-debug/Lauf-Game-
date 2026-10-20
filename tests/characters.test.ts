import { challengeMet, openChallenges } from '../src/lib/characters';
import { applyRun, createGame, type GameState, type ItemId } from '../src/lib/game';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };

const at = (hour: number) => new Date(2026, 9, 21, hour, 0).getTime();
const record = (km: number, minutes: number, hour = 12) => ({
  id: 'x', startedAt: at(hour), endedAt: at(hour) + minutes * 60000, distanceM: km * 1000, durationS: minutes * 60, energy: 0,
});
const build = (s: GameState, world: 'island' | 'city', index: number, item: ItemId): GameState => {
  const tiles = s.worlds[world].tiles.map((t, i) => (i === index ? { ...t, item } : t));
  return { ...s, worlds: { ...s.worlds, [world]: { ...s.worlds[world], tiles } } };
};

eq('distance met', challengeMet({ kind: 'distance', km: 2 }, record(2.1, 14)), true);
eq('distance not met', challengeMet({ kind: 'distance', km: 2 }, record(1.9, 14)), false);
eq('duration met', challengeMet({ kind: 'duration', minutes: 30 }, record(4, 31)), true);
eq('pace met (5:30)', challengeMet({ kind: 'pace', km: 1, maxSecPerKm: 360 }, record(2, 11)), true);
eq('pace too slow (7:00)', challengeMet({ kind: 'pace', km: 1, maxSecPerKm: 360 }, record(2, 14)), false);
eq('before 9 at 7', challengeMet({ kind: 'before', hour: 9, km: 1 }, record(2, 12, 7)), true);
eq('before 9 at 10', challengeMet({ kind: 'before', hour: 9, km: 1 }, record(2, 12, 10)), false);
eq('before 9 at 1am does not count', challengeMet({ kind: 'before', hour: 9, km: 1 }, record(2, 12, 1)), false);
eq('after 20 at 21', challengeMet({ kind: 'after', hour: 20, km: 1 }, record(2, 12, 21)), true);
eq('rejected run never counts', challengeMet({ kind: 'distance', km: 2 }, { ...record(5, 10), rejectedReason: 'zu schnell' }), false);

// No teahouse -> no challenge, even after a long run.
let s = createGame();
eq('no building, no challenge', openChallenges(s).map((c) => c.id), []);
let o = applyRun(s, { startedAt: at(12), endedAt: at(12) + 900000, distanceM: 3000, durationS: 900 });
eq('run without building unlocks nobody', o.newResidents, []);

// Teahouse built -> challenge open -> 2 km run moves Hana in, once.
s = build(createGame(), 'island', 50, 'teahouse');
eq('teahouse opens challenge', openChallenges(s).map((c) => c.id), ['tea']);
o = applyRun(s, { startedAt: at(12), endedAt: at(12) + 600000, distanceM: 1500, durationS: 600 });
eq('1.5 km not enough', o.newResidents, []);
o = applyRun(o.state, { startedAt: at(13), endedAt: at(13) + 900000, distanceM: 2500, durationS: 900 });
eq('2.5 km moves Hana in', [o.newResidents, o.state.residents], [['tea'], ['tea']]);
eq('challenge closed afterwards', openChallenges(o.state).map((c) => c.id), []);

// Buildings in the city world count for city characters.
s = build(createGame(), 'city', 50, 'ramen');
o = applyRun(s, { startedAt: at(18), endedAt: at(18) + 1800000, distanceM: 5200, durationS: 1800 });
eq('city ramen chef', o.newResidents, ['chef']);
process.exit(fails ? 1 : 0);
