// Voxel models for the mountain world: a snowy temple high up.

import { GROUND as G, TILE } from './constants';
import { hash, pick, type VoxelGrid } from './voxels';

type Model = (v: VoxelGrid, ox: number, oy: number) => void;

const C = {
  snow: ['#F4F6F8', '#E8ECF0', '#FFFFFF'],
  rock: ['#6E6F73', '#5E5F63', '#77787C'],
  stone: ['#9C9C95', '#8B8C86', '#A9A8A0'],
  pine: ['#2F5A3A', '#376644', '#294F33'],
  bark: '#4A3020',
  red: '#C8392B',
  wood: '#8B5A2B',
  plaster: '#EDE6D6',
  roof: ['#3B3F4A', '#454A56'],
  gold: '#D9A84A',
  hotWater: ['#8FD3D6', '#9EDBDD', '#7FC8CC'],
  steam: '#F7FAFB',
};

const stairs: Model = (v, ox, oy) => {
  // Steps climbing along x, framed by rock.
  for (let x = 0; x < TILE; x++) {
    const step = Math.floor(x / 2);
    for (let y = 2; y <= 5; y++) {
      for (let z = G; z < G + step; z++) v.set(ox + x, oy + y, z, pick(C.stone, x, y, z));
      if (step === 0) v.set(ox + x, oy + y, G - 1, pick(C.stone, x, y, 9));
    }
  }
};

const snowpine: Model = (v, ox, oy) => {
  for (let z = G; z < G + 3; z++) v.set(ox + 3, oy + 3, z, C.bark);
  for (let layer = 0; layer < 4; layer++) {
    const r = 3.2 - layer * 0.75;
    const z = G + 3 + layer * 2;
    for (let x = -4; x <= 4; x++) {
      for (let y = -4; y <= 4; y++) {
        if (Math.hypot(x, y) > r) continue;
        v.set(ox + 3 + x, oy + 3 + y, z, pick(C.pine, x, y, z));
        // Snow settles on top of each layer.
        v.set(ox + 3 + x, oy + 3 + y, z + 1, Math.hypot(x, y) < r - 0.6 ? pick(C.snow, x, y, z) : pick(C.pine, y, x, z));
      }
    }
  }
  v.set(ox + 3, oy + 3, G + 11, C.snow[2]);
};

const jizo: Model = (v, ox, oy) => {
  for (let x = 3; x <= 4; x++) for (let y = 3; y <= 4; y++) for (let z = G; z < G + 3; z++) v.set(ox + x, oy + y, z, pick(C.stone, x, y, z));
  for (let x = 3; x <= 4; x++) for (let y = 3; y <= 4; y++) v.set(ox + x, oy + y, G + 3, C.stone[2]);
  v.set(ox + 3, oy + 4, G + 4, C.stone[0]);
  v.set(ox + 4, oy + 4, G + 4, C.stone[0]);
  // The red bib and cap people knit for Jizo.
  for (const [x, y] of [[3, 5], [4, 5], [5, 3], [5, 4]]) v.set(ox + x, oy + y, G + 2, C.red);
  v.set(ox + 3, oy + 3, G + 5, C.red);
  v.set(ox + 4, oy + 4, G + 5, C.red);
};

const onsen: Model = (v, ox, oy) => {
  for (let x = 0; x < TILE; x++) {
    for (let y = 0; y < TILE; y++) {
      const rim = x === 0 || y === 0 || x === 7 || y === 7;
      if (rim) {
        v.set(ox + x, oy + y, G, pick(C.rock, x, y, 1));
        if (hash(ox + x, oy + y, 5) > 0.6) v.set(ox + x, oy + y, G + 1, pick(C.snow, x, y, 1));
        continue;
      }
      v.delete(ox + x, oy + y, G - 1);
      v.set(ox + x, oy + y, G - 2, pick(C.hotWater, x, y, 2));
    }
  }
  // Steam drifting up.
  for (let i = 0; i < 10; i++) {
    const x = 2 + Math.floor(hash(i, ox, 1) * 4);
    const y = 2 + Math.floor(hash(i, oy, 2) * 4);
    v.set(ox + x, oy + y, G + 1 + (i % 4), C.steam);
  }
  v.set(ox + 6, oy + 1, G + 1, C.wood); // wooden bucket
};

const temple: Model = (v, ox, oy) => {
  for (let x = 0; x < TILE; x++) for (let y = 0; y < TILE; y++) v.set(ox + x, oy + y, G, pick(C.stone, x, y, 0));
  for (let z = G + 1; z < G + 6; z++) {
    for (let x = 1; x <= 6; x++) {
      for (let y = 1; y <= 6; y++) {
        if (x > 1 && x < 6 && y > 1 && y < 6) continue;
        const column = (x === 1 || x === 6 || x === 3 || x === 4) && (y === 1 || y === 6) ;
        v.set(ox + x, oy + y, z, column || ((x === 1 || x === 6) && (y === 3 || y === 4)) ? C.red : C.plaster);
      }
    }
  }
  // Wide roof with a snow cap, rising to a ridge.
  for (let s = 0; s < 5; s++) {
    for (let x = s - 1; x <= 8 - s; x++) {
      for (let y = s - 1; y <= 8 - s; y++) {
        const top = s === 4 || x === s - 1 || x === 8 - s || y === s - 1 || y === 8 - s;
        if (!top && s < 4) continue;
        v.set(ox + x, oy + y, G + 6 + s, s >= 3 ? pick(C.snow, x, y, s) : pick(C.roof, x, y, s));
      }
    }
  }
  v.set(ox + 3, oy + 3, G + 11, C.gold);
  v.set(ox + 4, oy + 4, G + 11, C.gold);
};

export const MOUNTAIN_MODELS = { stairs, snowpine, jizo, onsen, temple };

/** Snow over dark rock. */
export function mountainGround(v: VoxelGrid, ox: number, oy: number) {
  for (let x = 0; x < TILE; x++) {
    for (let y = 0; y < TILE; y++) {
      const X = ox + x;
      const Y = oy + y;
      for (let z = 0; z < G; z++) {
        let color = z === G - 1 ? pick(C.snow, X, Y, z) : pick(C.rock, X, Y, z);
        if (z === G - 2 && hash(X, Y, 7) > 0.75) color = pick(C.snow, X, Y, 1); // snow running down the cliff
        v.set(X, Y, z, color);
      }
    }
  }
}

export const MOUNTAIN_WATER = ['#5E95B5', '#6FA8C8', '#5689A8'];
