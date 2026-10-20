import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDev } from '../state/DevProvider';
import { colors, fonts } from '../theme';

const HOURS: { label: string; hour: number | null }[] = [
  { label: 'Echt', hour: null },
  { label: '7 Uhr', hour: 7 },
  { label: '12 Uhr', hour: 12 },
  { label: '19 Uhr', hour: 19 },
  { label: '23 Uhr', hour: 23 },
];

/** Settings for the developer playground, or the switch into it. */
export function DevSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const dev = useDev();
  const inSandbox = dev.profile === 'sandbox';

  const go = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>開発 Entwicklermodus</Text>
        {inSandbox ? (
          <>
            <Text style={styles.body}>
              Du bist auf der Spielwiese: alles freigeschaltet, eigener Spielstand, kein Backup. Dein echter Spielstand ist
              unverändert.
            </Text>
            <Text style={styles.label}>Uhrzeit der Bewohner</Text>
            <View style={styles.hours}>
              {HOURS.map((h) => (
                <Pressable
                  key={h.label}
                  onPress={() => dev.setHour(h.hour)}
                  style={[styles.hour, dev.hour === h.hour && styles.hourActive]}>
                  <Text style={[styles.hourText, dev.hour === h.hour && styles.hourTextActive]}>{h.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={[styles.button, styles.secondary]} onPress={() => go(() => dev.switchProfile('sandbox', { reset: true }))}>
              <Text style={[styles.buttonText, { color: colors.text }]}>Spielwiese zurücksetzen</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.primary]} onPress={() => go(() => dev.switchProfile('main'))}>
              <Text style={styles.buttonText}>Zurück zum echten Spielstand</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.body}>
              Die Spielwiese ist ein eigener Spielstand mit allem freigeschaltet: alle Welten fertig gebaut, alle Bewohner,
              alle Sammelobjekte und 99.999 ⚡. Sie wird nie gesichert und ändert nichts an deinen echten Läufen.
            </Text>
            <Pressable style={[styles.button, styles.primary]} onPress={() => go(() => dev.switchProfile('sandbox'))}>
              <Text style={styles.buttonText}>Spielwiese öffnen</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

/** Always-visible marker while on the playground, so it's never mistaken for the real save. */
export function DevBadge() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={styles.badge} onPress={() => setOpen(true)}>
        <Text style={styles.badgeText}>開発 Spielwiese</Text>
      </Pressable>
      <DevSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,42,40,0.4)' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, gap: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  title: { fontFamily: fonts.serif, fontSize: 24, fontWeight: '700', color: colors.text },
  body: { fontFamily: fonts.serif, fontSize: 15, color: colors.text, lineHeight: 21 },
  label: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, letterSpacing: 1, marginTop: 4 },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hour: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  hourActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  hourText: { fontFamily: fonts.serif, fontSize: 14, color: colors.text },
  hourTextActive: { color: colors.background },
  button: { borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: colors.onPrimary },
  badge: {
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.sakura,
  },
  badgeText: { fontFamily: fonts.serif, fontSize: 12, color: colors.sakura, fontWeight: '700' },
});
