import { memo, useMemo, useRef } from 'react';
import { Pressable, type GestureResponderEvent, type HostInstance } from 'react-native';
import Svg, { G, Polygon, Text as SvgText } from 'react-native-svg';

import { ITEM_BY_ID, isNeighborOfLand, type World } from '../lib/game';
import { colors } from '../theme';

const TW = 64; // tile width
const TH = 32; // tile height
const HALF_W = TW / 2;
const HALF_H = TH / 2;
const DEPTH = 12; // height of the island's cliff faces
const HEADROOM = 28; // space above the top row for tall emoji

type Props = {
  world: World;
  onTilePress: (index: number) => void;
  showExpansions: boolean;
};

type ViewBox = { x: number; y: number; w: number; h: number };

const tileCenter = (r: number, c: number) => ({ x: (c - r) * HALF_W, y: (c + r) * HALF_H });

/** Frames the island plus one ring of water, so the camera grows with the world. */
function computeViewBox(world: World): ViewBox {
  const { size, tiles } = world;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  tiles.forEach((t, i) => {
    if (!t.unlocked && !isNeighborOfLand(world, i)) return;
    const { x, y } = tileCenter(Math.floor(i / size), i % size);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  const x = minX - HALF_W;
  const y = minY - HALF_H - HEADROOM;
  return { x, y, w: maxX + HALF_W - x, h: maxY + HALF_H + DEPTH - y };
}

function IsoWorldImpl({ world, onTilePress, showExpansions }: Props) {
  const { size, tiles } = world;
  const containerRef = useRef<HostInstance>(null);

  const viewBox = useMemo(() => computeViewBox(world), [world]);
  // Painter's algorithm: tiles further back (smaller r + c) are drawn first.
  const order = useMemo(
    () => tiles.map((_, i) => i).sort((a, b) => depth(a, size) - depth(b, size)),
    [tiles, size],
  );

  const isLand = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < size && c < size && tiles[r * size + c].unlocked;

  // One touch handler for the whole map: convert the touch point back into grid coordinates.
  // pageX/pageY are used because locationX is unreliable over SVG children on web.
  const handlePress = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    containerRef.current?.measure((_x, _y, width, height, left, top) => {
      const scale = Math.min(width / viewBox.w, height / viewBox.h);
      if (!scale) return;
      const offsetX = (width - viewBox.w * scale) / 2;
      const offsetY = (height - viewBox.h * scale) / 2;
      const vx = viewBox.x + (pageX - left - offsetX) / scale;
      const vy = viewBox.y + (pageY - top - offsetY) / scale;
      const c = Math.round((vx / HALF_W + vy / HALF_H) / 2);
      const r = Math.round((vy / HALF_H - vx / HALF_W) / 2);
      if (!(r >= 0 && c >= 0 && r < size && c < size)) return;
      onTilePress(r * size + c);
    });
  };

  return (
    <Pressable ref={containerRef} style={{ flex: 1 }} onPress={handlePress}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        pointerEvents="none">
        {order.map((i) => {
          const r = Math.floor(i / size);
          const c = i % size;
          const { x, y } = tileCenter(r, c);
          const tile = tiles[i];
          const top = `${x},${y - HALF_H} ${x + HALF_W},${y} ${x},${y + HALF_H} ${x - HALF_W},${y}`;

          if (!tile.unlocked) {
            if (!showExpansions || !isNeighborOfLand(world, i)) return null;
            return (
              <G key={i}>
                <Polygon
                  points={top}
                  fill={colors.shallowWater}
                  stroke={colors.foam}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                <SvgText x={x} y={y + 5} fontSize={14} fontWeight="bold" fill={colors.foam} textAnchor="middle">
                  +
                </SvgText>
              </G>
            );
          }

          const grass = (r + c) % 2 === 0 ? colors.grass : colors.grassAlt;
          // Cliff faces only where the island ends, so neighbouring tiles read as one surface.
          return (
            <G key={i}>
              {!isLand(r + 1, c) && (
                <Polygon
                  points={`${x - HALF_W},${y} ${x},${y + HALF_H} ${x},${y + HALF_H + DEPTH} ${x - HALF_W},${y + DEPTH}`}
                  fill={colors.cliffLeft}
                />
              )}
              {!isLand(r, c + 1) && (
                <Polygon
                  points={`${x + HALF_W},${y} ${x},${y + HALF_H} ${x},${y + HALF_H + DEPTH} ${x + HALF_W},${y + DEPTH}`}
                  fill={colors.cliffRight}
                />
              )}
              <Polygon points={top} fill={grass} stroke={colors.grassEdge} strokeWidth={0.5} />
            </G>
          );
        })}

        {order.map((i) => {
          const item = tiles[i].item;
          if (!item || !tiles[i].unlocked) return null;
          const { x, y } = tileCenter(Math.floor(i / size), i % size);
          return (
            <SvgText key={`item-${i}`} x={x} y={y + 6} fontSize={30} textAnchor="middle">
              {ITEM_BY_ID[item].emoji}
            </SvgText>
          );
        })}
      </Svg>
    </Pressable>
  );
}

function depth(i: number, size: number) {
  return Math.floor(i / size) + (i % size);
}

export const IsoWorld = memo(IsoWorldImpl);
