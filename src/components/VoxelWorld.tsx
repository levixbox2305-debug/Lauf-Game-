import { Canvas, DashPathEffect, Group, Path, Vertices } from '@shopify/react-native-skia';
import { memo, useMemo, useRef, useState } from 'react';
import { Pressable, type GestureResponderEvent, type HostInstance, type LayoutChangeEvent } from 'react-native';

import { isNeighborOfLand, type World } from '../lib/game';
import { buildWorldGrid, GROUND, TILE, WATER_Z } from '../world/models';
import { buildMesh, project, unproject, type Mesh } from '../world/voxels';

type Props = {
  world: World;
  onTilePress: (index: number) => void;
  showExpansions: boolean;
};

const PADDING = 6; // in voxel units

function fit(mesh: Mesh, width: number, height: number) {
  const { minX, minY, maxX, maxY } = mesh.bounds;
  const w = maxX - minX + PADDING * 2;
  const h = maxY - minY + PADDING * 2;
  const scale = Math.min(width / w, height / h);
  return {
    scale,
    translateX: (width - w * scale) / 2 + (PADDING - minX) * scale,
    translateY: (height - h * scale) / 2 + (PADDING - minY) * scale,
  };
}

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

function VoxelWorldImpl({ world, onTilePress, showExpansions }: Props) {
  const ref = useRef<HostInstance>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Rebuilding the mesh is the expensive part, so it only happens when the world changes.
  const mesh = useMemo(() => buildMesh(buildWorldGrid(world)), [world]);
  const view = fit(mesh, size.width, size.height);

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
      // Try the grass surface first, then the sea level for tiles that are still water.
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

  return (
    <Pressable ref={ref} style={{ flex: 1 }} onPress={handlePress} onLayout={onLayout}>
      {size.width > 0 && (
        <Canvas style={{ flex: 1 }} pointerEvents="none">
          <Group transform={[{ translateX: view.translateX }, { translateY: view.translateY }, { scale: view.scale }]}>
            <Vertices vertices={mesh.vertices} colors={mesh.colors} indices={mesh.indices} mode="triangles" />
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
