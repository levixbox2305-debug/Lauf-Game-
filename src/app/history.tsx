import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloudBadge } from '../components/AccountSheet';
import { supabase } from '../lib/cloud';
import { RouteSketch } from '../components/RouteSketch';
import { levelFor, weeklyStats } from '../lib/game';
import { formatDuration, formatKm, formatPace } from '../lib/geo';
import { useGame } from '../state/GameProvider';
import { colors, fonts } from '../theme';

const WEEKS = 8;
const BAR_HEIGHT = 72;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { state, totalKm } = useGame();
  const level = levelFor(totalKm);
  const progress = level.nextKm ? (totalKm - level.currentKm) / (level.nextKm - level.currentKm) : 1;
  const weeks = weeklyStats(state.runs, WEEKS);
  const maxKm = Math.max(5, ...weeks.map((w) => w.km));

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      data={state.runs}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          <View style={styles.headerRow}>
            <Text style={styles.heading}>Verlauf</Text>
            <CloudBadge />
          </View>

          <View style={styles.levelCard}>
            <View style={styles.levelRow}>
              <Text style={styles.levelTitle}>Level {level.level}</Text>
              <Text style={styles.levelKm}>{totalKm.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km</Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.min(100, progress * 100)}%` }]} />
            </View>
            <Text style={styles.levelSub}>
              {level.nextKm ? `Noch ${(level.nextKm - totalKm).toLocaleString('de-DE', { maximumFractionDigits: 1 })} km bis Level ${level.level + 1}` : 'Höchstes Level erreicht'}
            </Text>
          </View>

          <View style={styles.weeksCard}>
            <Text style={styles.cardLabel}>Kilometer pro Woche</Text>
            <View style={styles.weeks}>
              {weeks.map((w, i) => (
                <View key={w.start} style={styles.week}>
                  <View style={styles.weekTrack}>
                    <View
                      style={[
                        styles.weekBar,
                        { height: Math.max(2, (w.km / maxKm) * BAR_HEIGHT) },
                        i === weeks.length - 1 && { backgroundColor: colors.primary },
                      ]}
                    />
                  </View>
                  <Text style={styles.weekLabel}>
                    {new Date(w.start).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }).slice(0, 5)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {state.runs.length > 0 && <Text style={styles.sectionLabel}>Alle Läufe</Text>}
        </View>
      }
      ListFooterComponent={
        <Text style={styles.footer}>
          Version {(process.env.EXPO_PUBLIC_BUILD_ID ?? 'lokal').slice(0, 7)} · Backup {supabase ? 'eingerichtet' : 'nicht eingerichtet'}
        </Text>
      }
      ListEmptyComponent={<Text style={styles.empty}>Noch keine Läufe. Dein erster Lauf pflanzt die erste Sakura.</Text>}
      renderItem={({ item }) => (
        <View style={[styles.run, item.rejectedReason && { opacity: 0.6 }]}>
          <View style={styles.thumb}>{item.route && <RouteSketch route={item.route} width={52} height={52} strokeWidth={1.6} />}</View>
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
            <Text style={styles.runMain}>{formatKm(item.distanceM)} km</Text>
            <Text style={styles.runSub}>
              {formatDuration(item.durationS)} · {formatPace(item.distanceM, item.durationS)} min/km
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
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontFamily: fonts.serif, fontSize: 28, fontWeight: '700', color: colors.text, paddingHorizontal: 2 },
  levelCard: { backgroundColor: colors.ink, borderRadius: 12, padding: 18 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  levelTitle: { fontFamily: fonts.serif, color: colors.background, fontSize: 24, fontWeight: '700' },
  levelKm: { fontFamily: fonts.mono, color: colors.inkSoft, fontSize: 15 },
  bar: { height: 8, backgroundColor: 'rgba(243,235,221,0.15)', borderRadius: 999, marginTop: 12, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.sakura, borderRadius: 999 },
  levelSub: { fontFamily: fonts.serif, color: colors.inkSoft, marginTop: 8 },
  weeksCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardLabel: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, letterSpacing: 1 },
  weeks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  week: { alignItems: 'center', flex: 1 },
  weekTrack: { height: BAR_HEIGHT, justifyContent: 'flex-end' },
  weekBar: { width: 14, backgroundColor: colors.ink, borderRadius: 3 },
  weekLabel: { fontFamily: fonts.mono, fontSize: 9, color: colors.textMuted, marginTop: 6 },
  sectionLabel: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, letterSpacing: 1, marginTop: 6 },
  footer: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 32, paddingHorizontal: 24, fontFamily: fonts.serif },
  run: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  runDate: { fontFamily: fonts.serif, color: colors.textMuted, fontSize: 12 },
  runMain: { fontFamily: fonts.mono, color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 2 },
  runSub: { fontFamily: fonts.mono, color: colors.textMuted, fontSize: 12, marginTop: 1 },
  rejected: { fontFamily: fonts.serif, color: colors.primary, fontSize: 12, marginTop: 2 },
  runEnergy: { fontFamily: fonts.mono, color: colors.primary, fontWeight: '700', fontSize: 15 },
});
