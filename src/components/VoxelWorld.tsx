import { Canvas, Circle, DashPathEffect, Group, Path, Picture, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type HostInstance,
  type LayoutChangeEvent,
} from 'react-native';

import type { CharacterId } from '../lib/characters';
import { isNeighborOfLand, type ItemId, type World, type WorldId } from '../lib/game';
import { colors, fonts } from '../theme';
import { spawnWalker, stepWalker, type Walker } from '../world/life';
import { buildWorldGrid, GROUND, TILE, WATER_Z } from '../world/models';
import { PERSON_SCALE, PERSON_SIZE } from '../world/models-people';
import { meshPicture, personPicture } from '../world/pictures';
import { skyAt } from '../world/sky';
import { buildChunks, project, unproject } from '../world/voxels';
import { SkyLayer } from './SkyLayer';

type Props = {
  world: World;
  worldId: WorldId;
  /** Residents living in this world. */
  residents: CharacterId[];
  onTilePress: (index: number) => void;
  onPersonPress?: (walker: Walker) => void;
  showExpansions: boolean;
  /** Pauses the residents while the screen isn't visible, to save battery. */
  animate: boolean;
  /** Time of day the world lives by; defaults to the real clock. */
  hour?: number | null;
};

const PADDING = 4; // in voxel units
/** Depth slices along x + y; characters are drawn between them. */
const SLICE = 4;
const TICK_MS = 100;
/** Half the figure's footprint in world voxels, to centre it on its position. */
const PERSON_HALF = (PERSON_SIZE * PERSON_SCALE) / 2;
/** The world opens zoomed in; pinch or the buttons zoom out to see all of it. */
const DEFAULT_ZOOM = 1.6;
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 4;
/** Finger movement (px) below which a touch still counts as a tap. */
const TAP_SLOP = 8;

