import { skyAt } from '../src/world/sky';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };

eq('noon is bright', skyAt(12).darkness, 0);
eq('midnight is dark', skyAt(0).darkness, 1);
eq('sun at noon is in the middle', skyAt(13).sun, 0.5);
eq('sun rises at 6', [skyAt(5.9).sun, skyAt(6).sun], [null, 0]);
eq('no moon by day', skyAt(12).moon, null);
eq('moon up at night', skyAt(2).moon !== null && skyAt(2).moon! > 0 && skyAt(2).moon! < 1, true);
eq('dusk is half dark', skyAt(19.75).darkness > 0.3 && skyAt(19.75).darkness < 0.7, true);
eq('colours are valid', /^rgb\(\d+,\d+,\d+\)$/.test(skyAt(18.7).top), true);
eq('wraps around 24h', skyAt(25).top, skyAt(1).top);
process.exit(fails ? 1 : 0);
