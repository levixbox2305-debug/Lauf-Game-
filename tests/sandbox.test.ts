import { CHARACTERS } from '../src/lib/characters';
import { totalKm, WORLDS, worldUnlocked } from '../src/lib/game';
import { createSandboxGame } from '../src/lib/sandbox';
import { spotsNear } from '../src/world/life';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };

const s = createSandboxGame(new Date('2026-10-21T12:00:00').getTime());
const km = totalKm(s.runs);
eq('enough km for every world', WORLDS.every((w) => worldUnlocked(w.id, km)), true);
eq('more km than the last item needs', km >= 190, true);
eq('everyone lives there', s.residents.length, CHARACTERS.length);
// Every resident's home must exist and be reachable, or they'd be stuck.
for (const c of CHARACTERS) eq(`${c.name} has a reachable home`, spotsNear(s.worlds[c.world], [c.home]).length > 0, true);
process.exit(fails ? 1 : 0);
