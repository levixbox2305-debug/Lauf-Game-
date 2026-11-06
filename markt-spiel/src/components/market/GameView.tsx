import { Canvas, Group, Picture } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { CATEGORIES, STORE_NAME, type CategoryId } from '../../market/data';
import { bubblePicture, cratePicture, getMapPicture, getStatePicture, personPicture, T, type Appearance } from '../../market/draw';
import { drawPos, getEngine, npcPos, update, type Engine } from '../../market/engine';
import { CHECKOUTS, MAP, MAP_H, MAP_W, posOf, shelfBlocks, STAFF, type Pos } from '../../market/map';
import { categoryAt } from '../../market/world';
import { retro } from './retro';

type Props = {
  player: Appearance;
  staff: Record<string, Appearance>;
  active: boolean;
  /** Called after every finished step, outside of rendering. */
  onStep: () => void;
  /** Shows where the nearest job is (pager upgrade). */
  pager: boolean;
};

/** One sign per group of shelves: blocks close to an already signed one of the same department are skipped. */
const SIGNS = shelfBlocks().filter(
  (b, i, all) => !all.slice(0, i).some((o) => o.category === b.category && Math.abs(o.x - b.x) <= 4 && Math.abs(o.y - b.y) <= 3),
);
const ROOMS = [
  { label: 'Lager', x: 1, y: 0, width: 13 },
  { label: 'Pausenraum', x: 15, y: 0, width: 11 },
  { label: 'Büro', x: 27, y: 0, width: 12 },
];
const PFAND = (() => {
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (MAP[y][x] === 'P') return { x, y };
  return { x: 0, y: 0 };
})();

/** Visible tiles across the screen; the scale follows from the width. */
const TILES_ACROSS = 11;

type Job = { label: string; at: Pos };

function nearestJob(engine: Engine): Job | null {
  const { world, player } = engine;
  const jobs: Job[] = [];
  for (const i of world.spills) jobs.push({ label: 'Pfütze', at: posOf(i) });
  for (const n of world.npcs) {
    if (n.kind === 'asker') jobs.push({ label: 'Kundenfrage', at: n });
    if (n.kind === 'queue') jobs.push({ label: 'Kasse', at: CHECKOUTS[n.checkout!] });
  }
  if (world.pfand >= 100) jobs.push({ label: 'Pfandautomat', at: PFAND });
  if (world.mhd !== null) jobs.push({ label: 'MHD-Kontrolle', at: posOf(world.mhd) });
  for (const i of world.empty) {
    const c = categoryAt(i);
    if (c && player.carry.includes(c)) jobs.push({ label: `Leeres Regal (${CATEGORIES[c].name})`, at: posOf(i) });
  }
  if (!jobs.length && world.empty.size) jobs.push({ label: 'Ware holen im Lager', at: { x: 5, y: 3 } });
  const dist = (j: Job) => Math.abs(j.at.x - player.x) + Math.abs(j.at.y - player.y);
  return jobs.sort((a, b) => dist(a) - dist(b))[0] ?? null;
}

