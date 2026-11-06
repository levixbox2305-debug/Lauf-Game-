import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { subscribe } from '../lib/tracker';
import { useDev } from '../state/DevProvider';
import { DevBadge } from './DevSheet';
import { colors, fonts } from '../theme';

const TABS: Record<string, { glyph: string; label: string }> = {
  index: { glyph: '島', label: 'Welt' },
  run: { glyph: '走', label: 'Laufen' },
  history: { glyph: '記', label: 'Verlauf' },
};

const BAR_HEIGHT = 62;
/** How far the centre stamp sticks out above the bar. */
const RAISE = 22;
const STAMP = 68;

/** Seigaiha: the traditional overlapping-wave pattern, drawn very faintly. */
const Seigaiha = memo(function Seigaiha({ width, height }: { width: number; height: number }) {
  const r = 14;
  const rows: string[][] = [];
  for (let row = 0, y = 0; y <= height + r; row++, y += r / 2) {
    const arcs: string[] = [];
    const offset = row % 2 ? r : 0;
    for (let x = -r + offset; x <= width + r; x += r * 2) {
      for (const k of [1, 0.66, 0.33]) {
        const rr = r * k;
        arcs.push(`M ${x - rr} ${y} A ${rr} ${rr} 0 0 1 ${x + rr} ${y}`);
      }
    }
    rows.push(arcs);
  }
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      {rows.map((arcs, i) => (
        // Each row is filled first so it covers the row behind it, like overlapping scales.
        <G key={i}>
          <Path d={arcs.filter((_, j) => j % 3 === 0).map((a) => `${a} Z`).join(' ')} fill={colors.ink} />
          <Path d={arcs.join(' ')} stroke="rgba(243,235,221,0.07)" strokeWidth={1.2} fill="none" />
        </G>
      ))}
    </Svg>
  );
});

export function InkTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const [running, setRunning] = useState(false);
  useEffect(() => subscribe((run) => setRunning(run !== null)), []);

  const { profile } = useDev();
  const routes = state.routes.filter((r) => TABS[r.name]);
  const height = BAR_HEIGHT + insets.bottom;

  return (
    <View style={[styles.container, { height: height + RAISE }]}>
      {profile === 'sandbox' && (
        <View style={styles.devBadge}>
          <DevBadge />
        </View>
      )}
      <View style={[styles.bar, { height }]}>
        <Seigaiha width={width} height={height} />
        <View style={styles.topLine} />
      </View>

      <View style={[styles.row, { paddingBottom: insets.bottom }]}>
        {routes.map((route) => {
          const focused = state.routes[state.index]?.key === route.key;
          const tab = TABS[route.name];
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          if (route.name === 'run') {
            return (
              <Pressable key={route.key} onPress={onPress} style={styles.centerSlot} accessibilityRole="button" accessibilityLabel={tab.label}>
                {({ pressed }) => (
                  <>
                    <View style={[styles.stamp, focused && styles.stampFocused, pressed && { transform: [{ scale: 0.95 }] }]}>
                      <Text style={styles.stampGlyph}>{tab.glyph}</Text>
                      {running && <View style={styles.liveDot} />}
                    </View>
                    <Text style={[styles.label, focused && styles.labelFocused]}>{running ? 'Läuft' : tab.label}</Text>
                  </>
                )}
              </Pressable>
            );
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.slot} accessibilityRole="button" accessibilityLabel={tab.label}>
              <View style={[styles.seal, focused && styles.sealFocused]}>
                <Text style={[styles.glyph, focused && styles.glyphFocused]}>{tab.glyph}</Text>
              </View>
              <Text style={[styles.label, focused && styles.labelFocused]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The transparent strip above the bar keeps the raised stamp tappable on Android.
  container: { justifyContent: 'flex-end', backgroundColor: colors.background },
  devBadge: { position: 'absolute', top: 0, left: 12, zIndex: 1 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.ink, overflow: 'hidden' },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'flex-end', height: '100%' },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  seal: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sealFocused: { backgroundColor: colors.primary, transform: [{ rotate: '-4deg' }] },
  glyph: { fontFamily: fonts.serif, fontSize: 20, color: colors.inkSoft },
  glyphFocused: { color: colors.onPrimary },
  label: { fontFamily: fonts.serif, fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  labelFocused: { color: colors.background, fontWeight: '700' },
  centerSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  stamp: {
    width: STAMP,
    height: STAMP,
    borderRadius: STAMP / 2,
    backgroundColor: colors.primaryDark,
    borderWidth: 4,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  stampFocused: { backgroundColor: colors.primary },
  stampGlyph: { fontFamily: fonts.serif, fontSize: 30, color: colors.onPrimary },
  liveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.sakura,
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
