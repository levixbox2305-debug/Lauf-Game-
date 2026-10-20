// Game rules: how running turns into energy and what energy can build.

export type ItemId =
  | 'flowers'
  | 'tree'
  | 'pine'
  | 'tent'
  | 'farm'
  | 'sheep'
  | 'house'
  | 'fountain'
  | 'mountain'
  | 'cottage'
  | 'church'
  | 'castle';

export type ItemDef = {
  id: ItemId;
  name: string;
  emoji: string;
  cost: number;
  /** Total kilometres run before this item becomes available. */
  unlockKm: number;
};

export const ITEMS: ItemDef[] = [
  { id: 'flowers', name: 'Blumen', emoji: '🌷', cost: 3, unlockKm: 0 },
  { id: 'tree', name: 'Baum', emoji: '🌳', cost: 5, unlockKm: 0 },
  { id: 'tent', name: 'Zelt', emoji: '⛺', cost: 10, unlockKm: 0 },
  { id: 'pine', name: 'Tanne', emoji: '🌲', cost: 6, unlockKm: 1 },
  { id: 'farm', name: 'Feld', emoji: '🌾', cost: 15, unlockKm: 2 },
  { id: 'sheep', name: 'Schaf', emoji: '🐑', cost: 12, unlockKm: 3 },
  { id: 'house', name: 'Haus', emoji: '🏠', cost: 30, unlockKm: 5 },
  { id: 'fountain', name: 'Brunnen', emoji: '⛲', cost: 25, unlockKm: 8 },
  { id: 'cottage', name: 'Hof', emoji: '🏡', cost: 50, unlockKm: 12 },
  { id: 'mountain', name: 'Berg', emoji: '⛰️', cost: 40, unlockKm: 15 },
  { id: 'church', name: 'Kirche', emoji: '⛪', cost: 120, unlockKm: 25 },
  { id: 'castle', name: 'Burg', emoji: '🏰', cost: 200, unlockKm: 42.2 },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<ItemId, ItemDef>;

export const ENERGY_PER_KM = 10;
/** Runs faster than this on average are treated as not on foot (bike, car, GPS glitch). */
export const MAX_RUN_SPEED_KMH = 22;
export const REFUND_RATE = 0.5;

export type Tile = { unlocked: boolean; item: ItemId | null };
export type World = { size: number; tiles: Tile[] };

export type RunRecord = {
  id: string;
  startedAt: number;
  endedAt: number;
  distanceM: number;
  durationS: number;
  energy: number;
  /** Set when the run did not count, e.g. too fast to be on foot. */
  rejectedReason?: string;
};

export type GameState = {
  version: 1;
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
  tiles[mid * WORLD_SIZE + mid].item = 'tent';
  return { size: WORLD_SIZE, tiles };
}

export function createGame(): GameState {
  return { version: 1, energy: 0, runs: [], world: createWorld() };
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