function GameViewImpl({ player, staff, active, onStep, pager }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  /** The time of the frame being drawn; every frame of the loop sets it. */
  const [now, setNow] = useState(0);
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let lastDraw = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const clock = Date.now();
      const { stepped } = update(getEngine(), clock);
      if (stepped) onStepRef.current();
      // ~30 fps is plenty for pixel art and saves battery.
      if (t - lastDraw >= 30) {
        lastDraw = t;
        setNow(clock);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const scale = useMemo(() => Math.max(1.5, Math.floor((size.width / TILES_ACROSS / T) * 4) / 4), [size.width]);

  const e = getEngine();

  const p = e.player;
  const pp = drawPos(p, p.stepMs, now);
  const tile = T * scale;
  const maxX = MAP_W * tile - size.width;
  const maxY = MAP_H * tile - size.height;
  const camX = Math.round(Math.min(Math.max(0, (pp.x + 0.5) * tile - size.width / 2), Math.max(0, maxX)));
  const camY = Math.round(Math.min(Math.max(0, (pp.y + 0.5) * tile - size.height / 2), Math.max(0, maxY)));

  // Everyone is drawn back to front, so people further down overlap those above.
  type Sprite = { y: number; node: ReactNode };
  const sprites: Sprite[] = [];
  const walkFrame = (moving: boolean, seed: number) => (moving ? ((seed % 2) + 1) as 1 | 2 : 0);

  for (const s of STAFF) {
    sprites.push({
      y: s.y,
      node: (
        <Group key={s.id} transform={[{ translateX: s.x * T }, { translateY: s.y * T - 6 }]}>
          <Picture picture={personPicture(staff[s.id], s.dir, 0)} />
        </Group>
      ),
    });
  }
  for (const n of e.world.npcs) {
    const np = npcPos(n, now);
    const glyph = n.kind === 'asker' ? '?' : n.kind === 'queue' ? '€' : null;
    sprites.push({
      y: np.y,
      node: (
        <Group key={n.id} transform={[{ translateX: np.x * T }, { translateY: np.y * T - 6 }]}>
          <Picture picture={personPicture(n.look, n.dir, walkFrame(np.moving, n.x + n.y))} />
          {glyph && (
            <Group transform={[{ translateX: 3 }, { translateY: -9 + (Math.floor(now / 400) % 2) }]}>
              <Picture picture={bubblePicture(glyph, glyph === '?' ? '#FFF6B0' : '#D9F5D9')} />
            </Group>
          )}
        </Group>
      ),
    });
  }
  sprites.push({
    y: pp.y,
    node: (
      <Group key="player" transform={[{ translateX: pp.x * T }, { translateY: pp.y * T - 6 }]}>
        <Picture picture={personPicture(player, p.dir, walkFrame(pp.moving, p.steps))} />
        {p.carry.map((c: CategoryId, k) => (
          <Group key={k} transform={[{ translateX: 3 }, { translateY: -4 - k * 5 }]}>
            <Picture picture={cratePicture(c)} />
          </Group>
        ))}
      </Group>
    ),
  });
  sprites.sort((a, b) => a.y - b.y);

  const markers: ReactNode[] = [];
  const bob = Math.floor(now / 400) % 2;
  if (e.world.mhd !== null) {
    const m = posOf(e.world.mhd);
    markers.push(
      <Group key="mhd" transform={[{ translateX: m.x * T + 3 }, { translateY: m.y * T - 10 + bob }]}>
        <Picture picture={bubblePicture('!', '#FFD3D3')} />
      </Group>,
    );
  }
  if (e.world.pfand >= 100) {
    markers.push(
      <Group key="pfand" transform={[{ translateX: PFAND.x * T + 3 }, { translateY: PFAND.y * T - 10 + bob }]}>
        <Picture picture={bubblePicture('!', '#FFD3D3')} />
      </Group>,
    );
  }

  const job = pager ? nearestJob(e) : null;
  const onLayout = (ev: LayoutChangeEvent) => setSize({ width: ev.nativeEvent.layout.width, height: ev.nativeEvent.layout.height });
  const label = (x: number, y: number) => ({ left: x * tile - camX, top: y * tile - camY });

  return (
    <View style={styles.root} onLayout={onLayout}>
      {size.width > 0 && (
        <>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group transform={[{ translateX: -camX }, { translateY: -camY }, { scale }]}>
              <Picture picture={getMapPicture()} />
              <Picture picture={getStatePicture(e.world)} />
              {sprites.map((s) => s.node)}
              {markers}
            </Group>
          </Canvas>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {SIGNS.map((s) => (
              <View key={`${s.x}-${s.y}`} style={[styles.signWrap, label(s.x, s.y - 0.45), { width: Math.max(s.width, 3) * tile }]}>
                <Text style={[styles.sign, { fontSize: Math.max(8, tile * 0.26) }]} numberOfLines={1}>
                  {CATEGORIES[s.category as CategoryId].name}
                </Text>
              </View>
            ))}
            {ROOMS.map((r) => (
              <View key={r.label} style={[styles.signWrap, label(r.x, r.y + 0.2), { width: r.width * tile }]}>
                <Text style={[styles.room, { fontSize: Math.max(9, tile * 0.3) }]}>{r.label}</Text>
              </View>
            ))}
            <View style={[styles.signWrap, label(21, 21.1), { width: 6 * tile }]}>
              <Text style={[styles.storeSign, { fontSize: tile * 0.55 }]}>{STORE_NAME}</Text>
            </View>
            {job && (
              <View style={styles.pager}>
                <Text style={styles.pagerText}>
                  📟 {job.label}: {arrow(job.at, p)}
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

function arrow(to: Pos, from: Pos): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const parts: string[] = [];
  if (dy) parts.push(`${Math.abs(dy)}${dy < 0 ? '↑' : '↓'}`);
  if (dx) parts.push(`${Math.abs(dx)}${dx < 0 ? '←' : '→'}`);
  return parts.join(' ') || 'hier';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2A2228', overflow: 'hidden' },
  signWrap: { position: 'absolute', alignItems: 'center' },
  sign: {
    fontFamily: retro.font,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(200,16,46,0.88)',
    paddingHorizontal: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  room: { fontFamily: retro.font, fontWeight: '700', color: '#F8F4E8' },
  storeSign: { fontFamily: retro.font, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },
  pager: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(42,34,40,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pagerText: { fontFamily: retro.font, color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});

export const GameView = memo(GameViewImpl);
