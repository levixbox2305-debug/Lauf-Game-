/**
 * The supermarket, tile by tile. One character is one 16×16 tile.
 *
 *  #  wall               .  floor             _  staff door        D  entrance door
 *  e  doormat            ,  car park          =  parking line      C  parked car
 *  Y  tree               w  shopping trolleys p  plant             x  cardboard boxes
 *  a  table              L  storeroom pallet  Z  staff shop        Q  notice board
 *  M  locker             B  manager's desk    T  deli counter      K  checkout
 *  P  bottle return
 *  o b k t g d s n  shelves, one letter per department (see CATEGORIES)
 */
export const MAP = [
  '########################################',
  '#LLLL.LLLL.LLL#ZZ.....Q..p#M.....BBB..p#',
  '#.............#...........#............#',
  '#LLLL.LLLL....#..aa...aa..#..........xx#',
  '#.............#...........#............#',
  '#xx.......xx..#p.........p#p..........p#',
  '#######_############_###########_#######',
  '#......................................#',
  '#TTTTTT..kkkkkkkkkk..kkkkkkkkk..tttttt.#',
  '#......................................#',
  '#.oo.oo..nnnnnn..ssssss..dddddd..gg.gg.#',
  '#.oo.oo..nnnnnn..ssssss..dddddd..gg.gg.#',
  '#......................................#',
  '#.oo.oo..ssssss..nnnnnn..dddddd..gg.gg.#',
  '#.oo.oo..ssssss..nnnnnn..dddddd..gg.gg.#',
  '#......................................#',
  '#.bbbb.................................#',
  '#......................................#',
  '#..KK...KK...KK...KK......P..ww..ww....#',
  '#......................................#',
  '#..............eeee....................#',
  '###############DDDD#####################',
  'Y,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,Y',
  'Y,,=C=C=C=,,,,,,,,,,,,,,,,,,,,=C=C=C=,,Y',
  'Y,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,Y',
  'Y,,=C=.=C=,,,,,,,,,,,,,,,,,,,,=C=.=C=,,Y',
  'Y,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,Y',
  'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
];

export const MAP_W = MAP[0].length;
export const MAP_H = MAP.length;

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export type Pos = { x: number; y: number };

export const tileAt = (x: number, y: number): string =>
  x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? '#' : MAP[y][x];

export const index = (x: number, y: number) => y * MAP_W + x;
export const posOf = (i: number): Pos => ({ x: i % MAP_W, y: Math.floor(i / MAP_W) });

const WALKABLE = new Set(['.', '_', 'D', 'e', ',', '=']);
export const isWalkable = (x: number, y: number) => WALKABLE.has(tileAt(x, y));

/** The sales floor: where customers walk and where spills can happen. */
export const isSalesFloor = (x: number, y: number) => y >= 7 && y <= 20 && tileAt(x, y) === '.';

export const START: Pos & { dir: Dir } = { x: 17, y: 19, dir: 'up' };

/** Fixed staff members, standing where they work. */
export const STAFF = [
  { id: 'berger', name: 'Frau Berger', role: 'Marktleiterin', x: 34, y: 2, dir: 'down' as Dir },
  { id: 'kalle', name: 'Kalle', role: 'Lagerist', x: 12, y: 4, dir: 'left' as Dir },
  { id: 'bernd', name: 'Bernd', role: 'Fleischtheke', x: 3, y: 7, dir: 'down' as Dir },
  { id: 'aylin', name: 'Aylin', role: 'Kassiererin', x: 22, y: 19, dir: 'up' as Dir },
  { id: 'jonas', name: 'Jonas', role: 'Azubi im 2. Jahr', x: 20, y: 4, dir: 'left' as Dir },
] as const;
export type StaffId = (typeof STAFF)[number]['id'];

/** Each checkout is identified by its left tile; customers queue right below it. */
export const CHECKOUTS: Pos[] = MAP.flatMap((row, y) =>
  [...row].flatMap((ch, x) => (ch === 'K' && row[x - 1] !== 'K' ? [{ x, y }] : [])),
);
export const checkoutAt = (x: number, y: number): number => {
  if (tileAt(x, y) !== 'K') return -1;
  const left = tileAt(x - 1, y) === 'K' ? x - 1 : x;
  return CHECKOUTS.findIndex((c) => c.x === left && c.y === y);
};
export const queueSpot = (k: number): Pos => ({ x: CHECKOUTS[k].x, y: CHECKOUTS[k].y + 1 });

/** Department signs drawn over the map, at the first tile of every shelf block. */
export function shelfBlocks(): { category: string; x: number; y: number; width: number }[] {
  const seen = new Set<number>();
  const blocks: { category: string; x: number; y: number; width: number }[] = [];
  MAP.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (!'obktgdsn'.includes(ch) || seen.has(index(x, y))) return;
      let w = 0;
      while (tileAt(x + w, y) === ch) seen.add(index(x + w++, y));
      // Double-sided shelves get one sign for both rows.
      if (tileAt(x, y + 1) === ch) for (let k = 0; k < w; k++) seen.add(index(x + k, y + 1));
      blocks.push({ category: ch, x, y, width: w });
    }),
  );
  return blocks;
}
