import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CHARACTERS, challengeText } from '../lib/characters';
import { ITEM_BY_ID, type GameState, type WorldId } from '../lib/game';
import { colors, fonts } from '../theme';
import { PersonThumb } from './ItemThumb';

type Props = { visible: boolean; onClose: () => void; state: GameState; worldId: WorldId };

/** Who lives in this world, and what it takes to bring the others in. */
export function ResidentsSheet({ visible, onClose, state, worldId }: Props) {
  const insets = useSafeAreaInsets();
  const world = state.worlds[worldId];
  const people = CHARACTERS.filter((c) => c.world === worldId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>住 Bewohner</Text>
        <Text style={styles.sub}>Bau ein Gebäude, dann schalte seinen Bewohner mit einer Lauf-Challenge frei.</Text>
        <ScrollView contentContainerStyle={{ gap: 8 }}>
          {people.map((c) => {
            const lives = state.residents.includes(c.id);
            const built = world.tiles.some((t) => t.unlocked && t.item === c.home);
            const home = ITEM_BY_ID[c.home];
            return (
              <View key={c.id} style={[styles.row, !lives && !built && { opacity: 0.55 }]}>
                <View style={[styles.portrait, !lives && styles.portraitLocked]}>
                  <PersonThumb id={c.id} size={44} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {c.name} <Text style={styles.role}>· {c.role}</Text>
                  </Text>
                  {lives ? (
                    <Text style={styles.status}>Wohnt im {home.name}</Text>
                  ) : built ? (
                    <Text style={styles.challenge}>Challenge: {challengeText(c.challenge)}</Text>
                  ) : (
                    <Text style={styles.status}>
                      Baue zuerst: {home.name}
                      {home.unlockKm > 0 ? ` (ab ${home.unlockKm} km)` : ''}
                    </Text>
                  )}
                </View>
                <Text style={styles.mark}>{lives ? '✓' : built ? '走' : '🔒'}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,42,40,0.4)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    gap: 10,
    maxHeight: '75%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  title: { fontFamily: fonts.serif, fontSize: 24, fontWeight: '700', color: colors.text },
  sub: { fontFamily: fonts.serif, fontSize: 14, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  portrait: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  portraitLocked: { opacity: 0.5 },
  name: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700', color: colors.text },
  role: { fontWeight: '400', color: colors.textMuted },
  status: { fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  challenge: { fontFamily: fonts.serif, fontSize: 13, color: colors.primary, marginTop: 2 },
  mark: { fontFamily: fonts.serif, fontSize: 18, color: colors.primary, width: 24, textAlign: 'center' },
});
