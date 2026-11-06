/**
 * The living store: shelves that empty, spills, customers with questions, queues at the checkouts.
 * This state isn't saved – the store simply carries on whenever the game is opened.
 * The world is mutated in place by the game loop; `version` changes whenever the map needs redrawing.
 */
import { CATEGORIES, CATEGORY_IDS, isShelf, type CategoryId } from './data';
import { CHECKOUTS, DIRS, index, isSalesFloor, isWalkable, MAP, MAP_H, MAP_W, posOf, queueSpot, STAFF, type Dir, type Pos } from './map';

export type Look = { skin: string; hair: string; shirt: string; pants: string };

export type Npc = {
  id: string;
  kind: 'walker' | 'asker' | 'queue';
  x: number;
  y: number;
  /** Where the last step started, for drawing the move. */
  fromX: number;
  fromY: number;
  movedAt: number;
  dir: Dir;
  look: Look;
  /** Next time this NPC may move. */
  nextMove: number;
  /** Checkout this customer is queueing at. */
  checkout?: number;
};

export type World = {
  empty: Set<number>;
  spills: Set<number>;
  npcs: Npc[];
  /** Fill level of the bottle return machine, 0–100. */
  pfand: number;
  /** Shelf tile with expired goods, if any. */
  mhd: number | null;
  version: number;
  nextId: number;
};

export const NPC_STEP_MS = 320;
const SKINS = ['#F5D0B0', '#E8B48F', '#C98E66', '#8D5A3B', '#F1C7A3'];
const HAIRS = ['#3B2A20', '#6B4423', '#D9B55A', '#1E1E24', '#A0522D', '#B8B8B8', '#C0392B'];
const SHIRTS = ['#4A7DC9', '#E0A030', '#5BA05B', '#8E5BB5', '#D05A7A', '#3A9B9B', '#E06A3A', '#6D6D6D'];
const PANTS = ['#2F3B5C', '#4B3A2A', '#3A3A3A', '#5C6B7A'];

const pick = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length)];

export const randomLook = (rand: () => number): Look => ({ skin: pick(SKINS, rand), hair: pick(HAIRS, rand), shirt: pick(SHIRTS, rand), pants: pick(PANTS, rand) });

export const SHELVES: number[] = MAP.flatMap((row, y) => [...row].flatMap((ch, x) => (isShelf(ch) ? [index(x, y)] : [])));
const COLD_SHELVES = SHELVES.filter((i) => 'kt'.includes(MAP[Math.floor(i / MAP_W)][i % MAP_W]));
const FLOOR: number[] = [];
for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (isSalesFloor(x, y)) FLOOR.push(index(x, y));

export const categoryAt = (i: number): CategoryId | null => {
  const { x, y } = posOf(i);
  const ch = MAP[y]?.[x] ?? '#';
  return isShelf(ch) ? ch : null;
};

export function npcAt(world: World, x: number, y: number): Npc | undefined {
  return world.npcs.find((n) => n.x === x && n.y === y);
}

export function isBlocked(world: World, x: number, y: number, player: Pos): boolean {
  if (!isWalkable(x, y)) return true;
  if (player.x === x && player.y === y) return true;
  if (STAFF.some((s) => s.x === x && s.y === y)) return true;
  return !!npcAt(world, x, y);
}

/** Queue spots stay free for queueing customers; nobody else stands there. */
const isQueueSpot = (x: number, y: number) => CHECKOUTS.some((_, k) => queueSpot(k).x === x && queueSpot(k).y === y);

function freeFloor(world: World, player: Pos, rand: () => number): Pos | null {
  for (let tries = 0; tries < 30; tries++) {
    const p = posOf(pick(FLOOR, rand));
    // Keep clear of the player and the doors, so nobody appears right in front of them.
    if (Math.abs(p.x - player.x) + Math.abs(p.y - player.y) < 3) continue;
    if (p.y >= 20 || isQueueSpot(p.x, p.y) || isBlocked(world, p.x, p.y, player)) continue;
    return p;
  }
  return null;
}

function spawn(world: World, kind: Npc['kind'], p: Pos, now: number, rand: () => number, checkout?: number): Npc {
  const npc: Npc = {
    id: `n${world.nextId++}`, kind, x: p.x, y: p.y, fromX: p.x, fromY: p.y, movedAt: 0,
    dir: kind === 'queue' ? 'up' : pick(['up', 'down', 'left', 'right'] as const, rand), look: randomLook(rand),
    nextMove: now + 500 + rand() * 1500, checkout,
  };
  world.npcs.push(npc);
  return npc;
}

export function createWorld(now: number, rand: () => number, player: Pos): World {
  const world: World = { empty: new Set(), spills: new Set(), npcs: [], pfand: 70, mhd: null, version: 0, nextId: 1 };
  while (world.empty.size < 6) world.empty.add(pick(SHELVES, rand));
  for (let i = 0; i < 4; i++) {
    const p = freeFloor(world, player, rand);
    if (p) spawn(world, 'walker', p, now, rand);
  }
  const asker = freeFloor(world, player, rand);
  if (asker) spawn(world, 'asker', asker, now, rand);
  const spill = freeFloor(world, player, rand);
  if (spill) world.spills.add(index(spill.x, spill.y));
  spawnQueue(world, 1, now, rand, player);
  return world;
}

