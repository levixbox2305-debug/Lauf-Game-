/**
 * Pixel art, 16×16 per tile, as text. Palette letters:
 *  k outline · s skin · h hair · v shirt or vest · w white · p trousers · b shoes · c hat colour · r red
 */
import type { HatId } from './data';
import type { Dir } from './map';

type Frames = [string[], string[], string[]];

const HEAD_DOWN = [
  '................',
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khsssssshk...',
  '...kskssssksk...',
  '...kssssssssk...',
  '....kssssssk....',
];
const BODY_DOWN = ['...kvvvwwvvvk...', '..kvvvvwwvvvvk..', '..ksvvvvvvvvsk..', '..kkvvvvvvvvkk..', '...kppppppppk...'];

const HEAD_UP = [
  '................',
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...kshhhhhhsk...',
  '....kssssssk....',
];
const BODY_UP = ['...kvvvvvvvvk...', '..kvvvvvvvvvvk..', '..ksvvvvvvvvsk..', '..kkvvvvvvvvkk..', '...kppppppppk...'];

const HEAD_RIGHT = [
  '................',
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...khhhhhhhhk...',
  '...khhhhsssk....',
  '...khhhsssksk...',
  '...khhssssssk...',
  '....kssssssk....',
];
const BODY_RIGHT = ['....kvvvvvvk....', '...kvvvvvvvvk...', '...kvvvsvvvvk...', '...kkvvvvvvkk...', '....kppppppk....'];

const PERSON: Record<'down' | 'up' | 'right', Frames> = {
  down: [
    [...HEAD_DOWN, ...BODY_DOWN, '...kppk..kppk...', '...kbbk..kbbk...'],
    [...HEAD_DOWN, ...BODY_DOWN, '...kppk..kbbk...', '...kbbk.........'],
    [...HEAD_DOWN, ...BODY_DOWN, '...kbbk..kppk...', '.........kbbk...'],
  ],
  up: [
    [...HEAD_UP, ...BODY_UP, '...kppk..kppk...', '...kbbk..kbbk...'],
    [...HEAD_UP, ...BODY_UP, '...kppk..kbbk...', '...kbbk.........'],
    [...HEAD_UP, ...BODY_UP, '...kbbk..kppk...', '.........kbbk...'],
  ],
  right: [
    [...HEAD_RIGHT, ...BODY_RIGHT, '....kppkkppk....', '....kbbkkbbk....'],
    [...HEAD_RIGHT, ...BODY_RIGHT, '...kppk..kppk...', '..kbbk....kbbk..'],
    [...HEAD_RIGHT, ...BODY_RIGHT, '....kppkkppk....', '....kbbkkbbk....'],
  ],
};

const mirror = (rows: string[]) => rows.map((r) => [...r].reverse().join(''));

/** Rows of the sprite for a direction and walk frame (0 standing, 1/2 stepping). */
export function personRows(dir: Dir, frame: 0 | 1 | 2): string[] {
  if (dir === 'left') return mirror(PERSON.right[frame]);
  return PERSON[dir][frame];
}

/** Hats: rows plus how far above the sprite's top row they start (negative = higher). */
const HATS: Record<HatId, { top: number; rows: string[]; down?: string; side?: string }> = {
  cap: { top: 1, rows: ['.....cccccc.....', '....cccccccc....', '...cccccccccc...'], down: '..cccccccccccc..', side: '...cccccccccccc.' },
  beanie: { top: -1, rows: ['.......ww.......', '......cccc......', '.....cccccc.....', '....cccccccc....', '...wwwwwwwwww...'] },
  chef: { top: -4, rows: ['....kkkkkkkk....', '...kwwwwwwwwk...', '...kwwwwwwwwk...', '....kwwwwwwk....', '....kwwwwwwk....', '....kkkkkkkk....'] },
  helmet: { top: 0, rows: ['......cccc......', '....cccccccc....', '...cccccccccc...', '..cccccccccccc..'] },
  crown: { top: -2, rows: ['....c..cc..c....', '....cc.cc.cc....', '....cccccccc....', '....crccccrc....'] },
};

export function hatRows(hat: HatId, dir: Dir): { top: number; rows: string[] } {
  const h = HATS[hat];
  let rows = h.rows;
  if (dir === 'down' && h.down) rows = [...rows, h.down];
  if ((dir === 'right' || dir === 'left') && h.side) rows = [...rows, h.side];
  return { top: h.top, rows: dir === 'left' ? mirror(rows) : rows };
}

/** Small glyphs for speech bubbles, 3×5. */
export const GLYPHS: Record<'!' | '?' | '€' | 'z', string[]> = {
  '!': ['.k.', '.k.', '.k.', '...', '.k.'],
  '?': ['kk.', '..k', '.k.', '...', '.k.'],
  '€': ['.kk', 'k..', 'kk.', 'k..', '.kk'],
  z: ['kkk', '..k', '.k.', 'k..', 'kkk'],
};
