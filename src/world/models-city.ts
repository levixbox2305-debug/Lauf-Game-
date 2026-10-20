// Voxel models for the city world: a small Japanese town.

import { GROUND as G, TILE } from './constants';
import { hash, pick, type VoxelGrid } from './voxels';

type Model = (v: VoxelGrid, ox: number, oy: number) => void;

const C = {
  asphalt: ['#3A3C40', '#414348', '#36383C'],
  lane: '#E9E6DE',
  curb: '#B9B3A7',
  stone: ['#9C9C95', '#8B8C86', '#A9A8A0'],
  soil: '#5B4632',
  bark: '#5B3A26',
  sakura: ['#F7C6D0', '#F1A7B9', '#E98FA6', '#FBDDE3'],
  red: '#C8392B',
  white: ['#F2F0EA', '#E9E6DE'],
  glass: ['#9CC3D8', '#8AB4CC'],
  frame: '#4A4A4E',
  light: '#F5D27A',
  roof: ['#3B3F4A', '#454A56'],
  wood: '#6B4A2E',
  darkWood: '#3E2A1C',
  walls: ['#E8DCC8', '#D9E3E8', '#EAD6D6', '#E3E0C9'],
  stripes: ['#3E9B5F', '#3C6FB5', '#E8862F'],
  tower: ['#7F95A8', '#8EA4B6', '#6F8597'],
  rail: '#8C8C90',
  sleeper: '#6B4A2E',
};

const box = (v: VoxelGrid, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: (x: number, y: number, z: number) => string) => {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) v.set(x, y, z, color(x, y, z));
};

const road: Model = (v, ox, oy) => {
  for (let x = 0; x < TILE; x++) {
    for (let y = 0; y < TILE; y++) {
      const lane = (y === 3 || y === 4) && x % 4 < 2;
      v.set(ox + x, oy + y, G - 1, lane ? C.lane : pick(C.asphalt, ox + x, oy + y, 1));
    }
  }
};

const streettree: Model = (v, ox, oy) => {
  for (let x = 2; x <= 5; x++) for (let y = 2; y <= 5; y++) v.set(ox + x, oy + y, G, x === 2 || x === 5 || y === 2 || y === 5 ? C.curb : C.soil);
  for (let z = G + 1; z < G + 5; z++) v.set(ox + 3, oy + 3, z, C.bark);
  for (let x = 0; x <= 7; x++) {
    for (let y = 0; y <= 7; y++) {
      for (let z = G + 5; z < G + 9; z++) {
        const d = Math.hypot(x - 3.5, y - 3.5, (z - (G + 6.5)) * 1.2);
        if (d < 3 && hash(ox + x, oy + y, z) > 0.15) v.set(ox + x, oy + y, z, pick(C.sakura, ox + x, oy + y, z));
      }
    }
  }
};

const vending: Model = (v, ox, oy) => {
  box(v, ox + 3, ox + 4, oy + 2, oy + 5, G, G + 5, (x, y, z) => {
    const front = x === ox + 4;
    if (z === G + 5) return C.white[0];
    if (front && z >= G + 3) return (y + z) % 2 ? C.light : '#7CC0E0'; // lit drink display
    if (front && z === G + 1) return C.frame; // pickup slot
    return C.red;
  });
};

const house: Model = (v, ox, oy) => {
  const wall = pick(C.walls, ox, oy, 1);
  box(v, ox + 1, ox + 6, oy + 1, oy + 6, G, G + 6, (x, y, z) => {
    const fx = x === ox + 6;
    const fy = y === oy + 6;
    const window = (fx || fy) && (z === G + 2 || z === G + 5) && ((fx ? y - oy : x - ox) % 3 === 1);
    const door = fy && x === ox + 2 && z <= G + 2;
    if (door) return C.darkWood;
    if (window) return pick(C.glass, x, y, z);
    if (z === G + 3 && (fx || fy)) return C.frame; // floor band between storeys
    return wall;
  });
  // Gable roof along x.
  for (let s = 0; s < 4; s++) {
    for (let x = ox; x <= ox + 7; x++) {
      v.set(x, oy + s, G + 7 + s, pick(C.roof, x, s, 1));
      v.set(x, oy + 7 - s, G + 7 + s, pick(C.roof, x, s, 2));
    }
  }
};

