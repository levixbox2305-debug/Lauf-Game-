import { FlatList, StyleSheet, Text, View } from 'react-native';

import { levelFor } from '../lib/game';
import { formatDuration, formatKm, formatPace } from '../lib/geo';
import { useGame } from '../state/GameProvider';
import { colors } from '../theme';

export default function HistoryScreen() {
  const { state, totalKm } = useGame();
  const level = levelFor(totalKm);
  const progress = level.nextKm
    ? (totalKm - level.currentKm) / (level.nextKm - level.currentKm)
    : 1;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={state.runs}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <View style={styles.levelCard}>
          <Text style={styles.levelTitle}>Level {level.level}</Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </View>
          <Text style={styles.levelSub}>
            {level.nextKm
              ? `${totalKm.toLocaleString('de-DE', { maximumFractionDigits: 1 })} / ${level.nextKm} km bis Level ${level.level + 1}`
              : 'Maximales Level erreicht 🏆'}
          </Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>Noch keine Läufe. Dein erster Lauf pflanzt den ersten Baum 🌱</Text>}
      renderItem={({ item }) => (
        <View style={[styles.run, item.rejectedReason && { opacity: 0.6 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.runDate}>
              {new Date(item.startedAt).toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.runMain}>
              {formatKm(item.distanceM)} km · {formatDuration(item.durationS)} · {formatPace(item.distanceM, item.durationS)} min/km
            </Text>
            {item.rejectedReason && <Text style={styles.rejected}>{item.rejectedReason}</Text>}
          </View>
          <Text style={styles.runEnergy}>+{item.energy} ⚡</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 10 },
  levelCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 8,
  },
  levelTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  bar: { height: 10, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, marginTop: 12, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.energy, borderRadius: 999 },
  levelSub: { color: 'rgba(255,255,255,0.9)', marginTop: 8 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 32, paddingHorizontal: 24 },
  run: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  runDate: { color: colors.textMuted, fontSize: 12 },
  runMain: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 2 },
  rejected: { color: colors.danger, fontSize: 12, marginTop: 2 },
  runEnergy: { color: colors.energy, fontWeight: '800', fontSize: 16, marginLeft: 8 },
});
