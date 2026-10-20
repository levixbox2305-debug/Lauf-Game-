import type { ItemId, World } from '../lib/game';
import { hash, pick, VoxelGrid } from './voxels';

/** One world tile is TILE x TILE voxels; the grass surface sits at z = GROUND - 1. */
export const TILE = 8;
export const GROUND = 4;
export const WATER_Z = 0;

const C = {
  grass: ['#7FAE45', '#73A13D', '#8BBA4E', '#6A9638'],
  dirt: ['#8A5A3B', '#7A4E33', '#94643F'],
  stone: ['#9C9C95', '#8B8C86', '#A9A8A0'],
  water: ['#3E7FA8', '#4A8DB5', '#3A779E'],
  foam: '#BFE0EE',
  sakura: ['#F7C6D0', '#F1A7B9', '#E98FA6', '#FBDDE3'],
  bark: '#5B3A26',
  darkBark: '#4A3020',
  red: '#C8392B',
  ink: '#2A2626',
  roof: ['#3B3F4A', '#454A56'],
  wood: '#8B5A2B',
  plaster: '#EDE6D6',
  gold: '#D9A84A',
  light: '#F5D27A',
  bamboo: ['#86AE3E', '#7AA236', '#93BB48'],
  bambooNode: '#5E8429',
  pine: ['#3F6B36', '#4A7A3E', '#365E2F'],
  path: ['#CFC3A6', '#C2B594', '#D8CDB3'],
  paddy: '#6FA0A8',
  rice: '#A4C94E',
  koi: '#F08A24',
  koiWhite: '#F6F1E7',
};

const G = GROUND;
type Model = (v: VoxelGrid, ox: number, oy: number) => void;

const sakura: Model = (v, ox, oy) => {
  for (let z = G; z < G + 6; z++) {
    for (const [a, b] of [[3, 3], [4, 3], [3, 4], [4, 4]]) v.set(ox + a, oy + b, z, C.bark);
  }
  v.set(ox + 5, oy + 4, G + 5, C.bark);
  v.set(ox + 2, oy + 3, G + 6, C.bark);
  for (let x = -1; x <= 8; x++) {
    for (let y = -1; y <= 8; y++) {
      for (let z = G + 6; z < G + 12; z++) {
        const d = Math.hypot((x - 3.5) / 1.1, (y - 3.5) / 1.1, (z - (G + 8.5)) / 0.85);
        if (d < 3.9 && hash(x + ox, y + oy, z) > 0.12) v.set(ox + x, oy + y, z, pick(C.sakura, x + ox, y + oy, z));
      }
    }
  }
  // Fallen petals on the grass.
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash(i, ox, 1) * TILE);
    const y = Math.floor(hash(i, oy, 2) * TILE);
    if (v.has(ox + x, oy + y, G - 1)) v.set(ox + x, oy + y, G - 1, pick(C.sakura, x, y, i));
  }
};

const torii: Model = (v, ox, oy) => {
  for (let z = G; z < G + 9; z++) {
    v.set(ox + 1, oy + 4, z, C.red);
    v.set(ox + 6, oy + 4, z, C.red);
  }
  for (let x = 0; x <= 7; x++) {
    v.set(ox + x, oy + 4, G + 7, C.red);
    v.set(ox + x, oy + 4, G + 9, C.red);
  }
  for (let x = -1; x <= 8; x++) v.set(ox + x, oy + 4, G + 10, C.ink);
  v.set(ox - 1, oy + 4, G + 11, C.ink);
  v.set(ox + 8, oy + 4, G + 11, C.ink);
  v.set(ox + 1, oy + 4, G, C.ink);
  v.set(ox + 6, oy + 4, G, C.ink);
};

const lantern: Model = (v, ox, oy) => {
  for (let x = 2; x <= 4; x++) {
    for (let y = 2; y <= 4; y++) {
      v.set(ox + x, oy + y, G, pick(C.stone, x, y, 1));
      v.set(ox + x, oy + y, G + 4, x === 3 && y === 3 ? C.light : pick(C.stone, x, y, 4));
      v.set(ox + x, oy + y, G + 5, pick(C.stone, x, y, 5));
    }
  }
  v.set(ox + 3, oy + 4, G + 4, C.light);
  v.set(ox + 4, oy + 3, G + 4, C.light);
  for (let z = G + 1; z < G + 4; z++) v.set(ox + 3, oy + 3, z, C.stone[1]);
  for (let x = 1; x <= 5; x++) for (let y = 1; y <= 5; y++) v.set(ox + x, oy + y, G + 6, C.stone[1]);
  v.set(ox + 3, oy + 3, G + 7, C.stone[0]);
  v.set(ox + 3, oy + 3, G + 8, C.stone[2]);
};

