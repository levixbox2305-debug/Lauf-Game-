/** Draws the market with Skia: the map once, products and spills when they change, people every frame. */
import { createPicture, Skia, type SkCanvas, type SkPaint, type SkPicture } from '@shopify/react-native-skia';

import { CATEGORIES, isShelf, SHOP_BY_ID, type CategoryId, type HatId } from './data';
import { MAP, MAP_H, MAP_W, posOf, tileAt, type Dir } from './map';
import { GLYPHS, hatRows, personRows } from './sprites';
import type { Look, World } from './world';

export const T = 16;

const paints = new Map<string, SkPaint>();
function paint(color: string): SkPaint {
  let p = paints.get(color);
  if (!p) {
    p = Skia.Paint();
    p.setColor(Skia.Color(color));
    p.setAntiAlias(false);
    paints.set(color, p);
  }
  return p;
}

const rect = (c: SkCanvas, x: number, y: number, w: number, h: number, color: string) => c.drawRect(Skia.XYWHRect(x, y, w, h), paint(color));
const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

// ---------------------------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------------------------

function floor(c: SkCanvas, x: number, y: number, tx: number, ty: number) {
  if (ty <= 5) {
    if (tx < 14) {
      // Storeroom: concrete.
      rect(c, x, y, T, T, '#B4B2AA');
      if (hash(tx, ty) % 3 === 0) rect(c, x + (hash(tx, ty) % 11), y + (hash(ty, tx) % 13), 2, 1, '#A3A199');
    } else if (tx < 26) {
      // Break room: wooden planks.
      rect(c, x, y, T, T, '#C9A47A');
      rect(c, x, y + 7, T, 1, '#B48D62');
      rect(c, x, y + 15, T, 1, '#B48D62');
      rect(c, x + ((tx + ty) % 2 ? 4 : 11), y, 1, 7, '#B48D62');
    } else {
      // Office: carpet.
      rect(c, x, y, T, T, '#8DA0B5');
      if ((tx + ty) % 2) rect(c, x + 6, y + 6, 4, 4, '#8397AD');
    }
    return;
  }
  rect(c, x, y, T, T, (tx + ty) % 2 ? '#EEEAE1' : '#E5E0D4');
  rect(c, x, y + 15, T, 1, '#D6CFC0');
  rect(c, x + 15, y, 1, T, '#D6CFC0');
}

function asphalt(c: SkCanvas, x: number, y: number, tx: number, ty: number) {
  rect(c, x, y, T, T, '#7E8087');
  const h = hash(tx, ty);
  rect(c, x + (h % 13), y + ((h >> 4) % 13), 1, 1, '#8E9097');
  rect(c, x + ((h >> 8) % 13), y + ((h >> 12) % 13), 1, 1, '#6F7178');
}

