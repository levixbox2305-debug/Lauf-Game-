// Daily life of the residents: where they want to be at this time of day and how they get there.

import { CHARACTER_BY_ID, type CharacterDef, type CharacterId } from '../lib/characters';
import { WALKABLE_ITEMS, type ItemId, type World, type WorldId } from '../lib/game';

export type Phase = 'home' | 'stroll' | 'work' | 'social';

export type Walker = {
  id: CharacterId;
  /** Position in tile units; a tile's centre is at (c + 0.5, r + 0.5). */
  x: number;
  y: number;
  /** Remaining tiles to walk through, as tile indices. */
  path: number[];
  phase: Phase;
  /** Simulation time (ms) until which the walker stays put once arrived. */
  until: number;
  /** False while sleeping indoors. */
  visible: boolean;
  /** Building tile the walker sleeps in, for the z-z-z above its roof. */
  sleepTile?: number;
  /** Walking animation frame. */
  frame: 0 | 1;
  doing: string;
};

/** Places people like to meet in each world. */
const SOCIAL: Record<WorldId, ItemId[]> = {
  island: ['teahouse', 'pond', 'torii', 'sakura', 'bell', 'zen', 'koinobori'],
  city: ['ramen', 'konbini', 'vending', 'streettree', 'station'],
  mountain: ['onsen', 'jizo', 'temple', 'bell'],
};

const SPEED_TILES_PER_S = 1.1;

export function phaseAt(def: CharacterDef, hour: number): Phase {
  if (def.nocturnal) {
    if (hour >= 20 || hour < 5) return 'work';
    if (hour < 8) return 'social';
    return 'home';
  }
  if (hour >= 22 || hour < 6) return 'home';
  if (hour < 9) return 'stroll';
  if (hour < 17) return 'work';
  return 'social';
}

const isWalkable = (world: World, i: number) => {
  const t = world.tiles[i];
  return !!t?.unlocked && (t.item === null || WALKABLE_ITEMS.has(t.item));
};

function neighbors(world: World, i: number): number[] {
  const { size } = world;
  const r = Math.floor(i / size);
  const c = i % size;
  const result: number[] = [];
  if (r > 0) result.push(i - size);
  if (r < size - 1) result.push(i + size);
  if (c > 0) result.push(i - 1);
  if (c < size - 1) result.push(i + 1);
  return result;
}

/** Walkable tiles next to (or on) any tile holding one of these items. */
export function spotsNear(world: World, items: ItemId[]): number[] {
  const spots = new Set<number>();
  world.tiles.forEach((t, i) => {
    if (!t.unlocked || !t.item || !items.includes(t.item)) return;
    if (isWalkable(world, i)) spots.add(i);
    for (const n of neighbors(world, i)) if (isWalkable(world, n)) spots.add(n);
  });
  return [...spots];
}

