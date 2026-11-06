/** Player movement on the tile grid, Pokémon-style: tap to turn, hold to walk. */
import type { CategoryId } from './data';
import { DIRS, START, type Dir } from './map';
import { createWorld, isBlocked, NPC_STEP_MS, tickWorld, type Npc, type World } from './world';

export type Player = {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  movedAt: number;
  turnedAt: number;
  stepMs: number;
  dir: Dir;
  steps: number;
  carry: CategoryId[];
};

export type Engine = {
  world: World;
  player: Player;
  held: Dir | null;
  running: boolean;
  /** While a dialog or menu is open the store keeps living, but the player stands still. */
  frozen: boolean;
  fast: boolean;
  last: number;
  rand: () => number;
};

export const WALK_MS = 210;
const TURN_DELAY_MS = 90;

export function createPlayer(x: number, y: number, dir: Dir): Player {
  return { x, y, fromX: x, fromY: y, movedAt: 0, turnedAt: 0, stepMs: WALK_MS, dir, steps: 0, carry: [] };
}

export const isMoving = (p: Player, now: number) => now - p.movedAt < p.stepMs;

/** Advances the game by one frame. Returns true when the player finished a step. */
export function update(engine: Engine, now: number): { stepped: boolean } {
  const dt = Math.min(0.25, (now - (engine.last || now)) / 1000);
  engine.last = now;
  tickWorld(engine.world, now, dt, engine.rand, engine.player);

  const p = engine.player;
  if (engine.frozen || !engine.held || isMoving(p, now)) return { stepped: false };
  const dir = engine.held;
  if (p.dir !== dir) {
    p.dir = dir;
    // Coming from a walk, change direction straight away; from standing, a tap only turns.
    p.turnedAt = now - p.movedAt < p.stepMs + 50 ? 0 : now;
    return { stepped: false };
  }
  if (now - p.turnedAt < TURN_DELAY_MS) return { stepped: false };
  const tx = p.x + DIRS[dir].dx;
  const ty = p.y + DIRS[dir].dy;
  if (isBlocked(engine.world, tx, ty, { x: -1, y: -1 })) return { stepped: false };
  p.fromX = p.x;
  p.fromY = p.y;
  p.x = tx;
  p.y = ty;
  p.movedAt = now;
  p.stepMs = Math.round((engine.fast ? 160 : WALK_MS) * (engine.running ? 0.62 : 1));
  p.steps++;
  return { stepped: true };
}

/** Where someone is drawn right now, between the last tile and the current one. */
export function drawPos(o: { x: number; y: number; fromX: number; fromY: number; movedAt: number }, stepMs: number, now: number) {
  const t = Math.min(1, Math.max(0, (now - o.movedAt) / stepMs));
  return { x: o.fromX + (o.x - o.fromX) * t, y: o.fromY + (o.y - o.fromY) * t, moving: t < 1 };
}

export const npcPos = (n: Npc, now: number) => drawPos(n, NPC_STEP_MS, now);

export function facing(p: Player) {
  return { x: p.x + DIRS[p.dir].dx, y: p.y + DIRS[p.dir].dy };
}

let shared: Engine | null = null;

/**
 * The one running store. It lives outside React so the market keeps going between tab switches,
 * and so the game loop can mutate it every frame without re-rendering the whole screen.
 */
export function getEngine(): Engine {
  if (!shared) {
    const player = createPlayer(START.x, START.y, START.dir);
    shared = {
      world: createWorld(Date.now(), Math.random, player),
      player,
      held: null,
      running: false,
      frozen: false,
      fast: false,
      last: 0,
      rand: Math.random,
    };
  }
  return shared;
}
