import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouteSketch } from '../components/RouteSketch';
import { energyForRun, ENERGY_PER_KM, weeklyStats } from '../lib/game';
import { formatDuration, formatKm, formatPace } from '../lib/geo';
import type { ActiveRun } from '../lib/storage';
import { elapsedSeconds, finishRun, pauseRun, resumeRun, startRun, subscribe, toRoute, type FinishedRun } from '../lib/tracker';
import { useGame } from '../state/GameProvider';
import { colors, fonts } from '../theme';

export default function RunScreen() {
  const insets = useSafeAreaInsets();
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [finished, setFinished] = useState<FinishedRun | null>(null);

  useEffect(() => subscribe(setRun), []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      {finished ? (
        <Summary run={finished} onDone={() => setFinished(null)} />
      ) : run ? (
        <Active run={run} onFinish={setFinished} />
      ) : (
        <Idle />
      )}
    </View>
  );
}

function Idle() {
  const { state, addRun } = useGame();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const week = weeklyStats(state.runs, 1)[0];
  const last = state.runs[0];

  const onStart = async () => {
    setBusy(true);
    setError(null);
    const res = await startRun();
    if (!res.ok) setError(res.reason);
    setBusy(false);
  };

  const onSimulate = () => {
    // Development helper: a 2.5 km loop at a 6:00 pace.
    const endedAt = Date.now();
    const durationS = 15 * 60;
    const route = toRoute([
      Array.from({ length: 40 }, (_, i) => {
        const a = (i / 39) * Math.PI * 2;
        return { lat: 52.52 + 0.004 * Math.sin(a) + 0.001 * Math.sin(3 * a), lon: 13.405 + 0.006 * Math.cos(a), t: i };
      }),
    ]);
    addRun({ startedAt: endedAt - durationS * 1000, endedAt, distanceM: 2500, durationS, route });
  };

  return (
    <>
      <Text style={styles.heading}>Laufen</Text>
      <View style={styles.weekCard}>
        <Text style={styles.cardLabel}>Diese Woche</Text>
        <Text style={styles.weekValue}>{week.km.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km</Text>
        <Text style={styles.cardSub}>
          {week.runs} {week.runs === 1 ? 'Lauf' : 'Läufe'}
        </Text>
      </View>
      {last && (
        <View style={styles.lastCard}>
          <Text style={styles.cardLabel}>Letzter Lauf</Text>
          <Text style={styles.lastValue}>
            {formatKm(last.distanceM)} km · {formatDuration(last.durationS)} · +{last.energy} ⚡
          </Text>
        </View>
      )}

      <View style={styles.startArea}>
        <Pressable style={({ pressed }) => [styles.startButton, pressed && { transform: [{ scale: 0.97 }] }]} onPress={onStart} disabled={busy}>
          <Text style={styles.startGlyph}>走</Text>
          <Text style={styles.startText}>{busy ? '…' : 'Start'}</Text>
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      {__DEV__ && (
        <Pressable onPress={onSimulate} style={styles.devButton}>
          <Text style={styles.devText}>Testlauf simulieren (2,5 km)</Text>
        </Pressable>
      )}
    </>
  );
}

function Active({ run, onFinish }: { run: ActiveRun; onFinish: (run: FinishedRun) => void }) {
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const paused = run.pausedAt !== null;

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [paused]);

  const elapsed = elapsedSeconds(run, Math.max(now, run.startedAt));
  const route = toRoute(run.segments);
  const hasSignal = run.segments.some((s) => s.length > 0);

  const onFinishPress = async () => {
    setBusy(true);
    const result = await finishRun();
    setBusy(false);
    if (result) onFinish(result);
  };

  return (
    <>
      <Text style={styles.heading}>{paused ? 'Pausiert' : 'Lauf läuft'}</Text>
      <View style={styles.bigStat}>
        <Text style={styles.bigValue}>{formatKm(run.distanceM)}</Text>
        <Text style={styles.bigLabel}>Kilometer</Text>
      </View>
      <View style={styles.row}>
        <Stat value={formatDuration(elapsed)} label="Zeit" />
        <Stat value={formatPace(run.distanceM, elapsed)} label="Ø min/km" />
        <Stat value={`+${Math.floor((run.distanceM / 1000) * ENERGY_PER_KM)}`} label="⚡" />
      </View>

      <View style={styles.routeBox}>
        {route.flat().length > 1 ? (
          <RouteSketch route={route} width={width - 32} height={180} />
        ) : (
          <Text style={styles.hint}>{hasSignal ? 'Los geht’s – deine Route erscheint hier.' : 'Suche GPS-Signal …'}</Text>
        )}
      </View>
      {run.mode === 'foreground' && (
        <Text style={styles.hint}>Lass die App geöffnet – Hintergrund-Tracking ist hier nicht verfügbar.</Text>
      )}

      <View style={styles.controls}>
        {paused ? (
          <>
            <RoundButton label="Weiter" color={colors.primary} onPress={() => void resumeRun()} />
            <RoundButton label="Beenden" color={colors.ink} onPress={onFinishPress} disabled={busy} />
          </>
        ) : (
          <RoundButton label="Pause" color={colors.ink} onPress={() => void pauseRun()} />
        )}
      </View>
    </>
  );
}

