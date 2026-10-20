// Game rules: how running turns into energy and what energy can build.

import { newResidentsForRun, type CharacterId } from './characters';

export type WorldId = 'island' | 'city' | 'mountain';

export type WorldDef = { id: WorldId; name: string; glyph: string; unlockKm: number };

/** All worlds share one energy pool; new ones open up with total kilometres. */
export const WORLDS: WorldDef[] = [
  { id: 'island', name: 'Insel', glyph: '島', unlockKm: 0 },
  { id: 'city', name: 'Stadt', glyph: '町', unlockKm: 50 },
  { id: 'mountain', name: 'Berg', glyph: '山', unlockKm: 150 },
];

export const WORLD_BY_ID = Object.fromEntries(WORLDS.map((w) => [w.id, w])) as Record<WorldId, WorldDef>;

export const worldUnlocked = (id: WorldId, km: number) => km >= WORLD_BY_ID[id].unlockKm;

export type ShopItemId =
  // Island
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
  | 'castle'
  // City
  | 'road'
  | 'streettree'
  | 'vending'
  | 'house'
  | 'konbini'
  | 'ramen'
  | 'station'
  | 'tower'
  // Mountain
  | 'stairs'
  | 'snowpine'
  | 'jizo'
  | 'onsen'
  | 'temple';

/** Collectibles that can only be earned through weekly streaks. */
export type StreakItemId = 'bell' | 'koinobori' | 'zen' | 'cat' | 'fuji' | 'goldtorii' | 'goldpagoda';

export type ItemId = ShopItemId | StreakItemId;

export type ItemDef = {
  id: ItemId;
  name: string;
  cost: number;
  /** Total kilometres run before this item becomes available. */
  unlockKm: number;
  /** Which world it can be built in; collectibles fit everywhere. */
  world: WorldId | 'any';
  /** Set for collectibles: the streak length (in weeks) that awards one. */
  streakWeeks?: number;
};

export const ITEMS: ItemDef[] = [
  { id: 'path', name: 'Weg', cost: 2, unlockKm: 0, world: 'island' },
  { id: 'bamboo', name: 'Bambus', cost: 6, unlockKm: 0, world: 'island' },
  { id: 'sakura', name: 'Sakura', cost: 8, unlockKm: 0, world: 'island' },
  { id: 'lantern', name: 'Laterne', cost: 15, unlockKm: 1, world: 'island' },
  { id: 'pine', name: 'Kiefer', cost: 10, unlockKm: 2, world: 'island' },
  { id: 'rice', name: 'Reisfeld', cost: 15, unlockKm: 3, world: 'island' },
  { id: 'pond', name: 'Koi-Teich', cost: 25, unlockKm: 5, world: 'island' },
  { id: 'torii', name: 'Torii', cost: 40, unlockKm: 8, world: 'island' },
  { id: 'teahouse', name: 'Teehaus', cost: 60, unlockKm: 12, world: 'island' },
  { id: 'pagoda', name: 'Pagode', cost: 120, unlockKm: 25, world: 'island' },
  { id: 'castle', name: 'Burg', cost: 200, unlockKm: 42.2, world: 'island' },

  { id: 'road', name: 'Straße', cost: 3, unlockKm: 50, world: 'city' },
  { id: 'streettree', name: 'Allee-Baum', cost: 8, unlockKm: 50, world: 'city' },
  { id: 'vending', name: 'Automat', cost: 10, unlockKm: 52, world: 'city' },
  { id: 'house', name: 'Wohnhaus', cost: 40, unlockKm: 55, world: 'city' },
  { id: 'konbini', name: 'Konbini', cost: 60, unlockKm: 60, world: 'city' },
  { id: 'ramen', name: 'Ramen-Laden', cost: 70, unlockKm: 70, world: 'city' },
  { id: 'station', name: 'Bahnhof', cost: 150, unlockKm: 85, world: 'city' },
  { id: 'tower', name: 'Hochhaus', cost: 250, unlockKm: 110, world: 'city' },

  { id: 'stairs', name: 'Steintreppe', cost: 4, unlockKm: 150, world: 'mountain' },
  { id: 'snowpine', name: 'Schneekiefer', cost: 10, unlockKm: 150, world: 'mountain' },
  { id: 'jizo', name: 'Jizo', cost: 12, unlockKm: 155, world: 'mountain' },
  { id: 'onsen', name: 'Onsen', cost: 80, unlockKm: 165, world: 'mountain' },
  { id: 'temple', name: 'Bergtempel', cost: 200, unlockKm: 190, world: 'mountain' },
];

