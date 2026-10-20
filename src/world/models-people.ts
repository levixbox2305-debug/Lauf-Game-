// Voxel figures for the residents. They are built at twice the world's resolution and drawn at
// half size, so a person is about as tall as a doorway and still gets a face.

import type { CharacterId } from '../lib/characters';
import { VoxelGrid } from './voxels';

/** Figures are modelled in half-voxels and drawn at this scale. */
export const PERSON_SCALE = 0.5;
/** Footprint of a figure in its own (half-voxel) units. */
export const PERSON_SIZE = 3;

type Hat = 'none' | 'straw' | 'cap' | 'band' | 'bald' | 'knot' | 'bun' | 'hood';

type Look = {
  clothes: string;
  accent: string;
  hair: string;
  hat: Hat;
  hatColor?: string;
  /** Something held in the hand, e.g. the night watchman's lantern. */
  prop?: string;
};

const SKIN = '#F1C9A5';
const EYES = '#2A2626';

const LOOKS: Record<CharacterId, Look> = {
  tea: { clothes: '#6E8B3D', accent: '#E9677F', hair: '#2A2626', hat: 'bun' },
  farmer: { clothes: '#5B7FA8', accent: '#3C5574', hair: '#3E2A1C', hat: 'straw', hatColor: '#E3C46B' },
  fisher: { clothes: '#3C6FB5', accent: '#F6F1E7', hair: '#2A2626', hat: 'band', hatColor: '#F6F1E7' },
  watch: { clothes: '#2B2D3A', accent: '#C8392B', hair: '#2A2626', hat: 'hood', hatColor: '#2B2D3A', prop: '#F5D27A' },
  monk: { clothes: '#E8862F', accent: '#B8862F', hair: SKIN, hat: 'bald' },
  samurai: { clothes: '#3B3F4A', accent: '#C8392B', hair: '#1E1E22', hat: 'knot' },
  student: { clothes: '#2F3F66', accent: '#C8392B', hair: '#2A2626', hat: 'none' },
  clerk: { clothes: '#3C6FB5', accent: '#3E9B5F', hair: '#5B3A26', hat: 'cap', hatColor: '#3E9B5F' },
  chef: { clothes: '#F2F0EA', accent: '#C8392B', hair: '#2A2626', hat: 'band', hatColor: '#C8392B' },
  conductor: { clothes: '#1F3157', accent: '#D9A84A', hair: '#2A2626', hat: 'cap', hatColor: '#1F3157' },
  salaryman: { clothes: '#5A5F6A', accent: '#C8392B', hair: '#1E1E22', hat: 'none' },
  innkeeper: { clothes: '#E98FA6', accent: '#F6F1E7', hair: '#2A2626', hat: 'bun' },
  hermit: { clothes: '#8B8C86', accent: '#5B3A26', hair: '#EDEDED', hat: 'bald' },
};

/**
 * Builds one animation frame. The figure faces +y (towards the bottom left of the screen),
 * which is one of the two sides the isometric camera sees.
 */
export function buildPersonGrid(id: CharacterId, frame: 0 | 1): VoxelGrid {
  const look = LOOKS[id];
  const v = new VoxelGrid();

  // Legs: side by side when standing, one forward and one back mid-stride.
  const legY = frame === 0 ? [1, 1] : [2, 0];
  for (const [i, x] of [0, 2].entries()) {
    v.set(x, legY[i], 0, '#3A3030');
    v.set(x, legY[i], 1, look.clothes);
  }

  // Body with a sash or belt in the accent colour.
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      v.set(x, y, 2, look.clothes);
      v.set(x, y, 3, y === 2 && x === 1 ? look.accent : look.clothes);
      v.set(x, y, 4, look.clothes);
    }
    v.set(x, 2, 3, look.accent);
  }
  // Arms swing opposite to the legs.
  const armY = frame === 0 ? [1, 1] : [0, 2];
  v.set(-1, armY[0], 3, look.clothes);
  v.set(3, armY[1], 3, look.clothes);
  v.set(-1, armY[0], 2, SKIN);
  v.set(3, armY[1], 2, SKIN);
  if (look.prop) v.set(3, armY[1] + (armY[1] < 2 ? 1 : 0), 1, look.prop);

  // Head: face towards +y, hair at the back and on top.
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 5; z < 8; z++) {
        const top = z === 7;
        const back = y === 0;
        v.set(x, y, z, (top || back) && look.hat !== 'bald' ? look.hair : SKIN);
      }
    }
  }
  v.set(0, 2, 6, EYES);
  v.set(2, 2, 6, EYES);

  const hatColor = look.hatColor ?? look.accent;
  switch (look.hat) {
    case 'straw':
      for (let x = -1; x <= 3; x++) for (let y = -1; y <= 3; y++) v.set(x, y, 8, hatColor);
      v.set(1, 1, 9, hatColor);
      break;
    case 'cap':
      for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) v.set(x, y, 8, hatColor);
      for (let x = 0; x < 3; x++) v.set(x, 3, 7, hatColor); // brim
      break;
    case 'band':
      for (let x = 0; x < 3; x++) v.set(x, 2, 7, hatColor);
      for (let y = 0; y < 3; y++) v.set(2, y, 7, hatColor);
      break;
    case 'knot':
      v.set(1, 0, 8, look.hair);
      v.set(1, 1, 8, look.hair);
      break;
    case 'bun':
      v.set(1, 0, 8, look.hair);
      v.set(1, 1, 8, look.hair);
      v.set(1, 0, 9, look.hair);
      break;
    case 'hood':
      for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) v.set(x, y, 8, hatColor);
      for (let z = 5; z < 8; z++) v.set(0, 0, z, hatColor);
      break;
  }
  return v;
}