function tile(c: SkCanvas, ch: string, tx: number, ty: number) {
  const x = tx * T;
  const y = ty * T;
  switch (ch) {
    case '#': {
      if (ty === 21) {
        // The store front: red facade with a white stripe.
        rect(c, x, y, T, T, '#C8102E');
        rect(c, x, y + 10, T, 2, '#F4F4F4');
        rect(c, x, y + 14, T, 2, '#9C0C24');
      } else {
        rect(c, x, y, T, T, '#CFC4B0');
        rect(c, x, y, T, 5, '#8C7F6C');
        rect(c, x, y + 14, T, 2, '#A99C86');
      }
      return;
    }
    case '_':
      floor(c, x, y, tx, ty + 1);
      rect(c, x, y, 2, T, '#7A5634');
      rect(c, x + 14, y, 2, T, '#7A5634');
      rect(c, x, y, T, 2, '#7A5634');
      return;
    case 'D':
      rect(c, x, y, T, T, '#9FD2E6');
      rect(c, x, y, T, 2, '#5C5C5C');
      rect(c, x + (tx % 2 ? 15 : 0), y, 1, T, '#5C5C5C');
      rect(c, x + 3, y + 4, 2, 8, '#D4EEF7');
      return;
    case 'e':
      floor(c, x, y, tx, ty);
      rect(c, x, y + 2, T, 12, '#4B4B50');
      rect(c, x, y + 3, T, 1, '#5D5D63');
      rect(c, x, y + 12, T, 1, '#5D5D63');
      return;
    case ',':
      asphalt(c, x, y, tx, ty);
      return;
    case '=':
      asphalt(c, x, y, tx, ty);
      rect(c, x + 7, y, 2, T, '#E8E8E8');
      return;
    case 'C': {
      asphalt(c, x, y, tx, ty);
      const body = ['#C0392B', '#2E86C1', '#F1C40F', '#ECF0F1', '#27AE60', '#34495E'][hash(tx, ty) % 6];
      rect(c, x + 2, y + 1, 12, 14, '#2B2B2B');
      rect(c, x + 3, y + 1, 10, 14, body);
      rect(c, x + 4, y + 3, 8, 3, '#9BC7DD');
      rect(c, x + 4, y + 11, 8, 2, '#9BC7DD');
      return;
    }
    case 'Y':
      rect(c, x, y, T, T, '#5E9B4A');
      c.drawCircle(x + 8, y + 7, 7, paint('#2F6B2F'));
      c.drawCircle(x + 6, y + 5, 3, paint('#3F8A3A'));
      rect(c, x + 7, y + 13, 2, 3, '#6B4423');
      return;
    case 'w':
      floor(c, x, y, tx, ty);
      for (let k = 0; k < 4; k++) rect(c, x + 2, y + 2 + k * 3, 12, 2, k % 2 ? '#8E949A' : '#B7BDC3');
      rect(c, x + 2, y + 2, 12, 1, '#C8102E');
      return;
    case 'p':
      floor(c, x, y, tx, ty);
      rect(c, x + 4, y + 10, 8, 5, '#9C5B32');
      c.drawCircle(x + 8, y + 7, 5, paint('#3E8A3A'));
      c.drawCircle(x + 6, y + 5, 2, paint('#5DB052'));
      return;
    case 'x':
      floor(c, x, y, tx, ty);
      rect(c, x + 1, y + 4, 9, 9, '#C8955A');
      rect(c, x + 6, y + 1, 9, 8, '#D6A66A');
      rect(c, x + 10, y + 1, 1, 8, '#E8D2A6');
      rect(c, x + 5, y + 4, 1, 9, '#E8D2A6');
      return;
    case 'a':
      floor(c, x, y, tx, ty);
      rect(c, x, y + 3, T, 10, '#8B5A2B');
      rect(c, x, y + 3, T, 2, '#A97142');
      if (tx % 2) rect(c, x + 5, y + 6, 4, 3, '#FFFFFF');
      return;
    case 'L':
      floor(c, x, y, tx, ty);
      rect(c, x + 1, y + 12, 14, 3, '#B98B4E');
      rect(c, x + 1, y + 13, 14, 1, '#8E6634');
      rect(c, x + 2, y + 2, 12, 10, '#D2A464');
      rect(c, x + 2, y + 6, 12, 1, '#B98B4E');
      rect(c, x + 7, y + 2, 2, 10, '#E9D3A0');
      return;
    case 'Z':
      floor(c, x, y, tx, ty);
      rect(c, x + 1, y, 14, 15, '#B8202A');
      rect(c, x + 3, y + 2, 8, 10, '#CFE8F2');
      for (let k = 0; k < 3; k++) rect(c, x + 4, y + 3 + k * 3, 6, 2, ['#F2C230', '#5DA83A', '#8E5BB5'][(k + tx) % 3]);
      rect(c, x + 12, y + 4, 2, 3, '#2B2B2B');
      rect(c, x + 3, y + 13, 8, 1, '#2B2B2B');
      return;
    case 'Q':
      floor(c, x, y, tx, ty);
      rect(c, x, y, T, 12, '#A8794E');
      rect(c, x + 1, y + 1, 14, 10, '#C99A6B');
      rect(c, x + 2, y + 2, 5, 4, '#FFFFFF');
      rect(c, x + 9, y + 2, 5, 3, '#F7E07A');
      rect(c, x + 4, y + 7, 6, 3, '#F5B7C3');
      rect(c, x + 4, y + 2, 1, 1, '#C8102E');
      return;
    case 'M':
      floor(c, x, y, tx, ty);
      rect(c, x + 1, y, 14, 15, '#6F8396');
      rect(c, x + 7, y, 2, 15, '#566778');
      rect(c, x + 5, y + 7, 1, 2, '#E0E0E0');
      rect(c, x + 10, y + 7, 1, 2, '#E0E0E0');
      rect(c, x + 3, y + 2, 3, 1, '#566778');
      rect(c, x + 10, y + 2, 3, 1, '#566778');
      return;
    case 'B':
      floor(c, x, y, tx, ty);
      rect(c, x, y + 2, T, 11, '#7A4E26');
      rect(c, x, y + 2, T, 2, '#94633A');
      if (tx % 3 === 1) {
        rect(c, x + 3, y, 9, 7, '#2B2B2B');
        rect(c, x + 4, y + 1, 7, 5, '#6FB7E8');
      } else rect(c, x + 4, y + 6, 6, 4, '#FFFFFF');
      return;
    case 'T':
      floor(c, x, y, tx, ty);
      rect(c, x, y + 1, T, 14, '#E4E4E4');
      rect(c, x, y + 2, T, 7, '#BFE3F0');
      rect(c, x + 2, y + 4, 5, 3, ['#D8606A', '#F0A0A8', '#E8C070'][tx % 3]);
      rect(c, x + 9, y + 4, 5, 3, ['#F0A0A8', '#E8C070', '#D8606A'][tx % 3]);
      rect(c, x, y + 12, T, 3, '#C8102E');
      return;
    case 'K': {
      floor(c, x, y, tx, ty);
      const left = tileAt(tx - 1, ty) !== 'K';
      rect(c, x, y + 2, T, 12, '#D5D5D5');
      rect(c, x, y + 4, T, 6, '#2E2E2E');
      for (let k = 0; k < 4; k++) rect(c, x + 2 + k * 4, y + 6, 1, 2, '#454545');
      if (!left) {
        rect(c, x + 8, y, 7, 6, '#4A4A4A');
        rect(c, x + 9, y + 1, 5, 3, '#7CD67C');
      }
      return;
    }
    case 'P':
      floor(c, x, y, tx, ty);
      rect(c, x + 1, y, 14, 15, '#2E8B57');
      rect(c, x + 3, y + 2, 10, 4, '#E8F5E9');
      c.drawCircle(x + 8, y + 10, 3, paint('#1E1E1E'));
      return;
  }
  if (isShelf(ch)) return shelfFrame(c, ch, x, y, tx, ty);
  floor(c, x, y, tx, ty);
}

