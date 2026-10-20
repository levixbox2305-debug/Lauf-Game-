import { BlendMode, Skia, VertexMode } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { Image, PixelRatio } from 'react-native';

import type { ItemId } from '../lib/game';
import { buildItemGrid } from '../world/models';
import { buildMesh } from '../world/voxels';

// Thumbnails are rendered once into PNGs on a CPU surface. A live Skia canvas per menu chip
// would need one WebGL context each, and browsers only allow about 16.
const cache = new Map<string, string>();

function renderThumb(item: ItemId, px: number): string | null {
  const key = `${item}@${px}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const mesh = buildMesh(buildItemGrid(item));
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
  cache.set(key, uri);
  return uri;
}

function ItemThumbImpl({ item, size }: { item: ItemId; size: number }) {
  const px = Math.round(size * Math.min(3, PixelRatio.get()));
  const uri = useMemo(() => renderThumb(item, px), [item, px]);
  if (!uri) return null;
  return <Image source={{ uri }} style={{ width: size, height: size }} />;
}

export const ItemThumb = memo(ItemThumbImpl);
