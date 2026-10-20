// A tiny voxel engine. Every voxel is one "pixel" of the world's block texture.
// The world is turned into one triangle mesh that Skia draws in a single call.

/** Deterministic noise in [0, 1) so textures look the same on every render. */
export function hash(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function pick<T>(options: readonly T[], x: number, y: number, z: number): T {
  return options[Math.floor(hash(x, y, z) * options.length)];
}

// Coordinates are packed into one number key; the offset allows small negative overhangs.
const OFFSET = 32;
const key = (x: number, y: number, z: number) => ((x + OFFSET) * 512 + (y + OFFSET)) * 64 + z;

export class VoxelGrid {
  private cells = new Map<number, string>();

  set(x: number, y: number, z: number, color: string) {
    this.cells.set(key(x, y, z), color);
  }

  delete(x: number, y: number, z: number) {
    this.cells.delete(key(x, y, z));
  }

  has(x: number, y: number, z: number) {
    return this.cells.has(key(x, y, z));
  }

  *entries(): Generator<[number, number, number, string]> {
    for (const [k, color] of this.cells) {
      const z = k % 64;
      const rest = (k - z) / 64;
      const y = (rest % 512) - OFFSET;
      const x = Math.floor(rest / 512) - OFFSET;
      yield [x, y, z, color];
    }
  }
}

export type Point = { x: number; y: number };

export type Mesh = {
  vertices: Point[];
  colors: string[];
  indices: number[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

/** Isometric projection with one voxel edge = 1 unit. */
export const project = (x: number, y: number, z: number): Point => ({ x: x - y, y: (x + y) / 2 - z });

/** Inverse of `project` on the horizontal plane at height z. */
export function unproject(sx: number, sy: number, z: number): { x: number; y: number } {
  const sum = 2 * (sy + z);
  return { x: (sum + sx) / 2, y: (sum - sx) / 2 };
}

// Light comes from the top-left: top faces are brightest, the right side darkest.
const TOP = 1;
const LEFT = 0.86;
const RIGHT = 0.72;

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round((n >> 16) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

export function buildMesh(grid: VoxelGrid): Mesh {
  const voxels = [...grid.entries()];
  // Painter's algorithm: voxels further from the viewer are drawn first.
  voxels.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]) || a[2] - b[2]);

  const vertices: Point[] = [];
  const colors: string[] = [];
  const indices: number[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const quad = (corners: [number, number, number][], color: string) => {
    const base = vertices.length;
    for (const [x, y, z] of corners) {
      const p = project(x, y, z);
      vertices.push(p);
      colors.push(color);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (const [x, y, z, color] of voxels) {
    const jitter = 0.94 + hash(x, y, z) * 0.12; // per-pixel variation = the block texture
    if (!grid.has(x, y, z + 1)) {
      quad([[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]], shade(color, jitter * TOP));
    }
    if (!grid.has(x + 1, y, z)) {
      quad([[x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z], [x + 1, y, z]], shade(color, jitter * RIGHT));
    }
    if (!grid.has(x, y + 1, z)) {
      quad([[x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z], [x, y + 1, z]], shade(color, jitter * LEFT));
    }
  }

  if (!vertices.length) minX = minY = maxX = maxY = 0;
  return { vertices, colors, indices, bounds: { minX, minY, maxX, maxY } };
}