export const STREAK_ITEMS: ItemDef[] = [
  { id: 'bell', name: 'Glocke', cost: 0, unlockKm: 0, world: 'any', streakWeeks: 1 },
  { id: 'koinobori', name: 'Koinobori', cost: 0, unlockKm: 0, world: 'any', streakWeeks: 2 },
  { id: 'zen', name: 'Steingarten', cost: 0, unlockKm: 0, world: 'any', streakWeeks: 4 },
  { id: 'cat', name: 'Winkekatze', cost: 0, unlockKm: 0, world: 'any', streakWeeks: 8 },
  { id: 'fuji', name: 'Fuji', cost: 0, unlockKm: 0, world: 'any', streakWeeks: 12 },
  { id: 'goldtorii', name: 'Gold-Torii', cost: 0, unlockKm: 0, world: 'any', streakWeeks: 26 },
  { id: 'goldpagoda', name: 'Gold-Pagode', cost: 0, unlockKm: 0, world: 'any', streakWeeks: 52 },
];

/** Tiles residents can walk across; every other item is in the way. */
export const WALKABLE_ITEMS = new Set<ItemId>(['path', 'road', 'stairs']);

export const ITEM_BY_ID = Object.fromEntries([...ITEMS, ...STREAK_ITEMS].map((i) => [i.id, i])) as Record<ItemId, ItemDef>;

export const ENERGY_PER_KM = 10;
/** Runs faster than this on average are treated as not on foot (bike, car, GPS glitch). */
export const MAX_RUN_SPEED_KMH = 22;
export const REFUND_RATE = 0.5;

/** A week keeps the streak alive with this many runs of at least STREAK_MIN_KM. */
export const STREAK_RUNS_PER_WEEK = 2;
export const STREAK_MIN_KM = 1;
export const STREAK_BONUS_PER_WEEK = 0.1;
export const STREAK_BONUS_MAX = 0.5;

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
  /** Extra energy from the streak bonus, included in `energy`. */
  bonusEnergy?: number;
  route?: Route;
  /** Set when the run did not count, e.g. too fast to be on foot. */
  rejectedReason?: string;
};

export type GameState = {
  version: 4;
  energy: number;
  runs: RunRecord[];
  worlds: Record<WorldId, World>;
  /** The world shown on the world screen. */
  activeWorld: WorldId;
  /** Characters that moved in after their challenge was completed. */
  residents: CharacterId[];
  /** Collectibles earned but not yet placed. */
  inventory: Partial<Record<StreakItemId, number>>;
  /** Streak lengths whose reward has already been handed out. */
  claimedStreaks: number[];
  /** Last change made on this device; decides which world wins when syncing. */
  updatedAt?: number;
};

const WORLD_SIZE = 11;
const START_RADIUS = 1; // 3x3 starting island

const START_ITEM: Record<WorldId, ItemId> = { island: 'sakura', city: 'streettree', mountain: 'snowpine' };

export function createWorld(id: WorldId = 'island'): World {
  const mid = Math.floor(WORLD_SIZE / 2);
  const tiles: Tile[] = [];
  for (let r = 0; r < WORLD_SIZE; r++) {
    for (let c = 0; c < WORLD_SIZE; c++) {
      const unlocked = Math.abs(r - mid) <= START_RADIUS && Math.abs(c - mid) <= START_RADIUS;
      tiles.push({ unlocked, item: null });
    }
  }
  tiles[mid * WORLD_SIZE + mid].item = START_ITEM[id];
  return { size: WORLD_SIZE, tiles };
}

const createWorlds = (): Record<WorldId, World> => ({
  island: createWorld('island'),
  city: createWorld('city'),
  mountain: createWorld('mountain'),
});

