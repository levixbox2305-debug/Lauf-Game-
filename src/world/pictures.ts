import { BlendMode, createPicture, Skia, VertexMode, type SkPicture } from '@shopify/react-native-skia';

import type { CharacterId } from '../lib/characters';
import { buildPersonGrid } from './models-people';
import { buildMesh, type Mesh } from './voxels';

/**
 * Records a mesh into a picture once. Redrawing a picture is cheap, so the scene can be
 * re-rendered every animation frame without converting thousands of vertices again.
 */
export function meshPicture(mesh: Mesh): SkPicture {
  const vertices = Skia.MakeVertices(
    VertexMode.Triangles,
    mesh.vertices,
    undefined,
    mesh.colors.map((c) => Skia.Color(c)),
    mesh.indices,
  );
  const paint = Skia.Paint();
  const { minX, minY, maxX, maxY } = mesh.bounds;
  return createPicture(
    (canvas) => canvas.drawVertices(vertices, BlendMode.DstOver, paint),
    Skia.XYWHRect(minX - 1, minY - 1, maxX - minX + 2, maxY - minY + 2),
  );
}

const people = new Map<string, SkPicture>();

export function personPicture(id: CharacterId, frame: 0 | 1): SkPicture {
  const key = `${id}:${frame}`;
  let picture = people.get(key);
  if (!picture) {
    picture = meshPicture(buildMesh(buildPersonGrid(id, frame)));
    people.set(key, picture);
  }
  return picture;
}