function spawnQueue(world: World, k: number, now: number, rand: () => number, player: Pos) {
  const spot = queueSpot(k);
  if (world.npcs.some((n) => n.checkout === k) || isBlocked(world, spot.x, spot.y, player)) return;
  spawn(world, 'queue', spot, now, rand, k);
}

/** Advances the store by `dt` seconds. Returns true if anything visible changed. */
export function tickWorld(world: World, now: number, dt: number, rand: () => number, player: Pos): boolean {
  let changed = false;
  const chance = (perSecond: number) => rand() < perSecond * dt;

  if (world.empty.size < 10 && chance(0.09)) {
    const i = pick(SHELVES, rand);
    if (i !== world.mhd && !world.empty.has(i)) {
      world.empty.add(i);
      changed = true;
    }
  }
  if (world.spills.size < 3 && chance(0.02)) {
    const p = freeFloor(world, player, rand);
    if (p) {
      world.spills.add(index(p.x, p.y));
      changed = true;
    }
  }
  if (world.npcs.filter((n) => n.kind === 'asker').length < 2 && chance(0.03)) {
    const p = freeFloor(world, player, rand);
    if (p) {
      spawn(world, 'asker', p, now, rand);
      changed = true;
    }
  }
  CHECKOUTS.forEach((_, k) => {
    if (chance(0.015)) spawnQueue(world, k, now, rand, player);
  });
  if (world.mhd === null && chance(0.012)) {
    const i = pick(COLD_SHELVES, rand);
    if (!world.empty.has(i)) {
      world.mhd = i;
      changed = true;
    }
  }
  const pfand = Math.min(100, world.pfand + dt * 0.9);
  if (Math.floor(pfand / 10) !== Math.floor(world.pfand / 10)) changed = true;
  world.pfand = pfand;

  // Shoppers stroll around; customers with a question only look around.
  for (const npc of world.npcs) {
    if (npc.kind === 'queue' || now < npc.nextMove) continue;
    npc.nextMove = now + (npc.kind === 'walker' ? 700 + rand() * 1600 : 1500 + rand() * 2500);
    const dir = pick(['up', 'down', 'left', 'right'] as const, rand);
    npc.dir = dir;
    if (npc.kind !== 'walker') continue;
    const tx = npc.x + DIRS[dir].dx;
    const ty = npc.y + DIRS[dir].dy;
    if (!isSalesFloor(tx, ty) || ty >= 20 || isQueueSpot(tx, ty) || isBlocked(world, tx, ty, player)) continue;
    npc.fromX = npc.x;
    npc.fromY = npc.y;
    npc.x = tx;
    npc.y = ty;
    npc.movedAt = now;
  }
  if (changed) world.version++;
  return changed;
}

export const removeNpc = (world: World, id: string) => {
  world.npcs = world.npcs.filter((n) => n.id !== id);
  world.version++;
};

// ---------------------------------------------------------------------------------------------
// Encounters: the little puzzles behind checkout, questions and best-before checks
// ---------------------------------------------------------------------------------------------

export const euro = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

export type Checkout = { items: { name: string; cents: number }[]; total: number; paid: number; options: number[]; answer: number };

export function makeCheckout(rand: () => number): Checkout {
  const count = 2 + Math.floor(rand() * 3);
  const items = Array.from({ length: count }, () => {
    const c = pick(CATEGORY_IDS, rand);
    return { name: pick(CATEGORIES[c].products, rand), cents: (Math.floor(rand() * 45) + 4) * 10 + 9 };
  });
  const total = items.reduce((s, i) => s + i.cents, 0);
  const paid = [500, 1000, 2000, 5000].find((n) => n > total) ?? 10000;
  const answer = paid - total;
  const wrong = new Set<number>();
  for (const d of shuffle([10, -10, 100, -100, 50, -50, 20, -20], rand)) {
    if (wrong.size === 3) break;
    if (answer + d > 0) wrong.add(answer + d);
  }
  return { items, total, paid, options: shuffle([answer, ...wrong], rand), answer };
}

export type Question = { product: string; category: CategoryId; options: CategoryId[] };

export function makeQuestion(rand: () => number): Question {
  const category = pick(CATEGORY_IDS, rand);
  const others = shuffle(CATEGORY_IDS.filter((c) => c !== category), rand).slice(0, 3);
  return { product: pick(CATEGORIES[category].products, rand), category, options: shuffle([category, ...others], rand) };
}

export type BestBefore = { items: { name: string; date: string }[]; answer: number; today: string };

const shortDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;

export function makeBestBefore(rand: () => number, now: number, category: CategoryId): BestBefore {
  const names = shuffle(CATEGORIES[category].products, rand).slice(0, 4);
  const answer = Math.floor(rand() * names.length);
  const day = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return shortDate(d);
  };
  return {
    items: names.map((name, i) => ({ name, date: day(i === answer ? -(1 + Math.floor(rand() * 4)) : Math.floor(rand() * 12)) })),
    answer,
    today: shortDate(new Date(now)),
  };
}

function shuffle<T>(list: T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