const bamboo: Model = (v, ox, oy) => {
  for (const [x, y, h] of [[1, 1, 12], [3, 2, 15], [5, 1, 11], [2, 5, 13], [6, 4, 14], [4, 6, 10]]) {
    for (let z = G; z < G + h; z++) v.set(ox + x, oy + y, z, (z - G) % 4 === 3 ? C.bambooNode : pick(C.bamboo, x, y, z));
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0]]) {
      if (hash(x, y, dx * 3 + dy) > 0.3) v.set(ox + x + dx, oy + y + dy, G + h - 1, pick(C.bamboo, x, dy, h));
    }
  }
};

const pine: Model = (v, ox, oy) => {
  for (let z = G; z < G + 7; z++) v.set(ox + 3 + (z > G + 4 ? 1 : 0), oy + 3, z, C.bark);
  for (const [cx, cy, cz, r] of [[2, 3, G + 5, 2.6], [5, 4, G + 7, 2.3], [3, 3, G + 9, 2.0]]) {
    for (let x = -3; x <= 3; x++) {
      for (let y = -3; y <= 3; y++) {
        const d = Math.hypot(x, y);
        if (d >= r) continue;
        v.set(ox + cx + x, oy + cy + y, cz, pick(C.pine, x, y, cz));
        if (d < r - 1) v.set(ox + cx + x, oy + cy + y, cz + 1, pick(C.pine, y, x, cz));
      }
    }
  }
};

const path: Model = (v, ox, oy) => {
  for (let x = 0; x < TILE; x++) {
    for (let y = 0; y < TILE; y++) v.set(ox + x, oy + y, G - 1, pick(C.path, ox + x, oy + y, 3));
  }
  for (const [x, y] of [[1, 2], [5, 5], [3, 6], [6, 1]]) v.set(ox + x, oy + y, G - 1, C.stone[1]);
};

const pond: Model = (v, ox, oy) => {
  for (let x = 1; x < 7; x++) {
    for (let y = 1; y < 7; y++) {
      if ((x === 1 || x === 6) && (y === 1 || y === 6)) continue;
      v.delete(ox + x, oy + y, G - 1);
      v.set(ox + x, oy + y, G - 2, pick(C.water, x, y, 9));
    }
  }
  v.set(ox + 3, oy + 3, G - 2, C.koi);
  v.set(ox + 4, oy + 3, G - 2, C.koiWhite);
  v.set(ox + 4, oy + 5, G - 2, C.koi);
  v.set(ox + 5, oy + 5, G - 2, C.koi);
  for (const [x, y] of [[0, 2], [0, 5], [7, 3], [2, 7], [5, 0]]) v.set(ox + x, oy + y, G, pick(C.stone, x, y, 0));
};

const rice: Model = (v, ox, oy) => {
  for (let x = 1; x < 7; x++) {
    for (let y = 1; y < 7; y++) {
      v.delete(ox + x, oy + y, G - 1);
      v.set(ox + x, oy + y, G - 2, C.paddy);
      if (x % 2 === 1 && y % 2 === 0) v.set(ox + x, oy + y, G - 1, C.rice);
    }
  }
};

const teahouse: Model = (v, ox, oy) => {
  for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) v.set(ox + x, oy + y, G, C.wood);
  for (let z = G + 1; z < G + 5; z++) {
    for (let x = 1; x <= 6; x++) {
      for (let y = 1; y <= 6; y++) {
        if (x > 1 && x < 6 && y > 1 && y < 6) continue;
        const post = (x === 1 || x === 6) && (y === 1 || y === 6);
        const window = z === G + 2 && (x === 6 || y === 6) && (x + y) % 2 === 1;
        v.set(ox + x, oy + y, z, post ? C.darkBark : window ? C.light : C.plaster);
      }
    }
  }
  for (let s = 0; s < 4; s++) {
    for (let x = s; x <= 7 - s; x++) for (let y = s; y <= 7 - s; y++) v.set(ox + x, oy + y, G + 5 + s, pick(C.roof, x, y, s));
  }
};