const konbini: Model = (v, ox, oy) => {
  box(v, ox, ox + 7, oy + 1, oy + 6, G, G + 5, (x, y, z) => {
    const fx = x === ox + 7;
    const fy = y === oy + 6;
    if (z === G + 4) return C.stripes[Math.floor((x - ox + y - oy) / 3) % 3];
    if ((fx || fy) && z >= G && z <= G + 3) return z === G ? C.frame : pick(C.glass, x, y, z);
    return C.white[(x + y + z) % 2];
  });
  for (let x = ox; x <= ox + 7; x++) for (let y = oy + 1; y <= oy + 6; y++) v.set(x, y, G + 6, '#C9C6BE');
  box(v, ox + 2, ox + 5, oy + 6, oy + 6, G + 7, G + 8, (x) => (x % 2 ? C.stripes[1] : C.white[0])); // sign
};

const ramen: Model = (v, ox, oy) => {
  box(v, ox + 1, ox + 6, oy + 1, oy + 6, G, G + 4, (x, y, z) => {
    const fy = y === oy + 6;
    if (fy && z >= G + 2 && x > ox + 1 && x < ox + 6) return z === G + 4 ? C.red : x % 2 ? C.red : '#A52E22'; // noren curtain
    if (fy && z < G + 2 && x > ox + 2 && x < ox + 5) return C.darkWood; // entrance
    return (x + y) % 3 ? C.wood : C.darkWood;
  });
  for (let s = 0; s < 3; s++) {
    for (let x = ox + s; x <= ox + 7 - s; x++) for (let y = oy + s; y <= oy + 7 - s; y++) v.set(x, y, G + 5 + s, pick(C.roof, x, y, s));
  }
  // Red paper lanterns either side of the door.
  for (const x of [ox + 1, ox + 6]) {
    v.set(x, oy + 7, G + 3, C.red);
    v.set(x, oy + 7, G + 2, C.red);
  }
  box(v, ox + 3, ox + 4, oy + 7, oy + 7, G + 4, G + 4, () => C.white[0]); // sign
};

const station: Model = (v, ox, oy) => {
  // Platform on the back half, tracks on the front.
  box(v, ox, ox + 7, oy, oy + 3, G, G, (x, y) => (y === oy + 3 ? '#E8C547' : pick(C.stone, x, y, 1))); // yellow safety line
  for (let x = 0; x < TILE; x++) {
    for (let y = 5; y <= 7; y++) v.set(ox + x, oy + y, G - 1, x % 2 ? C.sleeper : pick(C.stone, x, y, 3));
    v.set(ox + x, oy + 5, G, C.rail);
    v.set(ox + x, oy + 7, G, C.rail);
  }
  for (const x of [ox + 1, ox + 6]) for (let z = G + 1; z < G + 6; z++) v.set(x, oy + 1, z, C.frame);
  for (let x = ox; x <= ox + 7; x++) for (let y = oy; y <= oy + 3; y++) v.set(x, y, G + 6, y === oy + 3 ? C.red : pick(C.roof, x, y, 4));
  box(v, ox + 3, ox + 4, oy + 3, oy + 3, G + 4, G + 5, (x, y, z) => (z === G + 5 ? C.white[0] : '#2F5D9B')); // station sign
};

const tower: Model = (v, ox, oy) => {
  const H = 26;
  box(v, ox + 1, ox + 6, oy + 1, oy + 6, G, G + H, (x, y, z) => {
    if ((z - G) % 4 === 0) return C.frame; // floor slabs
    const edge = (x === ox + 1 || x === ox + 6) && (y === oy + 1 || y === oy + 6);
    if (edge) return '#5A6370';
    // A few lit windows, different each floor.
    return hash(x, y, z) > 0.86 ? C.light : pick(C.tower, x, y, z);
  });
  for (let z = G + H + 1; z < G + H + 5; z++) v.set(ox + 3, oy + 3, z, C.frame);
  v.set(ox + 3, oy + 3, G + H + 5, C.red); // aircraft warning light
};

export const CITY_MODELS = { road, streettree, vending, house, konbini, ramen, station, tower };

/** Paved sidewalk ground with a concrete base. */
export function cityGround(v: VoxelGrid, ox: number, oy: number) {
  for (let x = 0; x < TILE; x++) {
    for (let y = 0; y < TILE; y++) {
      const X = ox + x;
      const Y = oy + y;
      for (let z = 0; z < G; z++) {
        let color: string;
        if (z === G - 1) color = x % 4 === 0 || y % 4 === 0 ? '#BDB7AB' : pick(['#D6D2C8', '#CEC9BE', '#DAD6CD'], X, Y, z);
        else if (z === 0) color = pick(C.stone, X, Y, z);
        else color = pick(['#A8A49B', '#9E9A91'], X, Y, z);
        v.set(X, Y, z, color);
      }
    }
  }
}

export const CITY_WATER = ['#2F6F86', '#357A92', '#2B667B'];
