import { Canvas, DashPathEffect, Group, Path, Picture } from '@shopify/react-native-skia';
import { Fragment, memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type HostInstance, type LayoutChangeEvent } from 'react-native';

import type { CharacterId } from '../lib/characters';
import { isNeighborOfLand, type World, type WorldId } from '../lib/game';
import { spawnWalker, stepWalker, type Walker } from '../world/life';
import { buildWorldGrid, GROUND, TILE, WATER_Z } from '../world/models';
import { PERSON_SCALE, PERSON_SIZE } from '../world/models-people';
import { meshPicture, personPicture } from '../world/pictures';
import { buildChunks, project, unproject } from '../world/voxels';

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
};

const PADDING = 6; // in voxel units
/** Depth slices along x + y; characters are drawn between them. */
const SLICE = 4;
const TICK_MS = 100;
/** Half the figure's footprint in world voxels, to centre it on its position. */
const PERSON_HALF = (PERSON_SIZE * PERSON_SCALE) / 2;

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

function useResidents(world: World, worldId: WorldId, residents: CharacterId[], animate: boolean) {
  const [sim, setSim] = useState(() => ({ world, residents, walkers: reconcile([], world, residents) }));

  // Adjusting state while rendering (instead of in an effect) avoids a frame with stale walkers.
  if (sim.world !== world || sim.residents !== residents) {
    setSim({ world, residents, walkers: reconcile(sim.walkers, world, residents) });
  }

  useEffect(() => {
    if (!animate) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const hour = new Date(now).getHours();
      setSim((s) => ({
        ...s,
        walkers: s.walkers.map((w) => stepWalker(w, s.world, worldId, hour, now, TICK_MS / 1000, Math.random)),
      }));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [animate, worldId]);

  return sim.walkers;
}

function VoxelWorldImpl({ world, worldId, residents, onTilePress, onPersonPress, showExpansions, animate }: Props) {
  const ref = useRef<HostInstance>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Building the world is the expensive part; it only happens when the world changes.
  const scene = useMemo(() => {
    const { chunks, bounds } = buildChunks(buildWorldGrid(world, worldId), SLICE);
    return { bounds, chunks: chunks.map((c) => ({ depth: c.depth, picture: meshPicture(c.mesh) })) };
  }, [world, worldId]);

  const walkers = useResidents(world, worldId, residents, animate);

  const view = useMemo(() => {
    const { minX, minY, maxX, maxY } = scene.bounds;
    const w = maxX - minX + PADDING * 2;
    const h = maxY - minY + PADDING * 2;
    const scale = Math.min(size.width / w, size.height / h);
    return {
      scale,
      translateX: (size.width - w * scale) / 2 + (PADDING - minX) * scale,
      translateY: (size.height - h * scale) / 2 + (PADDING - minY) * scale,
    };
  }, [scene.bounds, size]);

  const expansionPath = useMemo(() => {
    if (!showExpansions) return null;
    const parts: string[] = [];
    world.tiles.forEach((t, i) => {
      if (!t.unlocked && isNeighborOfLand(world, i)) parts.push(tileOutline(Math.floor(i / world.size), i % world.size, WATER_Z + 1));
    });
    return parts.join(' ');
  }, [world, showExpansions]);

  const tileAt = (sx: number, sy: number, z: number) => {
    const p = unproject(sx, sy, z);
    const r = Math.floor(p.y / TILE);
    const c = Math.floor(p.x / TILE);
    if (r < 0 || c < 0 || r >= world.size || c >= world.size) return null;
    return r * world.size + c;
  };

  // pageX/pageY are used because locationX is unreliable over canvas children on web.
  const handlePress = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    ref.current?.measure((_x, _y, _w, _h, left, top) => {
      const sx = (pageX - left - view.translateX) / view.scale;
      const sy = (pageY - top - view.translateY) / view.scale;
      // People first: tapping someone tells you what they're up to.
      const person = walkers.find((w) => {
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
    });
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  // Interleave world slices and people, back to front.
  const visible = walkers.filter((w) => w.visible).sort((a, b) => walkerDepth(a) - walkerDepth(b));
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

  return (
    <Pressable ref={ref} style={{ flex: 1 }} onPress={handlePress} onLayout={onLayout}>
      {size.width > 0 && (
        <Canvas style={{ flex: 1 }} pointerEvents="none">
          <Group transform={[{ translateX: view.translateX }, { translateY: view.translateY }, { scale: view.scale }]}>
            <Fragment>{items}</Fragment>
            {expansionPath && (
              <Path path={expansionPath} style="stroke" strokeWidth={0.5} color="rgba(255,255,255,0.9)">
                <DashPathEffect intervals={[1.6, 1.2]} />
              </Path>
            )}
          </Group>
        </Canvas>
      )}
    </Pressable>
  );
}

export const VoxelWorld = memo(VoxelWorldImpl);