function Summary({ run, onDone }: { run: FinishedRun; onDone: () => void }) {
  const { addRun } = useGame();
  const { width } = useWindowDimensions();
  const { energy, rejectedReason } = energyForRun(run.distanceM, run.durationS);

  const save = () => {
    addRun(run);
    onDone();
    if (!rejectedReason && energy > 0) router.navigate('/');
  };

  return (
    <>
      <Text style={styles.heading}>Geschafft</Text>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRoute}>
          {run.route.flat().length > 1 ? (
            <RouteSketch route={run.route} width={width - 64} height={200} strokeWidth={3.5} />
          ) : (
            <Text style={styles.hint}>Keine Route aufgezeichnet</Text>
          )}
        </View>
        <View style={styles.row}>
          <Stat value={formatKm(run.distanceM)} label="km" />
          <Stat value={formatDuration(run.durationS)} label="Zeit" />
          <Stat value={formatPace(run.distanceM, run.durationS)} label="Ø min/km" />
        </View>
        <View style={styles.reward}>
          {rejectedReason ? (
            <Text style={styles.rewardMuted}>{rejectedReason} – es gibt keine Energie.</Text>
          ) : (
            <Text style={styles.rewardText}>+{energy} ⚡ für deine Welt</Text>
          )}
        </View>
      </View>

      <View style={styles.summaryActions}>
        <Pressable style={[styles.wideButton, { backgroundColor: colors.primary }]} onPress={save}>
          <Text style={styles.wideButtonText}>Speichern</Text>
        </Pressable>
        <Pressable style={styles.discard} onPress={onDone}>
          <Text style={styles.discardText}>Verwerfen</Text>
        </Pressable>
      </View>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RoundButton({ label, color, onPress, disabled }: { label: string; color: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.round, { backgroundColor: color }, pressed && { transform: [{ scale: 0.96 }] }]}>
      <Text style={styles.roundText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingBottom: 16 },
  heading: { fontFamily: fonts.serif, fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 12, paddingHorizontal: 2 },
  weekCard: { backgroundColor: colors.ink, borderRadius: 12, padding: 18 },
  cardLabel: { fontFamily: fonts.serif, fontSize: 13, color: colors.inkSoft, letterSpacing: 1 },
  weekValue: { fontFamily: fonts.mono, fontSize: 40, fontWeight: '700', color: colors.background, marginTop: 4 },
  cardSub: { fontFamily: fonts.serif, color: colors.inkSoft, marginTop: 2 },
  lastCard: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lastValue: { fontFamily: fonts.mono, fontSize: 15, color: colors.text, marginTop: 4 },
  startArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  startButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  startGlyph: { fontFamily: fonts.serif, fontSize: 56, color: colors.onPrimary, lineHeight: 64 },
  startText: { fontFamily: fonts.serif, fontSize: 18, fontWeight: '700', color: colors.onPrimary, letterSpacing: 2 },
  error: { marginTop: 16, color: colors.primary, textAlign: 'center', fontFamily: fonts.serif },
  devButton: { alignItems: 'center', paddingVertical: 8 },
  devText: { color: colors.textMuted, fontFamily: fonts.serif },
  bigStat: { alignItems: 'center', marginTop: 8 },
  bigValue: { fontFamily: fonts.mono, fontSize: 80, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  bigLabel: { fontFamily: fonts.serif, fontSize: 15, color: colors.textMuted, marginTop: -6 },
  row: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 20, gap: 10 },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontFamily: fonts.mono, fontSize: 20, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fonts.serif, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  routeBox: { height: 180, marginTop: 16, alignItems: 'center', justifyContent: 'center' },
  hint: { color: colors.textMuted, textAlign: 'center', fontFamily: fonts.serif, marginTop: 8 },
  controls: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', gap: 28, paddingBottom: 8 },
  round: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontFamily: fonts.serif, color: colors.background, fontSize: 18, fontWeight: '700' },
  summaryCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  summaryRoute: { height: 200, alignItems: 'center', justifyContent: 'center' },
  reward: { marginTop: 16, alignItems: 'center' },
  rewardText: { fontFamily: fonts.serif, fontSize: 22, fontWeight: '700', color: colors.primary },
  rewardMuted: { fontFamily: fonts.serif, color: colors.textMuted, textAlign: 'center' },
  summaryActions: { marginTop: 'auto', gap: 8 },
  wideButton: { borderRadius: 999, paddingVertical: 18, alignItems: 'center' },
  wideButtonText: { fontFamily: fonts.serif, color: colors.onPrimary, fontSize: 18, fontWeight: '700' },
  discard: { alignItems: 'center', paddingVertical: 12 },
  discardText: { fontFamily: fonts.serif, color: colors.textMuted, fontSize: 15 },
});
