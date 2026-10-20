import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IsoWorld } from '../components/IsoWorld';
import { expansionCost, ITEMS, type ItemId } from '../lib/game';
import { useGame } from '../state/GameProvider';
import { colors } from '../theme';

type Tool = { kind: 'build'; item: ItemId } | { kind: 'expand' } | { kind: 'demolish' };

export default function WorldScreen() {
  const { state, totalKm, build, demolish, expand } = useGame();
  const [tool, setTool] = useState<Tool>({ kind: 'build', item: 'tree' });
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
      else error = 'Tippe auf ein + im Wasser, um Land zu gewinnen.';
      setMessage(error);
    },
    [state.world.tiles, tool, build, demolish, expand],
  );

  const landCost = expansionCost(state.world);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.energyPill}>
          <Text style={styles.energyText}>⚡ {state.energy}</Text>
        </View>
        <Text style={styles.km}>{totalKm.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km gelaufen</Text>
      </View>

      <View style={styles.worldBox}>
        <IsoWorld world={state.world} onTilePress={onTilePress} showExpansions={tool.kind === 'expand'} />
        {message && (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{message}</Text>
          </View>
        )}
      </View>

      <View style={styles.palette}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteRow}>
          <ToolButton
            emoji="🏝️"
            label="Land"
            sub={`${landCost} ⚡`}
            active={tool.kind === 'expand'}
            onPress={() => setTool({ kind: 'expand' })}
          />
          {ITEMS.map((item) => {
            const locked = totalKm < item.unlockKm;
            return (
              <ToolButton
                key={item.id}
                emoji={item.emoji}
                label={item.name}
                sub={locked ? `🔒 ${item.unlockKm} km` : `${item.cost} ⚡`}
                locked={locked}
                affordable={state.energy >= item.cost}
                active={tool.kind === 'build' && tool.item === item.id}
                onPress={() => setTool({ kind: 'build', item: item.id })}
              />
            );
          })}
          <ToolButton
            emoji="🪓"
            label="Abreißen"
            sub="50 % zurück"
            active={tool.kind === 'demolish'}
            onPress={() => setTool({ kind: 'demolish' })}
          />
        </ScrollView>
      </View>
    </View>
  );
}

function ToolButton(props: {
  emoji: string;
  label: string;
  sub: string;
  active: boolean;
  locked?: boolean;
  affordable?: boolean;
  onPress: () => void;
}) {
  const dim = props.locked || props.affordable === false;
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.tool, props.active && styles.toolActive, dim && !props.active && styles.toolDim]}>
      <Text style={[styles.toolEmoji, props.locked && { opacity: 0.4 }]}>{props.emoji}</Text>
      <Text style={styles.toolLabel} numberOfLines={1}>
        {props.label}
      </Text>
      <Text style={styles.toolSub} numberOfLines={1}>
        {props.sub}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  energyPill: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  energyText: { fontSize: 18, fontWeight: '800', color: colors.energy },
  km: { color: colors.textMuted, fontSize: 14 },
  worldBox: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.sea,
    overflow: 'hidden',
    padding: 8,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(31,42,36,0.9)',
    borderRadius: 12,
    padding: 12,
  },
  toastText: { color: '#fff', textAlign: 'center', fontSize: 14 },
  palette: { paddingVertical: 10 },
  paletteRow: { paddingHorizontal: 12, gap: 8 },
  tool: {
    width: 76,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toolActive: { borderColor: colors.primary },
  toolDim: { opacity: 0.6 },
  toolEmoji: { fontSize: 26 },
  toolLabel: { fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 2 },
  toolSub: { fontSize: 11, color: colors.textMuted },
});
