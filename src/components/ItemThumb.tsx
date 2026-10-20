import { Canvas, Group, Vertices } from '@shopify/react-native-skia';
import { memo } from 'react';

import type { ItemId } from '../lib/game';
import { buildItemGrid } from '../world/models';
import { buildMesh, type Mesh } from '../world/voxels';

// Item models never change, so each mesh is built once per app start.
const cache = new Map<ItemId, Mesh>();
function meshFor(item: ItemId): Mesh {
  let mesh = cache.get(item);
  if (!mesh) {
    mesh = buildMesh(buildItemGrid(item));
    cache.set(item, mesh);
  }
  return mesh;
}

function ItemThumbImpl({ item, size }: { item: ItemId; size: number }) {
  const mesh = meshFor(item);
  const { minX, minY, maxX, maxY } = mesh.bounds;
  const scale = Math.min(size / (maxX - minX), size / (maxY - minY));
  const tx = (size - (maxX - minX) * scale) / 2 - minX * scale;
  const ty = size - (maxY - minY) * scale - minY * scale; // stand items on the bottom edge

  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ translateX: tx }, { translateY: ty }, { scale }]}>
        <Vertices vertices={mesh.vertices} colors={mesh.colors} indices={mesh.indices} mode="triangles" />
      </Group>
    </Canvas>
  );
}

export const ItemThumb = memo(ItemThumbImpl);
