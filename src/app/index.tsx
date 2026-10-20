import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemThumb } from '../components/ItemThumb';
import { VoxelWorld } from '../components/VoxelWorld';
import { expansionCost, ITEMS, levelFor, type ItemId } from '../lib/game';
import { useGame } from '../state/GameProvider';
import { colors, fonts } from '../theme';

type Tool = { kind: 'build'; item: ItemId } | { kind: 'expand' } | { kind: 'demolish' };

export default function WorldScreen() {
  const insets = useSafeAreaInsets();
  const { state, totalKm, build, demolish, expand } = useGame();
  const [tool, setTool] = useState<Tool>({ kind: 'build', item: 'sakura' });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2500);
    return () => clearTimeout(t);
  }, [message]);

  const onTilePress = useCallback(
    (index: number) => {
      const tile = state.world.tiles[index];
      if (!tile) return;
      let error: string | null = null;
      if (!tile.unlocked) error = expand(index);
      else if (tool.kind === 'demolish') error = demolish(index);
      else if (tool.kind === 'build') error = build(index, tool.item);
      else error = 'Tippe auf ein markiertes Feld im Wasser, um Land zu gewinnen.';
      setMessage(error);
    },
    [state.world.tiles, tool, build, demolish, expand],
  );

  const level = levelFor(totalKm);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Laufwelt</Text>
          <Text style={styles.subtitle}>走る世界</Text>
        </View>
        <View style={styles.seal}>
          <Text style={styles.sealText}>⚡ {state.energy}</Text>
        </View>
      </View>
      <Text style={styles.km}>
        <Text style={styles.kmStrong}>{totalKm.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km</Text> gelaufen · Level{' '}
        {level.level}
      </Text>

      <View style={styles.worldBox}>
        <VoxelWorld world={state.world} onTilePress={onTilePress} showExpansions={tool.kind === 'expand'} />
        {message && (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{message}</Text>
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.palette}
        contentContainerStyle={styles.paletteRow}>
        <ToolChip
          glyph="島"
          label="Land"
          sub={`${expansionCost(state.world)} ⚡`}
          active={tool.kind === 'expand'}
          onPress={() => setTool({ kind: 'expand' })}
        />
        {ITEMS.map((item) => {
          const locked = totalKm < item.unlockKm;
          return (
            <ToolChip
              key={item.id}
              item={item.id}
              label={item.name}
              sub={locked ? `🔒 ${item.unlockKm} km` : `${item.cost} ⚡`}
              locked={locked}
              dim={!locked && state.energy < item.cost}
              active={tool.kind === 'build' && tool.item === item.id}
              onPress={() => setTool({ kind: 'build', item: item.id })}
            />
          );
        })}
        <ToolChip
          glyph="壊"
          label="Abreißen"
          sub="50 % zurück"
          active={tool.kind === 'demolish'}
          onPress={() => setTool({ kind: 'demolish' })}
        />
      </ScrollView>
    </View>
  );
}

function ToolChip(props: {
  item?: ItemId;
  glyph?: string;
  label: string;
  sub: string;
  active: boolean;
  locked?: boolean;
  dim?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.chip, props.active && styles.chipActive, (props.locked || props.dim) && !props.active && styles.chipDim]}>
      <View style={[styles.chipArt, props.locked && { opacity: 0.4 }]}>
        {props.item ? <ItemThumb item={props.item} size={44} /> : <Text style={styles.glyph}>{props.glyph}</Text>}
      </View>
      <Text style={styles.chipLabel} numberOfLines={1}>
        {props.label}
      </Text>
      <Text style={styles.chipSub} numberOfLines={1}>
        {props.sub}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  title: { fontFamily: fonts.serif, fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: 0.5 },
  subtitle: { fontFamily: fonts.serif, fontSize: 12, letterSpacing: 4, color: colors.textMuted },
  seal: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  sealText: { fontFamily: fonts.mono, color: colors.onPrimary, fontWeight: '700', fontSize: 18 },
  km: { fontFamily: fonts.serif, paddingHorizontal: 18, marginTop: 6, fontSize: 14, color: colors.textMuted },
  kmStrong: { color: colors.text, fontWeight: '700' },
  worldBox: { flex: 1 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    backgroundColor: 'rgba(43,42,40,0.92)',
    borderRadius: 8,
    padding: 12,
  },
  toastText: { fontFamily: fonts.serif, color: colors.background, textAlign: 'center', fontSize: 14 },
  palette: { flexGrow: 0, paddingVertical: 10 },
  paletteRow: { paddingHorizontal: 12, gap: 8 },
  chip: {
    width: 78,
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 6,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.primary },
  chipDim: { opacity: 0.55 },
  chipArt: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontFamily: fonts.serif, fontSize: 28, color: colors.ink },
  chipLabel: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.text },
  chipSub: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted },
});
