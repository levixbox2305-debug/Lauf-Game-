// Merging two copies of the game (this device and the cloud) without losing any run.

import { claimStreakRewards, STREAK_ITEMS, type GameState, type StreakItemId } from './game';

/**
 * Runs from both sides are always kept. For everything else (world, energy, inventory) the
 * copy changed most recently wins, and runs it doesn't know yet add their energy on top.
 */
export function mergeStates(local: GameState, remote: GameState): GameState {
  // A device that has never been used (e.g. a new phone) must not overwrite a real save.
  const localIsFresh = local.runs.length === 0 && !local.updatedAt;
  const remoteNewer = localIsFresh || (remote.updatedAt ?? 0) > (local.updatedAt ?? 0);
  const [newer, older] = remoteNewer ? [remote, local] : [local, remote];

  const known = new Set(newer.runs.map((r) => r.id));
  const missing = older.runs.filter((r) => !known.has(r.id));
  const runs = [...newer.runs, ...missing].sort((a, b) => b.startedAt - a.startedAt);
  const energy = newer.energy + missing.reduce((sum, r) => sum + r.energy, 0);

  // Collectibles the other copy already received stay earned, so they can't be awarded twice.
  const inventory = { ...newer.inventory };
  const claimed = new Set(newer.claimedStreaks);
  for (const weeks of older.claimedStreaks) {
    if (claimed.has(weeks)) continue;
    claimed.add(weeks);
    const item = STREAK_ITEMS.find((i) => i.streakWeeks === weeks);
    if (item) inventory[item.id as StreakItemId] = (inventory[item.id as StreakItemId] ?? 0) + 1;
  }

  const merged: GameState = {
    ...newer,
    runs,
    energy,
    inventory,
    claimedStreaks: [...claimed].sort((a, b) => a - b),
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0) || undefined,
  };
  // Runs from two devices together can complete a streak week neither had alone.
  return claimStreakRewards(merged).state;
}

/** Compares saves by content; used to skip uploads and re-renders that would change nothing. */
export function sameState(a: GameState, b: GameState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
