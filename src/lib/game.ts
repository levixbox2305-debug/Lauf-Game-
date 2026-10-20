// Game rules: how running turns into energy and what energy can build.

export type ItemId =
  | 'path'
  | 'bamboo'
  | 'sakura'
  | 'lantern'
  | 'pine'
  | 'rice'
  | 'pond'
  | 'torii'
  | 'teahouse'
  | 'pagoda'
  | 'castle';

export type ItemDef = {
  id: ItemId;
  name: string;
  cost: number;
  /** Total kilometres run before this item becomes available. */
  unlockKm: number;
};

export const ITEMS: ItemDef[] = [
  { id: 'path', name: 'Weg', cost: 2, unlockKm: 0 },
  { id: 'bamboo', name: 'Bambus', cost: 6, unlockKm: 0 },
  { id: 'sakura', name: 'Sakura', cost: 8, unlockKm: 0 },
  { id: 'lantern', name: 'Laterne', cost: 15, unlockKm: 1 },
  { id: 'pine', name: 'Kiefer', cost: 10, unlockKm: 2 },
  { id: 'rice', name: 'Reisfeld', cost: 15, unlockKm: 3 },
  { id: 'pond', name: 'Koi-Teich', cost: 25, unlockKm: 5 },
  { id: 'torii', name: 'Torii', cost: 40, unlockKm: 8 },
  { id: 'teahouse', name: 'Teehaus', cost: 60, unlockKm: 12 },
  { id: 'pagoda', name: 'Pagode', cost: 120, unlockKm: 25 },
  { id: 'castle', name: 'Burg', cost: 200, unlockKm: 42.2 },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<ItemId, ItemDef>;

export const ENERGY_PER_KM = 10;
/** Runs faster than this on average are treated as not on foot (bike, car, GPS glitch). */
export const MAX_RUN_SPEED_KMH = 22;
export const REFUND_RATE = 0.5;

export type Tile = { unlocked: boolean; item: ItemId | null };
export type World = { size: number; tiles: Tile[] };

/** Route as [lat, lon] pairs, one list per segment between pauses. */
export type Route = [number, number][][];

export type RunRecord = {
  id: string;
  startedAt: number;
  endedAt: number;
  distanceM: number;
  durationS: number;
  energy: number;
  route?: Route;
  /** Set when the run did not count, e.g. too fast to be on foot. */
  rejectedReason?: string;
};

export type GameState = {
  version: 2;
  energy: number;
  runs: RunRecord[];
  world: World;
};

const WORLD_SIZE = 11;
const START_RADIUS = 1; // 3x3 starting island

export function createWorld(): World {
  const mid = Math.floor(WORLD_SIZE / 2);
  const tiles: Tile[] = [];
  for (let r = 0; r < WORLD_SIZE; r++) {
    for (let c = 0; c < WORLD_SIZE; c++) {
      const unlocked = Math.abs(r - mid) <= START_RADIUS && Math.abs(c - mid) <= START_RADIUS;
      tiles.push({ unlocked, item: null });
    }
  }
  tiles[mid * WORLD_SIZE + mid].item = 'sakura';
  return { size: WORLD_SIZE, tiles };
}

export function createGame(): GameState {
  return { version: 2, energy: 0, runs: [], world: createWorld() };
}

// Version 1 used emoji items; map them onto the Japanese set, refund what has no equivalent.
const V1_ITEMS: Record<string, { id: ItemId | null; cost: number }> = {
  flowers: { id: 'path', cost: 3 },
  tree: { id: 'sakura', cost: 5 },
  pine: { id: 'pine', cost: 6 },
  tent: { id: 'lantern', cost: 10 },
  farm: { id: 'rice', cost: 15 },
  sheep: { id: null, cost: 12 },
  house: { id: 'teahouse', cost: 30 },
  fountain: { id: 'pond', cost: 25 },
  cottage: { id: 'teahouse', cost: 50 },
  mountain: { id: null, cost: 40 },
  church: { id: 'pagoda', cost: 120 },
  castle: { id: 'castle', cost: 200 },
};

export function migrate(raw: { version: number } & Omit<GameState, 'version'>): GameState {
  if (raw.version === 2) return raw as GameState;
  let refund = 0;
  const tiles = raw.world.tiles.map((t) => {
    if (!t.item) return t;
    const mapped = V1_ITEMS[t.item];
    if (!mapped?.id) refund += Math.floor((mapped?.cost ?? 0) * REFUND_RATE);
    return { ...t, item: mapped?.id ?? null };
  });
  return { ...raw, version: 2, energy: raw.energy + refund, world: { ...raw.world, tiles } };
}

export function energyForRun(distanceM: number, durationS: number): { energy: number; rejectedReason?: string } {
  if (durationS > 0) {
    const kmh = distanceM / 1000 / (durationS / 3600);
    if (distanceM > 200 && kmh > MAX_RUN_SPEED_KMH) {
      return { energy: 0, rejectedReason: `Zu schnell für einen Lauf (Ø ${kmh.toFixed(1)} km/h)` };
    }
  }
  return { energy: Math.floor((distanceM / 1000) * ENERGY_PER_KM) };
}

export function totalKm(runs: RunRecord[]): number {
  return runs.filter((r) => !r.rejectedReason).reduce((sum, r) => sum + r.distanceM, 0) / 1000;
}

export function isNeighborOfLand(world: World, index: number): boolean {
  const { size, tiles } = world;
  const r = Math.floor(index / size);
  const c = index % size;
  const neighbors = [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ];
  return neighbors.some(
    ([nr, nc]) => nr >= 0 && nc >= 0 && nr < size && nc < size && tiles[nr * size + nc].unlocked,
  );
}

/** Each new piece of land costs a bit more than the last. */
export function expansionCost(world: World): number {
  const unlocked = world.tiles.filter((t) => t.unlocked).length;
  return 15 + 5 * Math.max(0, unlocked - 9);
}

export type Level = { level: number; currentKm: number; nextKm: number | null };

const LEVEL_KM = [0, 5, 15, 30, 50, 80, 120, 170, 230, 300, 400, 500];

export function levelFor(km: number): Level {
  let level = 1;
  for (let i = 0; i < LEVEL_KM.length; i++) {
    if (km >= LEVEL_KM[i]) level = i + 1;
  }
  return { level, currentKm: LEVEL_KM[level - 1], nextKm: LEVEL_KM[level] ?? null };
}

/** Monday 00:00 of the week containing `time`. */
export function startOfWeek(time: number): number {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export type WeekStats = { start: number; km: number; runs: number };

/** Kilometres per week, oldest first, ending with the current week. */
export function weeklyStats(runs: RunRecord[], weeks: number, now = Date.now()): WeekStats[] {
  const result: WeekStats[] = [];
  const current = startOfWeek(now);
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(current);
    d.setDate(d.getDate() - 7 * i);
    result.push({ start: d.getTime(), km: 0, runs: 0 });
  }
  for (const run of runs) {
    if (run.rejectedReason) continue;
    const week = result.find((w) => w.start === startOfWeek(run.startedAt));
    if (!week) continue;
    week.km += run.distanceM / 1000;
    week.runs += 1;
  }
  return result;
}