function shelfFrame(c: SkCanvas, ch: CategoryId, x: number, y: number, tx: number, ty: number) {
  floor(c, x, y, tx, ty);
  switch (ch) {
    case 'o':
      rect(c, x + 1, y + 1, 14, 14, '#8B5A2B');
      rect(c, x + 2, y + 2, 12, 12, '#6E4420');
      return;
    case 'b':
      rect(c, x, y + 1, T, 14, '#A86F3A');
      rect(c, x + 1, y + 2, 14, 12, '#7E5128');
      return;
    case 'k':
    case 't':
      rect(c, x, y, T, T, '#E8EEF2');
      rect(c, x + 1, y + 2, 14, 12, ch === 'k' ? '#CFE7F2' : '#A9CBEA');
      rect(c, x, y + 14, T, 2, '#9AA7B0');
      return;
    case 'g':
      rect(c, x + 1, y + 1, 14, 14, '#2D5C8F');
      rect(c, x + 2, y + 2, 12, 12, '#24496F');
      return;
    default:
      rect(c, x, y, T, T, '#8F99A3');
      rect(c, x + 1, y + 1, 14, 14, '#C7CDD3');
      rect(c, x + 1, y + 7, 14, 1, '#8F99A3');
  }
}

let mapPicture: SkPicture | null = null;
export function getMapPicture(): SkPicture {
  if (!mapPicture) {
    mapPicture = createPicture((c) => {
      for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) tile(c, MAP[ty][tx], tx, ty);
    }, Skia.XYWHRect(0, 0, MAP_W * T, MAP_H * T));
  }
  return mapPicture;
}

