// The developer playground: a separate save with everything unlocked, to look at all content.

import { CHARACTERS } from './characters';
import { applyRun, createGame, STREAK_ITEMS, type GameState, type ItemId, type StreakItemId, type WorldId } from './game';

const DAY = 86_400_000;

/** 5x5 showcase layouts around each world's centre; paths keep every building reachable. */
const LAYOUTS: Record<WorldId, (ItemId | null)[][]> = {
  island: [
    ['bamboo', 'pagoda', 'sakura', 'castle', 'pine'],
    ['torii', 'path', 'path', 'path', 'teahouse'],
    ['pond', 'path', 'bell', 'path', 'rice'],
    ['lantern', 'path', 'path', 'path', 'zen'],
    ['koinobori', 'sakura', 'cat', 'sakura', 'pine'],
  ],
  city: [
    ['tower', 'house', 'streettree', 'konbini', 'vending'],
    ['road', 'road', 'road', 'road', 'road'],
    ['streettree', 'house', 'road', 'streettree', 'station'],
    ['road', 'road', 'road', 'road', 'road'],
    ['house', 'vending', 'streettree', 'ramen', 'house'],
  ],
  mountain: [
    ['snowpine', 'temple', 'snowpine', 'jizo', 'snowpine'],
    ['stairs', 'stairs', 'stairs', 'stairs', 'stairs'],
    ['snowpine', 'stairs', 'onsen', 'stairs', 'jizo'],
    ['stairs', 'stairs', 'stairs', 'stairs', 'stairs'],
    ['fuji', 'jizo', 'snowpine', 'goldtorii', 'snowpine'],
  ],
};

export function createSandboxGame(now = Date.now()): GameState {
  let state = createGame();

  // Sixteen weeks of three runs each: enough kilometres for every world and a long streak.
  for (let week = 15; week >= 0; week--) {
    for (const [day, km, hour] of [[0, 5, 7], [2, 8, 18], [5, 12, 9]] as const) {
      const start = new Date(now - (week * 7 + (6 - day)) * DAY);
      start.setHours(hour, 0, 0, 0);
      if (start.getTime() > now) continue;
      const durationS = Math.round(km * 330); // 5:30 min/km
      state = applyRun(state, { startedAt: start.getTime(), endedAt: start.getTime() + durationS * 1000, distanceM: km * 1000, durationS }).state;
    }
  }

  for (const [id, layout] of Object.entries(LAYOUTS) as [WorldId, (ItemId | null)[][]][]) {
    const world = state.worlds[id];
    const mid = Math.floor(world.size / 2);
    const tiles = world.tiles.map((t, i) => {
      const r = Math.floor(i / world.size) - mid + 2;
      const c = (i % world.size) - mid + 2;
      if (r < 0 || c < 0 || r > 4 || c > 4) return t;
      return { unlocked: true, item: layout[r][c] };
    });
    state = { ...state, worlds: { ...state.worlds, [id]: { ...world, tiles } } };
  }

  const inventory: Partial<Record<StreakItemId, number>> = {};
  for (const item of STREAK_ITEMS) inventory[item.id as StreakItemId] = 3;

  return {
    ...state,
    energy: 99_999,
    residents: CHARACTERS.map((c) => c.id),
    inventory,
    claimedStreaks: STREAK_ITEMS.map((i) => i.streakWeeks!),
  };
}