/** Stacked tiers: each has walls and an overhanging roof with upturned corners. */
function tiers(v: VoxelGrid, ox: number, oy: number, startZ: number, count: number, wallHeight: number, wall: (k: number, x: number, y: number) => string) {
  let z = startZ;
  for (let t = 0; t < count; t++) {
    const lo = 1 + t;
    const hi = 6 - t;
    for (let k = 0; k < wallHeight; k++, z++) {
      for (let x = lo; x <= hi; x++) {
        for (let y = lo; y <= hi; y++) {
          if (x === lo || x === hi || y === lo || y === hi) v.set(ox + x, oy + y, z, wall(k, x, y));
        }
      }
    }
    for (let x = lo - 1; x <= hi + 1; x++) for (let y = lo - 1; y <= hi + 1; y++) v.set(ox + x, oy + y, z, pick(C.roof, x, y, z));
    for (const [a, b] of [[lo - 1, lo - 1], [hi + 1, lo - 1], [lo - 1, hi + 1], [hi + 1, hi + 1]]) v.set(ox + a, oy + b, z + 1, C.roof[0]);
    z++;
  }
  return z;
}

const pagoda: Model = (v, ox, oy) => {
  for (let x = 0; x < TILE; x++) for (let y = 0; y < TILE; y++) v.set(ox + x, oy + y, G, pick(C.stone, x, y, G));
  const top = tiers(v, ox, oy, G + 1, 3, 3, (k, x, y) => ((x + y) % 3 === 0 ? C.wood : k === 1 ? C.red : C.plaster));
  for (let k = 0; k < 4; k++) v.set(ox + 3, oy + 3, top + k, C.gold);
};

const castle: Model = (v, ox, oy) => {
  // Sloped stone base, then white walls with dark roofs, like Himeji.
  for (let z = G; z < G + 4; z++) {
    const inset = z - G > 1 ? 1 : 0;
    for (let x = inset; x < TILE - inset; x++) for (let y = inset; y < TILE - inset; y++) v.set(ox + x, oy + y, z, pick(C.stone, x, y, z));
  }
  const top = tiers(v, ox, oy, G + 4, 3, 3, (k, x, y) => (k === 1 && (x + y) % 2 === 0 ? C.ink : C.plaster));
  v.set(ox + 3, oy + 3, top, C.gold);
  v.set(ox + 4, oy + 3, top, C.gold);
};

export const MODELS: Record<ItemId, Model> = {
  sakura,
  bamboo,
  lantern,
  path,
  pine,
  rice,
  pond,
  torii,
  teahouse,
  pagoda,
  castle,
};

function groundTile(v: VoxelGrid, ox: number, oy: number) {
  for (let x = 0; x < TILE; x++) {
    for (let y = 0; y < TILE; y++) {
      const X = ox + x;
      const Y = oy + y;
      for (let z = 0; z < G; z++) {
        let color = z === G - 1 ? pick(C.grass, X, Y, z) : z === 0 ? pick(C.stone, X, Y, z) : pick(C.dirt, X, Y, z);
        if (z === G - 2 && hash(X, Y, 7) > 0.8) color = pick(C.grass, X, Y, 1); // grass hanging over the edge
        v.set(X, Y, z, color);
      }
    }
  }
}

function waterTile(v: VoxelGrid, ox: number, oy: number) {
  for (let x = 0; x < TILE; x++) {
    for (let y = 0; y < TILE; y++) {
      const X = ox + x;
      const Y = oy + y;
      v.set(X, Y, WATER_Z, hash(X, Y, 3) > 0.93 ? C.foam : pick(C.water, X, Y, 0));
    }
  }
}

export function isNearLand(world: World, r: number, c: number): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < world.size && nc < world.size && world.tiles[nr * world.size + nc].unlocked) return true;
    }
  }
  return false;
}

/** The island plus a ring of sea around it. */
export function buildWorldGrid(world: World): VoxelGrid {
  const v = new VoxelGrid();
  // Sea may extend one tile beyond the grid so the edge of the world never shows.
  for (let r = -1; r <= world.size; r++) {
    for (let c = -1; c <= world.size; c++) {
      const inside = r >= 0 && c >= 0 && r < world.size && c < world.size;
      const tile = inside ? world.tiles[r * world.size + c] : null;
      if (tile?.unlocked) {
        groundTile(v, c * TILE, r * TILE);
        if (tile.item) MODELS[tile.item](v, c * TILE, r * TILE);
      } else if (isNearLand(world, r, c)) {
        waterTile(v, c * TILE, r * TILE);
      }
    }
  }
  return v;
}

/** A single grass tile with one item on it, for the build menu. */
export function buildItemGrid(item: ItemId): VoxelGrid {
  const v = new VoxelGrid();
  for (let x = 0; x < TILE; x++) for (let y = 0; y < TILE; y++) v.set(x, y, G - 1, pick(C.grass, x, y, 0));
  MODELS[item](v, 0, 0);
  return v;
}
