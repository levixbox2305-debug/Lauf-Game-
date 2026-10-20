import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ENERGY_PER_KM, type RunRecord } from '../lib/game';
import { formatDuration, formatKm, formatPace } from '../lib/geo';
import type { ActiveRun } from '../lib/storage';
import { startRun, stopRun, subscribe } from '../lib/tracker';
import { useGame } from '../state/GameProvider';
import { colors } from '../theme';

export default function RunScreen() {
  const { addRun } = useGame();
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunRecord | null>(null);

  useEffect(() => subscribe(setRun), []);

  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [run]);

  const onStart = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await startRun();
    if (!res.ok) setError(res.reason);
    setBusy(false);
  };

  const onStop = async () => {
    setBusy(true);
    setConfirmStop(false);
    const finished = await stopRun();
    if (finished) setResult(addRun(finished));
    setBusy(false);
  };

  const onSimulate = () => {
    // Development helper: a 2.5 km run at a 6:00 pace.
    const endedAt = Date.now();
    const durationS = 15 * 60;
    setResult(addRun({ startedAt: endedAt - durationS * 1000, endedAt, distanceM: 2500, durationS }));
  };

  const elapsed = run ? (now - run.startedAt) / 1000 : 0;
  const distance = run?.distanceM ?? 0;

  return (
    <View style={styles.screen}>
      <View style={styles.stats}>
        <Text style={styles.bigValue}>{formatKm(distance)}</Text>
        <Text style={styles.bigLabel}>Kilometer</Text>

        <View style={styles.row}>
          <Stat value={formatDuration(elapsed)} label="Zeit" />
          <Stat value={formatPace(distance, elapsed)} label="min/km" />
          <Stat value={`+${Math.floor((distance / 1000) * ENERGY_PER_KM)}`} label="⚡ Energie" />
        </View>

        {run && (
          <Text style={styles.hint}>
            {run.mode === 'background'
              ? 'GPS läuft auch bei gesperrtem Bildschirm.'
              : 'Lass die App geöffnet – Hintergrund-Tracking ist hier nicht verfügbar.'}
          </Text>
        )}
        {run && run.points.length === 0 && <Text style={styles.hint}>Suche GPS-Signal …</Text>}
      </View>

      {result && !run && (
        <View style={styles.result}>
          {result.rejectedReason ? (
            <>
              <Text style={styles.resultTitle}>Lauf nicht gewertet</Text>
              <Text style={styles.resultText}>{result.rejectedReason}</Text>
            </>
          ) : (
            <>
              <Text style={styles.resultTitle}>Stark! +{result.energy} ⚡</Text>
              <Text style={styles.resultText}>
                {formatKm(result.distanceM)} km in {formatDuration(result.durationS)} – deine Welt wartet auf dich.
              </Text>
            </>
          )}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        {!run && (
          <Pressable style={[styles.button, styles.start]} onPress={onStart} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? '…' : 'Lauf starten'}</Text>
          </Pressable>
        )}
        {run && !confirmStop && (
          <Pressable style={[styles.button, styles.stop]} onPress={() => setConfirmStop(true)} disabled={busy}>
            <Text style={styles.buttonText}>Beenden</Text>
          </Pressable>
        )}
        {run && confirmStop && (
          <View style={styles.confirmRow}>
            <Pressable style={[styles.button, styles.secondary, styles.flex]} onPress={() => setConfirmStop(false)}>
              <Text style={[styles.buttonText, { color: colors.text }]}>Weiter</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.stop, styles.flex]} onPress={onStop} disabled={busy}>
              <Text style={styles.buttonText}>Speichern</Text>
            </Pressable>
          </View>
        )}
        {__DEV__ && !run && (
          <Pressable onPress={onSimulate} style={styles.devButton}>
            <Text style={styles.devText}>🧪 Testlauf simulieren (2,5 km)</Text>
          </Pressable>
        )}
      </View>
    </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 16 },
  stats: { alignItems: 'center', paddingTop: 32 },
  bigValue: { fontSize: 76, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  bigLabel: { fontSize: 16, color: colors.textMuted, marginTop: -4 },
  row: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 32, gap: 12 },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  hint: { marginTop: 16, color: colors.textMuted, textAlign: 'center' },
  result: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultTitle: { fontSize: 20, fontWeight: '800', color: colors.primary },
  resultText: { marginTop: 4, color: colors.text },
  error: { marginTop: 16, color: colors.danger, textAlign: 'center' },
  actions: { marginTop: 'auto', gap: 12 },
  button: { borderRadius: 999, paddingVertical: 18, alignItems: 'center' },
  start: { backgroundColor: colors.primary },
  stop: { backgroundColor: colors.danger },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  confirmRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  devButton: { alignItems: 'center', paddingVertical: 8 },
  devText: { color: colors.textMuted },
});