// ---------------------------------------------------------------------------------------------
// Things that change: products, spills, bottle machine
// ---------------------------------------------------------------------------------------------

function products(c: SkCanvas, ch: CategoryId, tx: number, ty: number) {
  const x = tx * T;
  const y = ty * T;
  const colors = CATEGORIES[ch].colors;
  const col = (k: number) => colors[(hash(tx, ty) + k) % colors.length];
  if (ch === 'o') {
    for (let k = 0; k < 6; k++) c.drawCircle(x + 4 + (k % 3) * 4, y + 5 + Math.floor(k / 3) * 6, 2.5, paint(col(Math.floor(k / 3))));
  } else if (ch === 'b') {
    for (let k = 0; k < 3; k++) {
      rect(c, x + 2 + k * 4, y + 4, 4, 3, col(k));
      rect(c, x + 2 + k * 4, y + 9, 4, 3, col(k + 1));
    }
  } else if (ch === 'g') {
    for (let k = 0; k < 4; k++) for (let r = 0; r < 3; r++) c.drawCircle(x + 4 + k * 3, y + 4 + r * 4, 1.4, paint(col(r)));
  } else {
    for (let row = 0; row < 2; row++) for (let k = 0; k < 4; k++) rect(c, x + 2 + k * 3, y + 2 + row * 6, 2, 5, col(k + row));
  }
}

let stateCache: { world: World; version: number; picture: SkPicture } | null = null;

/** Products, spills and the bottle gauge; re-recorded only when the world's version changes. */
export function getStatePicture(world: World): SkPicture {
  if (stateCache && stateCache.world === world && stateCache.version === world.version) return stateCache.picture;
  const picture = recordState(world);
  stateCache = { world, version: world.version, picture };
  return picture;
}

function recordState(world: World): SkPicture {
  return createPicture((c) => {
    for (let ty = 0; ty < MAP_H; ty++)
      for (let tx = 0; tx < MAP_W; tx++) {
        const ch = MAP[ty][tx];
        if (isShelf(ch) && !world.empty.has(ty * MAP_W + tx)) products(c, ch, tx, ty);
        else if (isShelf(ch)) rect(c, tx * T + 6, ty * T + 12, 4, 2, '#F4E04D');
      }
    for (const i of world.spills) {
      const { x, y } = posOf(i);
      const px = x * T;
      const py = y * T;
      c.drawOval(Skia.XYWHRect(px + 2, py + 5, 12, 8), paint('#5DA9E0'));
      c.drawOval(Skia.XYWHRect(px + 6, py + 3, 7, 5), paint('#5DA9E0'));
      rect(c, px + 5, py + 7, 3, 1, '#CFEAFB');
    }
    // The bottle machine's fill gauge.
    MAP.forEach((row, ty) =>
      [...row].forEach((ch, tx) => {
        if (ch !== 'P') return;
        rect(c, tx * T + 4, ty * T + 3, 8, 2, '#E8F5E9');
        rect(c, tx * T + 4, ty * T + 3, Math.round((world.pfand / 100) * 8), 2, world.pfand >= 100 ? '#D8352A' : '#4CAF50');
      }),
    );
  }, Skia.XYWHRect(0, 0, MAP_W * T, MAP_H * T));
}

