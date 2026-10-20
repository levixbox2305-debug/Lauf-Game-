import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemThumb } from '../components/ItemThumb';
import { ResidentsSheet } from '../components/ResidentsSheet';
import { VoxelWorld } from '../components/VoxelWorld';
import { CHARACTER_BY_ID, challengeText, charactersForItem } from '../lib/characters';
import {
  expansionCost,
  ITEMS,
  levelFor,
  STREAK_ITEMS,
  WORLDS,
  worldUnlocked,
  type ItemId,
  type StreakItemId,
  type WorldId,
} from '../lib/game';
import type { Walker } from '../world/life';
import { useGame } from '../state/GameProvider';
import { colors, fonts } from '../theme';

type Tool = { kind: 'build'; item: ItemId } | { kind: 'expand' } | { kind: 'demolish' };

const firstItem = (world: WorldId): ItemId => ITEMS.find((i) => i.world === world)!.id;

export default function WorldScreen() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { state, totalKm, build, demolish, expand, switchWorld } = useGame();
  const worldId = state.activeWorld;
  const world = state.worlds[worldId];
  const [tool, setTool] = useState<Tool>({ kind: 'build', item: firstItem(worldId) });
  const [message, setMessage] = useState<string | null>(null);
  const [showResidents, setShowResidents] = useState(false);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  const residents = useMemo(
    () => state.residents.filter((id) => CHARACTER_BY_ID[id].world === worldId),
    [state.residents, worldId],
  );

  const onTilePress = useCallback(
    (index: number) => {
      const tile = world.tiles[index];
      if (!tile) return;
      let error: string | null = null;
      if (!tile.unlocked) error = expand(index);
      else if (tool.kind === 'demolish') error = demolish(index);
      else if (tool.kind === 'build') {
        error = build(index, tool.item);
        // A new kind of building opens its resident's challenge.
        const newcomer = charactersForItem(tool.item).find(
          (c) => !state.residents.includes(c.id) && !world.tiles.some((t) => t.item === c.home),
        );
        if (!error && newcomer) {
          error = `Neue Challenge: ${challengeText(newcomer.challenge)} – dann zieht ${newcomer.name} (${newcomer.role}) ein.`;
        }
      } else error = 'Tippe auf ein markiertes Feld im Wasser, um Land zu gewinnen.';
      setMessage(error);
    },
    [world, tool, build, demolish, expand, state.residents],
  );

  const onPersonPress = useCallback((w: Walker) => {
    const c = CHARACTER_BY_ID[w.id];
    setMessage(`${c.name} · ${c.role} – ${w.doing}`);
  }, []);

  const onWorldPress = (id: WorldId) => {
    const error = switchWorld(id);
    if (error) return setMessage(error);
    if (id !== worldId) setTool({ kind: 'build', item: firstItem(id) });
  };

  const level = levelFor(totalKm);
  const worldPeople = Object.values(CHARACTER_BY_ID).filter((c) => c.world === worldId).length;

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

      <View style={styles.worldTabs}>
        {WORLDS.map((w) => {
          const open = worldUnlocked(w.id, totalKm);
          const active = w.id === worldId;
          return (
            <Pressable key={w.id} onPress={() => onWorldPress(w.id)} style={[styles.worldTab, active && styles.worldTabActive]}>
              <Text style={[styles.worldGlyph, active && styles.worldTextActive, !open && styles.worldLocked]}>{w.glyph}</Text>
              <Text style={[styles.worldName, active && styles.worldTextActive, !open && styles.worldLocked]}>
                {open ? w.name : `${w.unlockKm} km`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.worldBox}>
        <VoxelWorld
          world={world}
          worldId={worldId}
          residents={residents}
          onTilePress={onTilePress}
          onPersonPress={onPersonPress}
          showExpansions={tool.kind === 'expand'}
          animate={focused}
        />
        <Pressable style={styles.residentsButton} onPress={() => setShowResidents(true)}>
          <Text style={styles.residentsGlyph}>住</Text>
          <Text style={styles.residentsText}>
            {residents.length}/{worldPeople}
          </Text>
        </Pressable>
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
          sub={`${expansionCost(world)} ⚡`}
          active={tool.kind === 'expand'}
          onPress={() => setTool({ kind: 'expand' })}
        />
        {ITEMS.filter((item) => item.world === worldId).map((item) => {
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
        <View style={styles.divider}>
          <Text style={styles.dividerGlyph}>連</Text>
          <Text style={styles.dividerText}>Streak</Text>
        </View>
        {STREAK_ITEMS.map((item) => {
          const weeks = item.streakWeeks!;
          const earned = state.claimedStreaks.includes(weeks);
          const count = state.inventory[item.id as StreakItemId] ?? 0;
          return (
            <ToolChip
              key={item.id}
              item={item.id}
              label={item.name}
              sub={!earned ? `🔒 ${weeks} Wo.` : count > 0 ? `× ${count}` : 'platziert'}
              locked={!earned}
              dim={earned && count === 0}
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

      <ResidentsSheet visible={showResidents} onClose={() => setShowResidents(false)} state={state} worldId={worldId} />
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
  worldTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  worldTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  worldTabActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  worldGlyph: { fontFamily: fonts.serif, fontSize: 16, color: colors.text },
  worldName: { fontFamily: fonts.serif, fontSize: 13, color: colors.text },
  worldTextActive: { color: colors.background },
  worldLocked: { color: colors.textMuted },
  worldBox: { flex: 1 },
  residentsButton: {
    position: 'absolute',
    top: 8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  residentsGlyph: { fontFamily: fonts.serif, fontSize: 16, color: colors.primary },
  residentsText: { fontFamily: fonts.mono, fontSize: 13, color: colors.text },
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
  divider: { width: 34, alignItems: 'center', justifyContent: 'center' },
  dividerGlyph: { fontFamily: fonts.serif, fontSize: 18, color: colors.primary },
  dividerText: { fontFamily: fonts.serif, fontSize: 9, color: colors.textMuted, marginTop: 2 },
  chipActive: { borderColor: colors.primary },
  chipDim: { opacity: 0.55 },
  chipArt: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontFamily: fonts.serif, fontSize: 28, color: colors.ink },
  chipLabel: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.text },
  chipSub: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted },
});