/** Shortest walkable route from `from` to the nearest target, excluding the start tile. */
export function findPath(world: World, from: number, targets: number[]): number[] | null {
  const goal = new Set(targets);
  if (goal.has(from)) return [];
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of neighbors(world, cur)) {
      if (prev.has(n) || !isWalkable(world, n)) continue;
      prev.set(n, cur);
      if (goal.has(n)) {
        const path = [n];
        for (let p = cur; p !== from; p = prev.get(p)!) path.unshift(p);
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

const tileOf = (world: World, w: Walker) => Math.floor(w.y) * world.size + Math.floor(w.x);

export function spawnWalker(world: World, id: CharacterId, rand: () => number): Walker | null {
  const def = CHARACTER_BY_ID[id];
  const start = spotsNear(world, [def.home]);
  const fallback = world.tiles.map((_, i) => i).filter((i) => isWalkable(world, i));
  const pool = start.length ? start : fallback;
  if (!pool.length) return null;
  const i = pool[Math.floor(rand() * pool.length)];
  return {
    id,
    x: (i % world.size) + 0.5,
    y: Math.floor(i / world.size) + 0.5,
    path: [],
    phase: 'stroll',
    until: 0,
    visible: true,
    frame: 0,
    doing: def.doing.stroll,
  };
}

/** A random walkable tile within `radius` steps of one of the spots, so people potter about nearby. */
function wanderAround(world: World, spots: number[], radius: number, rand: () => number): number[] {
  if (!spots.length) return [];
  const center = spots[Math.floor(rand() * spots.length)];
  const cr = Math.floor(center / world.size);
  const cc = center % world.size;
  const near = world.tiles
    .map((_, i) => i)
    .filter((i) => isWalkable(world, i) && Math.abs(Math.floor(i / world.size) - cr) + Math.abs((i % world.size) - cc) <= radius);
  return near.length ? [near[Math.floor(rand() * near.length)]] : [center];
}

function pickGoal(world: World, worldId: WorldId, def: CharacterDef, phase: Phase, rand: () => number): number[] {
  const all = world.tiles.map((_, i) => i).filter((i) => isWalkable(world, i));
  const random = () => (all.length ? [all[Math.floor(rand() * all.length)]] : []);
  // Most of the time they head for their spot; otherwise they wander around it, so nobody stands still for long.
  const atOrAround = (spots: number[]) => (rand() < 0.6 ? spots : wanderAround(world, spots, 2, rand));
  switch (phase) {
    case 'home':
      return spotsNear(world, [def.home]);
    case 'work': {
      const spots = spotsNear(world, def.work);
      return atOrAround(spots.length ? spots : spotsNear(world, [def.home]));
    }
    case 'social': {
      const spots = spotsNear(world, SOCIAL[worldId]);
      // Pick one meeting place so people gather instead of spreading out.
      return spots.length ? atOrAround([spots[Math.floor(rand() * spots.length)]]) : random();
    }
    case 'stroll':
      return random();
  }
}

/** Short stops during the day keep everyone moving; home is the night's sleep. */
const STAY_MS: Record<Phase, [number, number]> = {
  home: [60_000, 90_000],
  work: [700, 2_200],
  social: [700, 1_800],
  stroll: [300, 900],
};

/** The tile of the nearest building of this type, where a sleeping walker is tucked in. */
function nearestItemTile(world: World, from: number, item: ItemId): number | undefined {
  const fr = Math.floor(from / world.size);
  const fc = from % world.size;
  let best: number | undefined;
  let bestDist = Infinity;
  world.tiles.forEach((t, i) => {
    if (!t.unlocked || t.item !== item) return;
    const d = Math.abs(Math.floor(i / world.size) - fr) + Math.abs((i % world.size) - fc);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/** Advances one walker by `dt` seconds. Returns a new object; the input stays untouched. */
export function stepWalker(
  w: Walker,
  world: World,
  worldId: WorldId,
  hour: number,
  now: number,
  dt: number,
  rand: () => number,
): Walker {
  const def = CHARACTER_BY_ID[w.id];
  const next = { ...w, path: w.path.slice() };

  if (next.path.length) {
    next.visible = true;
    let budget = SPEED_TILES_PER_S * dt;
    while (budget > 0 && next.path.length) {
      const target = next.path[0];
      const tx = (target % world.size) + 0.5;
      const ty = Math.floor(target / world.size) + 0.5;
      const dist = Math.hypot(tx - next.x, ty - next.y);
      if (dist <= budget) {
        next.x = tx;
        next.y = ty;
        next.path.shift();
        budget -= dist;
      } else {
        next.x += ((tx - next.x) / dist) * budget;
        next.y += ((ty - next.y) / dist) * budget;
        budget = 0;
      }
    }
    next.frame = (Math.floor(now / 250) % 2) as 0 | 1;
    if (!next.path.length) {
      const [min, max] = STAY_MS[next.phase];
      next.until = now + min + rand() * (max - min);
      next.frame = 0;
      next.visible = next.phase !== 'home';
      next.sleepTile = next.phase === 'home' ? nearestItemTile(world, tileOf(world, next), def.home) : undefined;
      next.doing = next.phase === 'home' ? (def.nocturnal ? 'schläft tagsüber' : 'schläft') : def.doing[next.phase];
    }
    return next;
  }

  const phase = phaseAt(def, hour);
  // Stay put until the visit is over, unless the time of day has moved on.
  if (now < next.until && phase === next.phase) return next;

  const here = tileOf(world, next);
  let targets = pickGoal(world, worldId, def, phase, rand);
  // Always go somewhere new during the day; picking the tile you're on means standing still again.
  if (phase !== 'home') {
    const elsewhere = targets.filter((t) => t !== here);
    targets = elsewhere.length ? elsewhere : wanderAround(world, [here], 2, rand).filter((t) => t !== here);
  }
  const route = targets.length ? findPath(world, here, targets) : null;
  next.phase = phase;
  if (route && route.length) {
    next.path = route;
    next.visible = true;
    next.sleepTile = undefined;
    next.doing = phase === 'home' ? 'geht nach Hause' : phase === 'work' ? 'ist auf dem Weg zur Arbeit' : 'ist unterwegs';
  } else {
    // Already there, or no way there: just spend some time here.
    const [min, max] = STAY_MS[phase];
    next.until = now + min + rand() * (max - min);
    next.visible = phase !== 'home';
    next.sleepTile = phase === 'home' ? nearestItemTile(world, tileOf(world, next), def.home) : undefined;
    next.doing = phase === 'home' ? 'schläft' : def.doing[phase];
  }
  return next;
}
