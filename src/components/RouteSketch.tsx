import { memo } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Route } from '../lib/game';
import { colors } from '../theme';

type Props = { route: Route; width: number; height: number; strokeWidth?: number };

/** Draws a route like an ink stroke: no map, just the shape you ran. */
function RouteSketchImpl({ route, width, height, strokeWidth = 3 }: Props) {
  const points = route.flat();
  if (points.length < 2) return null;

  // Equirectangular projection is plenty accurate for the size of one run.
  const lat0 = (points.reduce((s, p) => s + p[0], 0) / points.length) * (Math.PI / 180);
  const xy = (p: [number, number]) => ({ x: p[1] * Math.cos(lat0), y: -p[0] });
  const all = points.map(xy);
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));

  const pad = strokeWidth * 2 + 4;
  const span = Math.max(maxX - minX, maxY - minY, 1e-6);
  const scale = Math.min((width - pad * 2) / Math.max(maxX - minX, span * 0.01), (height - pad * 2) / Math.max(maxY - minY, span * 0.01));
  const ox = (width - (maxX - minX) * scale) / 2;
  const oy = (height - (maxY - minY) * scale) / 2;
  const screen = (p: [number, number]) => {
    const q = xy(p);
    return { x: ox + (q.x - minX) * scale, y: oy + (q.y - minY) * scale };
  };

  const d = route
    .filter((seg) => seg.length > 1)
    .map((seg) =>
      seg
        .map(screen)
        .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' '),
    )
    .join(' ');
  const start = screen(points[0]);
  const end = screen(points[points.length - 1]);

  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={colors.ink} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={start.x} cy={start.y} r={strokeWidth * 1.6} fill={colors.primary} />
      <Circle cx={end.x} cy={end.y} r={strokeWidth * 1.6} fill={colors.ink} stroke={colors.surface} strokeWidth={strokeWidth * 0.6} />
    </Svg>
  );
}

export const RouteSketch = memo(RouteSketchImpl);
