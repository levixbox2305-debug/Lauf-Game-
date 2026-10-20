import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCloud, type SyncStatus } from '../state/CloudProvider';
import { colors, fonts } from '../theme';

export function statusText(status: SyncStatus, lastSyncedAt: number | null): string {
  switch (status) {
    case 'syncing':
      return 'Wird gesichert …';
    case 'synced':
      return lastSyncedAt
        ? `Gesichert · ${new Date(lastSyncedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
        : 'Gesichert';
    case 'error':
      return 'Offline – wird später gesichert';
    case 'signedOut':
      return 'Nicht gesichert';
    default:
      return '';
  }
}

/** Small button showing the backup state; opens the account sheet. */
export function CloudBadge() {
  const cloud = useCloud();
  const [open, setOpen] = useState(false);
  if (!cloud.enabled) return null;

  const ok = cloud.status === 'synced' || cloud.status === 'syncing';
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.badge, ok ? styles.badgeOk : styles.badgeWarn]}>
        <Text style={[styles.badgeGlyph, ok && { color: colors.matcha }]}>{ok ? '●' : '○'}</Text>
        <Text style={styles.badgeText}>{cloud.email ? 'Backup' : 'Backup aus'}</Text>
      </Pressable>
      <AccountSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const cloud = useCloud();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const onSignIn = () =>
    run(async () => {
      const err = await cloud.signIn(email, password);
      if (err) setError(err);
      else setPassword('');
    });

  const onSignUp = () =>
    run(async () => {
      const res = await cloud.signUp(email, password);
      if (res.error) setError(res.error);
      else if (res.info) setInfo(res.info);
      else setPassword('');
    });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Backup</Text>

          {cloud.email ? (
            <>
              <Text style={styles.body}>
                Angemeldet als <Text style={styles.strong}>{cloud.email}</Text>. Läufe, Welt und Streaks werden automatisch gesichert
                – auch auf mehreren Geräten.
              </Text>
              <View style={styles.statusRow}>
                <Text style={styles.status}>{statusText(cloud.status, cloud.lastSyncedAt)}</Text>
              </View>
              <Pressable style={[styles.button, styles.primary]} onPress={cloud.syncNow}>
                <Text style={styles.buttonText}>Jetzt sichern</Text>
              </Pressable>
              <Pressable style={styles.link} onPress={() => run(cloud.signOut)}>
                <Text style={styles.linkText}>Abmelden (Daten bleiben auf diesem Gerät)</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.body}>
                Melde dich an, damit deine Läufe und deine Welt online gesichert sind. Geht das Handy verloren, ist nichts weg.
              </Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="E-Mail"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Passwort (mind. 6 Zeichen)"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
              />
              {error && <Text style={styles.error}>{error}</Text>}
              {info && <Text style={styles.info}>{info}</Text>}
              <Pressable style={[styles.button, styles.primary, busy && { opacity: 0.6 }]} onPress={onSignIn} disabled={busy}>
                <Text style={styles.buttonText}>{busy ? '…' : 'Anmelden'}</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.secondary]} onPress={onSignUp} disabled={busy}>
                <Text style={[styles.buttonText, { color: colors.text }]}>Konto erstellen</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeOk: { borderColor: colors.border, backgroundColor: colors.surface },
  badgeWarn: { borderColor: colors.primary, backgroundColor: colors.surface },
  badgeGlyph: { fontSize: 12, color: colors.primary },
  badgeText: { fontFamily: fonts.serif, fontSize: 13, color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(43,42,40,0.4)' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, gap: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  title: { fontFamily: fonts.serif, fontSize: 24, fontWeight: '700', color: colors.text },
  body: { fontFamily: fonts.serif, fontSize: 15, color: colors.text, lineHeight: 21 },
  strong: { fontWeight: '700' },
  statusRow: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border },
  status: { fontFamily: fonts.mono, fontSize: 14, color: colors.text },
  input: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: { fontFamily: fonts.serif, color: colors.primary },
  info: { fontFamily: fonts.serif, color: colors.matcha },
  button: { borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: colors.onPrimary },
  link: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontFamily: fonts.serif, color: colors.textMuted },
});
