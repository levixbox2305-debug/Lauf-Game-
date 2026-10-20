import { BlendMode, Skia, VertexMode } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { Image, PixelRatio } from 'react-native';

import type { CharacterId } from '../lib/characters';
import type { ItemId } from '../lib/game';
import { buildItemGrid } from '../world/models';
import { buildPersonGrid } from '../world/models-people';
import { buildMesh, type VoxelGrid } from '../world/voxels';

// Thumbnails are rendered once into PNGs on a CPU surface. A live Skia canvas per menu chip
// would need one WebGL context each, and browsers only allow about 16.
const cache = new Map<string, string>();

function renderThumb(key: string, build: () => VoxelGrid, px: number): string | null {
  const cacheKey = `${key}@${px}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const mesh = buildMesh(build());
  const surface = Skia.Surface.Make(px, px);
  if (!surface) return null;

  const { minX, minY, maxX, maxY } = mesh.bounds;
  const scale = Math.min(px / (maxX - minX), px / (maxY - minY));
  const canvas = surface.getCanvas();
  canvas.translate((px - (maxX - minX) * scale) / 2 - minX * scale, px - (maxY - minY) * scale - minY * scale);
  canvas.scale(scale, scale);
  const vertices = Skia.MakeVertices(
    VertexMode.Triangles,
    mesh.vertices,
    undefined,
    mesh.colors.map((c) => Skia.Color(c)),
    mesh.indices,
  );
  canvas.drawVertices(vertices, BlendMode.DstOver, Skia.Paint());
  surface.flush();

  const uri = `data:image/png;base64,${surface.makeImageSnapshot().encodeToBase64()}`;
  cache.set(cacheKey, uri);
  return uri;
}

function useThumb(key: string, build: () => VoxelGrid, size: number) {
  const px = Math.round(size * Math.min(3, PixelRatio.get()));
  // `build` is derived from `key`, so the key alone decides when to re-render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => renderThumb(key, build, px), [key, px]);
}

function ItemThumbImpl({ item, size }: { item: ItemId; size: number }) {
  const uri = useThumb(`item:${item}`, () => buildItemGrid(item), size);
  if (!uri) return null;
  return <Image source={{ uri }} style={{ width: size, height: size }} />;
}

function PersonThumbImpl({ id, size }: { id: CharacterId; size: number }) {
  const uri = useThumb(`person:${id}`, () => buildPersonGrid(id, 0), size);
  if (!uri) return null;
  return <Image source={{ uri }} style={{ width: size, height: size }} />;
}

export const ItemThumb = memo(ItemThumbImpl);
export const PersonThumb = memo(PersonThumbImpl);
