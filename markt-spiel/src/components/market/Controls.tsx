import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Dir } from '../../market/map';
import { retro } from './retro';

type Props = {
  onDir: (dir: Dir | null) => void;
  onA: () => void;
  onB: (down: boolean) => void;
  onStart: () => void;
};

const PAD = 132;
const KEY = 44;

/** A handheld-style control deck: D-pad left, A/B right, START in the middle. */
function ControlsImpl({ onDir, onA, onB, onStart }: Props) {
  const dirKey = (dir: Dir, style: object, glyph: string) => (
    <Pressable
      accessibilityLabel={dir}
      onPressIn={() => onDir(dir)}
      onPressOut={() => onDir(null)}
      style={({ pressed }) => [styles.dirKey, style, pressed && styles.pressed]}>
      <Text style={styles.dirGlyph}>{glyph}</Text>
    </Pressable>
  );

  return (
    <View style={styles.deck}>
      <View style={styles.pad}>
        {dirKey('up', { left: KEY, top: 0 }, '▲')}
        {dirKey('left', { left: 0, top: KEY }, '◀')}
        <View style={[styles.dirKey, styles.center, { left: KEY, top: KEY }]} />
        {dirKey('right', { left: KEY * 2, top: KEY }, '▶')}
        {dirKey('down', { left: KEY, top: KEY * 2 }, '▼')}
      </View>

      <Pressable onPress={onStart} style={({ pressed }) => [styles.start, pressed && styles.pressed]} accessibilityLabel="Menü">
        <Text style={styles.startText}>MENÜ</Text>
      </Pressable>

      <View style={styles.ab}>
        <Pressable
          onPressIn={() => onB(true)}
          onPressOut={() => onB(false)}
          style={({ pressed }) => [styles.round, styles.b, pressed && styles.pressed]}
          accessibilityLabel="B">
          <Text style={styles.roundText}>B</Text>
        </Pressable>
        <Pressable onPress={onA} style={({ pressed }) => [styles.round, styles.a, pressed && styles.pressed]} accessibilityLabel="A">
          <Text style={styles.roundText}>A</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: retro.shell,
    borderTopWidth: 3,
    borderTopColor: retro.shellDark,
  },
  pad: { width: PAD, height: PAD },
  dirKey: {
    position: 'absolute',
    width: KEY,
    height: KEY,
    backgroundColor: '#3A3438',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  center: { borderRadius: 0 },
  dirGlyph: { color: '#8C8489', fontSize: 16 },
  pressed: { opacity: 0.6, transform: [{ scale: 0.94 }] },
  start: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#8C8489',
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  startText: { fontFamily: retro.font, fontWeight: '700', fontSize: 11, color: '#FFFFFF', letterSpacing: 1 },
  ab: { flexDirection: 'row', alignItems: 'center', gap: 14, transform: [{ rotate: '-18deg' }] },
  round: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#5E0718',
  },
  a: { backgroundColor: retro.accent, marginBottom: 26 },
  b: { backgroundColor: retro.accentDark },
  roundText: { fontFamily: retro.font, fontWeight: '900', fontSize: 20, color: '#FFFFFF' },
});

export const Controls = memo(ControlsImpl);
