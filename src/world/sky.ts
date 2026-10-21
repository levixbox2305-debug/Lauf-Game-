// The sky over the world: colours, sun and moon positions and how dark it is, by time of day.

type Rgb = [number, number, number];

/** Sky gradient (top, horizon) at key hours; everything in between is blended. */
const KEYS: { hour: number; top: string; bottom: string }[] = [
  { hour: 0, top: '#0B1026', bottom: '#1B2346' },
  { hour: 4.5, top: '#0F1530', bottom: '#2A2F5C' },
  { hour: 6, top: '#3D3A6E', bottom: '#F0A060' }, // dawn
  { hour: 7.5, top: '#8EC5E8', bottom: '#F7D9B5' },
  { hour: 10, top: '#79B6E2', bottom: '#EEF2EE' },
  { hour: 16, top: '#7DB4DD', bottom: '#F3E8D2' },
  { hour: 18.5, top: '#5D6FA8', bottom: '#F08A5D' }, // sunset
  { hour: 20, top: '#2D2650', bottom: '#8A4E6E' },
  { hour: 21.5, top: '#0B1026', bottom: '#1B2346' },
  { hour: 24, top: '#0B1026', bottom: '#1B2346' },
];

export const SUNRISE = 6;
export const SUNSET = 20;

const rgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const mix = (a: Rgb, b: Rgb, t: number): string =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

export type Sky = {
  top: string;
  bottom: string;
  /** 0 at noon, 1 in the middle of the night; used to dim the world and light windows. */
  darkness: number;
  /** Position along the arc from east (0) to west (1), or null while below the horizon. */
  sun: number | null;
  moon: number | null;
};

export function skyAt(hour: number): Sky {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && h >= KEYS[i + 1].hour) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = (h - a.hour) / (b.hour - a.hour);

  // Dark from dusk to dawn, with soft transitions over about an hour and a half.
  const ramp = (x: number, from: number, to: number) => Math.min(1, Math.max(0, (x - from) / (to - from)));
  const darkness = h < 12 ? 1 - ramp(h, 5, 7.5) : ramp(h, 18.5, 21);

  const sun = h >= SUNRISE && h <= SUNSET ? (h - SUNRISE) / (SUNSET - SUNRISE) : null;
  const nightHours = 24 - (SUNSET - SUNRISE);
  const sinceSunset = (h - SUNSET + 24) % 24;
  const moon = sun === null ? sinceSunset / nightHours : null;

  return { top: mix(rgb(a.top), rgb(b.top), t), bottom: mix(rgb(a.bottom), rgb(b.bottom), t), darkness, sun, moon };
}

/** Screen position on the sky arc: rises at the left, peaks in the middle, sets at the right. */
export function arcPosition(t: number, width: number, horizon: number, height: number) {
  return { x: width * (0.08 + t * 0.84), y: horizon - Math.sin(Math.PI * t) * height };
}