export function createGame(): GameState {
  return {
    version: 4,
    energy: 0,
    runs: [],
    worlds: createWorlds(),
    activeWorld: 'island',
    residents: [],
    inventory: {},
    claimedStreaks: [],
  };
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

type SavedState = { version: number; energy: number; runs: RunRecord[]; world?: World } & Partial<
  Omit<GameState, 'version'>
>;

export function migrate(raw: SavedState): GameState {
  let state = raw;
  if (state.version === 1 && state.world) {
    let refund = 0;
    const tiles = state.world.tiles.map((t) => {
      if (!t.item) return t;
      const mapped = V1_ITEMS[t.item];
      if (!mapped?.id) refund += Math.floor((mapped?.cost ?? 0) * REFUND_RATE);
      return { ...t, item: mapped?.id ?? null };
    });
    state = { ...state, version: 2, energy: state.energy + refund, world: { ...state.world, tiles } };
  }
  if (state.version === 2) {
    // Streaks are new: don't hand out rewards retroactively for weeks before the update.
    const { weeks } = streakInfo(state.runs);
    const claimedStreaks = STREAK_ITEMS.map((i) => i.streakWeeks!).filter((w) => w <= weeks);
    state = { ...state, version: 3, inventory: {}, claimedStreaks };
  }
  if (state.version === 3) {
    // One island became several worlds; the existing island keeps everything that was built.
    const { world, ...rest } = state;
    state = { ...rest, version: 4, worlds: { ...createWorlds(), island: world ?? createWorld() }, activeWorld: 'island', residents: [] };
  }
  return state as GameState;
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

function weeksBefore(weekStart: number, n: number): number {
  const d = new Date(weekStart);
  d.setDate(d.getDate() - 7 * n);
  return d.getTime();
}

export type WeekStats = { start: number; km: number; runs: number };

/** Kilometres per week, oldest first, ending with the current week. */
export function weeklyStats(runs: RunRecord[], weeks: number, now = Date.now()): WeekStats[] {
  const result: WeekStats[] = [];
  const current = startOfWeek(now);
  for (let i = weeks - 1; i >= 0; i--) result.push({ start: weeksBefore(current, i), km: 0, runs: 0 });
  for (const run of runs) {
    if (run.rejectedReason) continue;
    const week = result.find((w) => w.start === startOfWeek(run.startedAt));
    if (!week) continue;
    week.km += run.distanceM / 1000;
    week.runs += 1;
  }
  return result;
}

export type StreakInfo = {
  /** Consecutive weeks reaching the goal; the current week counts once it is reached. */
  weeks: number;
  thisWeekRuns: number;
  thisWeekDone: boolean;
};

const countsForStreak = (r: RunRecord) => !r.rejectedReason && r.distanceM >= STREAK_MIN_KM * 1000;

export function streakInfo(runs: RunRecord[], now = Date.now()): StreakInfo {
  const perWeek = new Map<number, number>();
  for (const r of runs) {
    if (!countsForStreak(r) || r.startedAt > now) continue;
    const w = startOfWeek(r.startedAt);
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
  }
  const current = startOfWeek(now);
  const thisWeekRuns = perWeek.get(current) ?? 0;
  const thisWeekDone = thisWeekRuns >= STREAK_RUNS_PER_WEEK;

  // A week in progress doesn't break the streak yet, so start counting from last week if needed.
  let weeks = 0;
  let week = thisWeekDone ? current : weeksBefore(current, 1);
  while ((perWeek.get(week) ?? 0) >= STREAK_RUNS_PER_WEEK) {
    weeks++;
    week = weeksBefore(week, 1);
  }
  return { weeks, thisWeekRuns, thisWeekDone };
}

export function streakBonus(weeks: number): number {
  return Math.min(STREAK_BONUS_MAX, weeks * STREAK_BONUS_PER_WEEK);
}

export function nextStreakReward(weeks: number): ItemDef | null {
  return STREAK_ITEMS.find((i) => i.streakWeeks! > weeks) ?? null;
}

export type RunInput = Omit<RunRecord, 'id' | 'energy' | 'bonusEnergy' | 'rejectedReason'>;

export type RunOutcome = {
  state: GameState;
  record: RunRecord;
  /** Collectibles awarded by this run. */
  rewards: StreakItemId[];
  /** Characters whose challenge this run completed. */
  newResidents: CharacterId[];
  streak: StreakInfo;
};

/** Adds a finished run: energy with streak bonus, and any streak collectibles it unlocks. */
export function applyRun(state: GameState, run: RunInput): RunOutcome {
  const base = energyForRun(run.distanceM, run.durationS);
  // The bonus is based on the streak before this run, so one run can't boost itself.
  const before = streakInfo(state.runs, run.endedAt);
  const bonusEnergy = base.rejectedReason ? 0 : Math.round(base.energy * streakBonus(before.weeks));
  const record: RunRecord = {
    id: String(run.startedAt),
    ...run,
    energy: base.energy + bonusEnergy,
    bonusEnergy: bonusEnergy || undefined,
    rejectedReason: base.rejectedReason,
  };

  const withRun = claimStreakRewards({ ...state, energy: state.energy + record.energy, runs: [record, ...state.runs] }, run.endedAt);
  const newResidents = newResidentsForRun(withRun.state, record);
  const next = newResidents.length ? { ...withRun.state, residents: [...withRun.state.residents, ...newResidents] } : withRun.state;
  return { state: next, record, rewards: withRun.rewards, newResidents, streak: withRun.streak };
}

/** Hands out every streak collectible the runs have earned but that wasn't given yet. */
export function claimStreakRewards(state: GameState, now = Date.now()): { state: GameState; rewards: StreakItemId[]; streak: StreakInfo } {
  const streak = streakInfo(state.runs, now);
  const rewards = STREAK_ITEMS.filter((i) => i.streakWeeks! <= streak.weeks && !state.claimedStreaks.includes(i.streakWeeks!)).map(
    (i) => i.id as StreakItemId,
  );
  if (!rewards.length) return { state, rewards, streak };
  const inventory = { ...state.inventory };
  for (const id of rewards) inventory[id] = (inventory[id] ?? 0) + 1;
  return {
    state: { ...state, inventory, claimedStreaks: [...state.claimedStreaks, ...rewards.map((id) => ITEM_BY_ID[id].streakWeeks!)] },
    rewards,
    streak,
  };
}

/** Every tile index in a world that holds the given item. */
export function tilesWith(world: World, item: ItemId): number[] {
  const result: number[] = [];
  world.tiles.forEach((t, i) => {
    if (t.unlocked && t.item === item) result.push(i);
  });
  return result;
}