/** Buildings whose windows or lamps glow at night, with the glow's radius in voxels. */
const LIGHTS: Partial<Record<ItemId, number>> = {
  lantern: 7,
  teahouse: 9,
  pagoda: 8,
  castle: 9,
  house: 9,
  konbini: 11,
  ramen: 9,
  station: 10,
  tower: 12,
  vending: 5,
  temple: 10,
  onsen: 8,
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function tileOutline(r: number, c: number, z: number): string {
  const x0 = c * TILE;
  const y0 = r * TILE;
  const corners = [project(x0, y0, z), project(x0 + TILE, y0, z), project(x0 + TILE, y0 + TILE, z), project(x0, y0 + TILE, z)];
  const inset = corners.map((p, i) => {
    // Pull the outline slightly inwards so neighbouring outlines don't touch.
    const o = corners[(i + 2) % 4];
    return { x: p.x + (o.x - p.x) * 0.08, y: p.y + (o.y - p.y) * 0.08 };
  });
  const center = project(x0 + TILE / 2, y0 + TILE / 2, z);
  const plus = `M ${center.x - 2} ${center.y} L ${center.x + 2} ${center.y} M ${center.x} ${center.y - 1.2} L ${center.x} ${center.y + 1.2}`;
  return `M ${inset.map((p) => `${p.x} ${p.y}`).join(' L ')} Z ${plus}`;
}

/** A pixel "Z" in world units, drawn as small squares like everything else. */
function pixelZ(cell: number): string {
  const cells = [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [1, 2], [0, 3], [1, 3], [2, 3], [3, 3]];
  return cells.map(([x, y]) => `M${x * cell} ${y * cell}h${cell}v${cell}h${-cell}Z`).join('');
}
const Z_PATH = pixelZ(0.55);

const tileCenter = (world: World, i: number, z: number) =>
  project((i % world.size) * TILE + TILE / 2, Math.floor(i / world.size) * TILE + TILE / 2, z);

const walkerVoxel = (w: Walker) => ({ x: w.x * TILE, y: w.y * TILE });
const walkerDepth = (w: Walker) => {
  const { x, y } = walkerVoxel(w);
  return Math.floor((x + y + PERSON_HALF * 2) / SLICE);
};

/** Deterministic randomness for spawning, so rendering stays pure. */
const seeded = (seed: string) => {
  let h = 0;
  for (const ch of seed) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  return () => {
    h = (Math.imul(h ^ (h >>> 15), 2246822519) + 0x9e3779b9) | 0;
    return ((h >>> 0) % 10000) / 10000;
  };
};

function reconcile(current: Walker[], world: World, residents: CharacterId[]): Walker[] {
  // Keep everyone who still lives here; newcomers appear at their home.
  const kept = current.filter((w) => residents.includes(w.id));
  const missing = residents.filter((id) => !kept.some((w) => w.id === id));
  const spawned = missing.map((id) => spawnWalker(world, id, seeded(id))).filter((w): w is Walker => w !== null);
  // A changed world can invalidate routes; let everyone plan again.
  return [...kept.map((w) => ({ ...w, path: [], until: 0 })), ...spawned];
}

const clockHour = (now: number) => {
  const d = new Date(now);
  return d.getHours() + d.getMinutes() / 60;
};

function useLife(world: World, worldId: WorldId, residents: CharacterId[], animate: boolean, hourOverride: number | null) {
  const [sim, setSim] = useState(() => ({ world, residents, walkers: reconcile([], world, residents), now: Date.now() }));

  // Adjusting state while rendering (instead of in an effect) avoids a frame with stale walkers.
  if (sim.world !== world || sim.residents !== residents) {
    setSim({ ...sim, world, residents, walkers: reconcile(sim.walkers, world, residents) });
  }

  useEffect(() => {
    if (!animate) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const hour = Math.floor(hourOverride ?? clockHour(now));
      setSim((s) => ({
        ...s,
        now,
        walkers: s.walkers.map((w) => stepWalker(w, s.world, worldId, hour, now, TICK_MS / 1000, Math.random)),
      }));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [animate, worldId, hourOverride]);

  return { walkers: sim.walkers, now: sim.now, hour: hourOverride ?? clockHour(sim.now) };
}

type Camera = { zoom: number; panX: number; panY: number };

function VoxelWorldImpl({ world, worldId, residents, onTilePress, onPersonPress, showExpansions, animate, hour = null }: Props) {
  const ref = useRef<HostInstance>(null);
  const origin = useRef({ left: 0, top: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState<Camera>({ zoom: DEFAULT_ZOOM, panX: 0, panY: 0 });

  // Building the world is the expensive part; it only happens when the world changes.
  const scene = useMemo(() => {
    const { chunks, bounds } = buildChunks(buildWorldGrid(world, worldId), SLICE);
    return { bounds, chunks: chunks.map((c) => ({ depth: c.depth, picture: meshPicture(c.mesh) })) };
  }, [world, worldId]);

  const life = useLife(world, worldId, residents, animate, hour);
  const sky = skyAt(life.hour);

  // Fit the whole world at zoom 1, then zoom around the centre of the view and add the pan.
  const view = useMemo(() => {
    const { minX, minY, maxX, maxY } = scene.bounds;
    const w = maxX - minX + PADDING * 2;
    const h = maxY - minY + PADDING * 2;
    const fit = Math.min(size.width / w, size.height / h);
    const scale = fit * camera.zoom;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return {
      scale,
      translateX: size.width / 2 - cx * scale + camera.panX,
      translateY: size.height / 2 - cy * scale + camera.panY,
    };
  }, [scene.bounds, size, camera]);

  /** Keeps at least part of the world on screen however far it is dragged. */
  const clampCamera = useCallback(
    (c: Camera): Camera => {
      const { minX, minY, maxX, maxY } = scene.bounds;
      const fit = Math.min(size.width / (maxX - minX + PADDING * 2), size.height / (maxY - minY + PADDING * 2));
      const zoom = clamp(c.zoom, MIN_ZOOM, MAX_ZOOM);
      const halfW = ((maxX - minX) * fit * zoom) / 2;
      const halfH = ((maxY - minY) * fit * zoom) / 2;
      return { zoom, panX: clamp(c.panX, -halfW, halfW), panY: clamp(c.panY, -halfH, halfH) };
    },
    [scene.bounds, size],
  );

  /** Zooms by `factor` keeping the point (px, py) of the view where it is. */
  const zoomAt = useCallback(
    (c: Camera, factor: number, px: number, py: number): Camera => {
      const zoom = clamp(c.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      const f = zoom / c.zoom;
      const dx = px - size.width / 2;
      const dy = py - size.height / 2;
      return clampCamera({ zoom, panX: dx - (dx - c.panX) * f, panY: dy - (dy - c.panY) * f });
    },
    [clampCamera, size],
  );

  const expansionPath = useMemo(() => {
    if (!showExpansions) return null;
    const parts: string[] = [];
    world.tiles.forEach((t, i) => {
      if (!t.unlocked && isNeighborOfLand(world, i)) parts.push(tileOutline(Math.floor(i / world.size), i % world.size, WATER_Z + 1));
    });
    return parts.join(' ');
  }, [world, showExpansions]);

  const lights = useMemo(
    () =>
      world.tiles.flatMap((t, i) => {
        const radius = t.unlocked && t.item ? LIGHTS[t.item] : undefined;
        return radius ? [{ i, radius, ...tileCenter(world, i, GROUND + 3) }] : [];
      }),
    [world],
  );

  const tileAt = (sx: number, sy: number, z: number) => {
    const p = unproject(sx, sy, z);
    const r = Math.floor(p.y / TILE);
    const c = Math.floor(p.x / TILE);
    if (r < 0 || c < 0 || r >= world.size || c >= world.size) return null;
    return r * world.size + c;
  };

  const handleTap = (pageX: number, pageY: number) => {
    const sx = (pageX - origin.current.left - view.translateX) / view.scale;
    const sy = (pageY - origin.current.top - view.translateY) / view.scale;
    // People first: tapping someone tells you what they're up to.
    const person = life.walkers.find((w) => {
      if (!w.visible) return false;
      const { x, y } = walkerVoxel(w);
      const p = project(x, y, GROUND + 2);
      return Math.hypot(p.x - sx, p.y - sy) < 3;
    });
    if (person && onPersonPress) return onPersonPress(person);
    // Then the ground surface, then sea level for tiles that are still water.
    const onLand = tileAt(sx, sy, GROUND);
    if (onLand !== null && world.tiles[onLand].unlocked) return onTilePress(onLand);
    const onWater = tileAt(sx, sy, WATER_Z + 1);
    if (onWater !== null) onTilePress(onWater);
  };

  // One finger drags, two fingers pinch; a touch that barely moves is a tap.
  const gesture = useRef({ moved: false, startX: 0, startY: 0, startDist: 0, startMidX: 0, startMidY: 0, start: camera, touches: 0 });
  const points = (e: GestureResponderEvent) => {
    const t = e.nativeEvent.touches;
    return t && t.length ? Array.from(t).map((p) => ({ x: p.pageX, y: p.pageY })) : [{ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }];
  };
  const beginGesture = (pts: { x: number; y: number }[], keepMoved: boolean) => {
    const g = gesture.current;
    g.touches = pts.length;
    g.start = camera;
    g.moved = keepMoved && g.moved;
    g.startX = pts[0].x;
    g.startY = pts[0].y;
    if (pts.length >= 2) {
      g.startDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
      g.startMidX = (pts[0].x + pts[1].x) / 2;
      g.startMidY = (pts[0].y + pts[1].y) / 2;
    }
  };
  const onGrant = (e: GestureResponderEvent) => {
    ref.current?.measure((_x, _y, _w, _h, left, top) => (origin.current = { left, top }));
    beginGesture(points(e), false);
  };
  const onMove = (e: GestureResponderEvent) => {
    const pts = points(e);
    const g = gesture.current;
    // A finger was added or lifted: continue smoothly from the current camera.
    if (pts.length !== g.touches) return beginGesture(pts, true);
    if (pts.length >= 2) {
      g.moved = true;
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const zoomed = zoomAt(g.start, dist / g.startDist, g.startMidX - origin.current.left, g.startMidY - origin.current.top);
      setCamera(clampCamera({ ...zoomed, panX: zoomed.panX + midX - g.startMidX, panY: zoomed.panY + midY - g.startMidY }));
      return;
    }
    const dx = pts[0].x - g.startX;
    const dy = pts[0].y - g.startY;
    if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    g.moved = true;
    setCamera(clampCamera({ ...g.start, panX: g.start.panX + dx, panY: g.start.panY + dy }));
  };
  const onRelease = (e: GestureResponderEvent) => {
    if (gesture.current.moved) return;
    const touch = e.nativeEvent.changedTouches?.[0] ?? e.nativeEvent;
    handleTap(touch.pageX, touch.pageY);
  };

  // Mouse wheel zoom in the browser.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = ref.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      setCamera((c) => zoomAt(c, Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
    ref.current?.measure((_x, _y, _w, _h, left, top) => (origin.current = { left, top }));
  };

  // Interleave world slices and people, back to front.
  const visible = life.walkers.filter((w) => w.visible).sort((a, b) => walkerDepth(a) - walkerDepth(b));
  const items: ReactNode[] = [];
  let next = 0;
  const drawPeopleUpTo = (depth: number) => {
    while (next < visible.length && walkerDepth(visible[next]) <= depth) {
      const w = visible[next++];
      const { x, y } = walkerVoxel(w);
      const p = project(x - PERSON_HALF, y - PERSON_HALF, GROUND);
      items.push(
        <Group key={`p-${w.id}`} transform={[{ translateX: p.x }, { translateY: p.y }, { scale: PERSON_SCALE }]}>
          <Picture picture={personPicture(w.id, w.frame)} />
        </Group>,
      );
    }
  };
  for (const chunk of scene.chunks) {
    drawPeopleUpTo(chunk.depth - 1);
    items.push(<Picture key={`c-${chunk.depth}`} picture={chunk.picture} />);
  }
  drawPeopleUpTo(Infinity);

  // One z-z-z above every house someone is sleeping in.
  const sleepTiles = [...new Set(life.walkers.filter((w) => !w.visible && w.sleepTile !== undefined).map((w) => w.sleepTile!))];
  const worldTransform = [{ translateX: view.translateX }, { translateY: view.translateY }, { scale: view.scale }];

  return (
    <View style={{ flex: 1 }}>
      <View
        ref={ref}
        style={{ flex: 1 }}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={onRelease}
        onResponderTerminationRequest={() => false}>
        {size.width > 0 && (
          <Canvas style={{ flex: 1 }} pointerEvents="none">
            <SkyLayer sky={sky} width={size.width} height={size.height} now={life.now} />
            <Group transform={worldTransform}>
              <Fragment>{items}</Fragment>
              {expansionPath && (
                <Path path={expansionPath} style="stroke" strokeWidth={0.5} color="rgba(255,255,255,0.9)">
                  <DashPathEffect intervals={[1.6, 1.2]} />
                </Path>
              )}
            </Group>

            {/* Night falls over the world; windows and lamps shine through it. */}
            {sky.darkness > 0 && <Rect x={0} y={0} width={size.width} height={size.height} color="rgb(14,18,46)" opacity={sky.darkness * 0.5} />}
            {sky.darkness > 0.05 && (
              <Group transform={worldTransform} opacity={sky.darkness} blendMode="screen">
                {lights.map((l) => (
                  <Circle key={l.i} cx={l.x} cy={l.y} r={l.radius}>
                    <RadialGradient c={vec(l.x, l.y)} r={l.radius} colors={['rgba(255,190,100,0.6)', 'rgba(255,190,100,0)']} />
                  </Circle>
                ))}
              </Group>
            )}
            <Group transform={worldTransform}>
              {sleepTiles.map((i) => {
                const roof = tileCenter(world, i, GROUND + 11);
                return [0, 1, 2].map((k) => {
                  const phase = ((life.now / 1000 + k * 0.9) % 2.7) / 2.7;
                  const s = 0.7 + phase * 0.8;
                  return (
                    <Group
                      key={`z-${i}-${k}`}
                      transform={[{ translateX: roof.x + 1 + Math.sin(phase * Math.PI * 1.5) * 2 + k * 0.6 }, { translateY: roof.y - phase * 10 }, { scale: s }]}
                      opacity={Math.sin(phase * Math.PI)}>
                      <Path path={Z_PATH} color="#F3EBDD" />
                    </Group>
                  );
                });
              })}
            </Group>
          </Canvas>
        )}
      </View>

      <View style={styles.zoom}>
        <Pressable style={styles.zoomButton} onPress={() => setCamera((c) => zoomAt(c, 1.4, size.width / 2, size.height / 2))}>
          <Text style={styles.zoomText}>＋</Text>
        </Pressable>
        <Pressable style={styles.zoomButton} onPress={() => setCamera((c) => zoomAt(c, 1 / 1.4, size.width / 2, size.height / 2))}>
          <Text style={styles.zoomText}>－</Text>
        </Pressable>
        <Pressable style={styles.zoomButton} onPress={() => setCamera({ zoom: DEFAULT_ZOOM, panX: 0, panY: 0 })}>
          <Text style={[styles.zoomText, { fontSize: 13 }]}>◎</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zoom: { position: 'absolute', left: 12, top: 8, gap: 6 },
  zoomButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(251,246,236,0.9)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { fontFamily: fonts.serif, fontSize: 18, color: colors.text, lineHeight: 20 },
});

export const VoxelWorld = memo(VoxelWorldImpl);