// ---------------------------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------------------------

const RAINBOW = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA'];

export type Appearance = Look & { hat?: string | null; vest?: string | null };

const people = new Map<string, SkPicture>();

/** A person's sprite, 16 wide and 20 high (hats can reach above the head). */
export function personPicture(look: Appearance, dir: Dir, frame: 0 | 1 | 2): SkPicture {
  const key = `${look.skin}${look.hair}${look.shirt}${look.pants}${look.hat}${look.vest}${dir}${frame}`;
  let pic = people.get(key);
  if (pic) return pic;
  const vest = look.vest ? SHOP_BY_ID[look.vest]?.color ?? '#CC2A2A' : null;
  const hat = look.hat ? SHOP_BY_ID[look.hat] : null;
  pic = createPicture((c) => {
    c.drawOval(Skia.XYWHRect(3, 18, 10, 3), paint('rgba(0,0,0,0.22)'));
    const rows = personRows(dir, frame);
    rows.forEach((row, ry) =>
      [...row].forEach((ch, rx) => {
        if (ch === '.') return;
        let color: string;
        if (ch === 'v') color = vest === 'rainbow' ? RAINBOW[Math.min(5, Math.max(0, ry - 9))] : vest ?? look.shirt;
        else if (ch === 'w') color = vest ? '#FFFFFF' : look.shirt;
        else color = { k: '#2A2228', s: look.skin, h: look.hair, p: look.pants, b: '#3A2E2A' }[ch] ?? '#FF00FF';
        rect(c, rx, ry + 4, 1, 1, color);
      }),
    );
    if (hat?.hat) {
      const { top, rows: hr } = hatRows(hat.hat as HatId, dir);
      hr.forEach((row, ry) =>
        [...row].forEach((ch, rx) => {
          if (ch === '.') return;
          rect(c, rx, top + ry + 4, 1, 1, { c: hat.color ?? '#CC2A2A', w: '#FFFFFF', k: '#2A2228', r: '#D8352A' }[ch] ?? '#FF00FF');
        }),
      );
    }
  }, Skia.XYWHRect(0, 0, 16, 22));
  people.set(key, pic);
  return pic;
}

const bubbles = new Map<string, SkPicture>();
/** A speech bubble with a glyph, 9×9, drawn above someone's head. */
export function bubblePicture(glyph: keyof typeof GLYPHS, color = '#FFFFFF'): SkPicture {
  const key = glyph + color;
  let pic = bubbles.get(key);
  if (pic) return pic;
  pic = createPicture((c) => {
    rect(c, 0, 1, 9, 7, '#2A2228');
    rect(c, 1, 0, 7, 9, '#2A2228');
    rect(c, 1, 1, 7, 7, color);
    rect(c, 3, 9, 3, 1, '#2A2228');
    rect(c, 4, 10, 1, 1, '#2A2228');
    GLYPHS[glyph].forEach((row, ry) => [...row].forEach((ch, rx) => ch === 'k' && rect(c, 3 + rx, 2 + ry, 1, 1, '#2A2228')));
  }, Skia.XYWHRect(0, 0, 9, 11));
  bubbles.set(key, pic);
  return pic;
}

/** A crate the player carries above their head. */
export function cratePicture(category: CategoryId): SkPicture {
  const key = `crate${category}`;
  let pic = bubbles.get(key);
  if (pic) return pic;
  pic = createPicture((c) => {
    rect(c, 0, 0, 10, 7, '#8E6634');
    rect(c, 1, 1, 8, 5, '#D2A464');
    const colors = CATEGORIES[category].colors;
    for (let k = 0; k < 3; k++) rect(c, 2 + k * 2, 1, 2, 2, colors[k % colors.length]);
  }, Skia.XYWHRect(0, 0, 10, 7));
  bubbles.set(key, pic);
  return pic;
}
