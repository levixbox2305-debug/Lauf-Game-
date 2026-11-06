import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { box, retro } from './retro';

export type Choice = { label: string; onPick: () => void; disabled?: boolean };
export type Dialog = { speaker?: string; lines: string[]; choices?: Choice[]; onClose?: () => void };

type Props = {
  dialog: Dialog;
  /** Index of the current line, controlled by the screen so the A button can advance it. */
  line: number;
  cursor: number;
  onAdvance: () => void;
  onPick: (index: number) => void;
};

const CHARS_PER_TICK = 2;

/**
 * A text box at the bottom of the screen: types its text out, ▼ for more, choices on the last line.
 * Give it a new `key` per line so the typing starts over.
 */
export function DialogBox({ dialog, line, cursor, onAdvance, onPick }: Props) {
  const text = dialog.lines[line] ?? '';
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setShown((n) => (n >= text.length ? n : n + CHARS_PER_TICK)), 16);
    return () => clearInterval(t);
  }, [text]);

  const done = shown >= text.length;
  const last = line >= dialog.lines.length - 1;
  const choices = last && done ? dialog.choices : undefined;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {choices && (
        <View style={[box, styles.choices]}>
          {choices.map((c, i) => (
            <Pressable key={c.label} onPress={() => !c.disabled && onPick(i)} style={styles.choice}>
              <Text style={[styles.choiceText, c.disabled && styles.disabled]}>
                {i === cursor ? '▶ ' : '   '}
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable style={[box, styles.box]} onPress={() => (done ? onAdvance() : setShown(text.length))}>
        {dialog.speaker && <Text style={styles.speaker}>{dialog.speaker}</Text>}
        <Text style={styles.text}>{text.slice(0, shown)}</Text>
        {done && !choices && <Text style={styles.more}>{last ? '■' : '▼'}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 8, right: 8, bottom: 8, alignItems: 'flex-end' },
  box: { alignSelf: 'stretch', minHeight: 96, paddingHorizontal: 14, paddingVertical: 10 },
  speaker: { fontFamily: retro.font, fontWeight: '900', fontSize: 13, color: retro.accent, marginBottom: 2 },
  text: { fontFamily: retro.font, fontSize: 15, lineHeight: 21, color: retro.ink, fontWeight: '600' },
  more: { position: 'absolute', right: 12, bottom: 6, color: retro.accent, fontSize: 14 },
  choices: { marginBottom: 6, paddingVertical: 6, paddingHorizontal: 10, maxWidth: '86%', minWidth: '50%' },
  choice: { paddingVertical: 5 },
  choiceText: { fontFamily: retro.font, fontSize: 15, color: retro.ink, fontWeight: '700' },
  disabled: { color: '#B5AFA6', textDecorationLine: 'line-through' },
});
