import { Circle, Group, LinearGradient, Path, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { memo } from 'react';

import { arcPosition, type Sky } from '../world/sky';

/** Builds a pixelated disc as one path; `cut` carves out a second disc for the crescent moon. */
function pixelDisc(radius: number, cell: number, cut?: { dx: number; dy: number }): string {
  const parts: string[] = [];
  for (let y = -radius; y < radius; y++) {
    for (let x = -radius; x < radius; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (Math.hypot(cx, cy) > radius) continue;
      if (cut && Math.hypot(cx - cut.dx, cy - cut.dy) < radius * 0.9) continue;
      parts.push(`M${x * cell} ${y * cell}h${cell}v${cell}h${-cell}Z`);
    }
  }
  return parts.join('');
}

const SUN = pixelDisc(5, 3.2);
const MOON = pixelDisc(4, 3, { dx: 2.2, dy: -1.2 });

/** Fixed star field, so stars don't jump around between frames. */
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => {
    const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return { x: r(1), y: r(2) * 0.8, size: r(3) > 0.85 ? 2.5 : 1.5, speed: 0.6 + r(4) * 1.4, phase: r(5) * Math.PI * 2 };
});

type Props = { sky: Sky; width: number; height: number; now: number };

function SkyLayerImpl({ sky, width, height, now }: Props) {
  // A high horizon keeps the rising and setting sun visible above the world.
  const horizon = height * 0.5;
  const arcHeight = height * 0.4;
  const sun = sky.sun !== null ? arcPosition(sky.sun, width, horizon, arcHeight) : null;
  const moon = sky.moon !== null ? arcPosition(sky.moon, width, horizon, arcHeight) : null;
  // The sun turns orange near the horizon.
  const low = sky.sun !== null ? 1 - Math.sin(Math.PI * sky.sun) : 0;
  const sunColor = low > 0.55 ? '#F08A24' : low > 0.3 ? '#F5B342' : '#F7D35A';

  return (
    <Group>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[sky.top, sky.bottom]} />
      </Rect>

      {sky.darkness > 0.05 &&
        STARS.map((s, i) => {
          const twinkle = 0.55 + 0.45 * Math.sin(now / 1000 * s.speed + s.phase);
          return (
            <Rect
              key={i}
              x={s.x * width}
              y={s.y * height * 0.9}
              width={s.size}
              height={s.size}
              color="#FFF8E7"
              opacity={sky.darkness * twinkle}
            />
          );
        })}

      {sun && (
        <Group transform={[{ translateX: sun.x }, { translateY: sun.y }]}>
          <Circle cx={0} cy={0} r={46}>
            <RadialGradient c={vec(0, 0)} r={46} colors={['rgba(255,214,120,0.55)', 'rgba(255,214,120,0)']} />
          </Circle>
          <Path path={SUN} color={sunColor} />
        </Group>
      )}
      {moon && (
        <Group transform={[{ translateX: moon.x }, { translateY: moon.y }]}>
          <Circle cx={0} cy={0} r={30}>
            <RadialGradient c={vec(0, 0)} r={30} colors={['rgba(230,236,255,0.25)', 'rgba(230,236,255,0)']} />
          </Circle>
          <Path path={MOON} color="#F2EFE3" />
        </Group>
      )}
    </Group>
  );
}

export const SkyLayer = memo(SkyLayerImpl);
