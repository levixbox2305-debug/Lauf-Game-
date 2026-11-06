import { Canvas, Group, Picture } from '@shopify/react-native-skia';
import { useEffect, useImperativeHandle, useState, type Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { personPicture, type Appearance } from '../../market/draw';
import type { Dir } from '../../market/map';
import { box, retro } from './retro';

export type EncounterSpec = {
  /** e.g. "KUNDIN" – shown in the name box like an opponent's name. */
  title: string;
  look: Appearance;
  intro: string[];
  question: string;
  options: { label: string; correct: boolean; struck?: boolean }[];
  seconds: number;
  /** Text shown on success / when patience runs out. */
  win: string;
  lose: string;
  onFinish: (result: { correct: boolean; quality: number }) => void;
};

export type EncounterInput = { dir: (d: Dir) => void; a: () => void };

const SPRITE_SCALE = 6;

/** A short face-off, laid out like a battle screen: the customer up top with a patience bar, choices below. */
export function Encounter({ spec, inputRef }: { spec: EncounterSpec; inputRef: Ref<EncounterInput> }) {
  const [intro, setIntro] = useState(0);
  const [patience, setPatience] = useState(1);
  const [struck, setStruck] = useState<number[]>(() => spec.options.flatMap((o, i) => (o.struck ? [i] : [])));
  const [cursor, setCursor] = useState(() => spec.options.findIndex((o) => !o.struck));
  const [answer, setAnswer] = useState<{ correct: boolean; text: string; quality: number } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const timedOut = intro >= spec.intro.length && !answer && patience <= 0;
  const result = answer ?? (timedOut ? { correct: false, text: spec.lose, quality: 0 } : null);
  const asking = intro >= spec.intro.length && !result;

  // Patience only drains while the question is on screen.
  useEffect(() => {
    if (!asking) return;
    const t = setInterval(() => setPatience((p) => Math.max(0, p - 0.1 / spec.seconds)), 100);
    return () => clearInterval(t);
  }, [asking, spec.seconds]);

  const pick = (i: number) => {
    if (!asking || struck.includes(i)) return;
    if (spec.options[i].correct) {
      // Quick answers earn up to 50 % more.
      const quality = 1 + patience * 0.5;
      setAnswer({ correct: true, text: spec.win, quality });
    } else {
      setStruck((s) => [...s, i]);
      setPatience((p) => Math.max(0, p - 0.35));
      setHint('Hmm, das stimmt nicht …');
      setCursor(spec.options.findIndex((_, k) => k !== i && !struck.includes(k)));
    }
  };

  const advance = () => {
    if (intro < spec.intro.length) setIntro((n) => n + 1);
    else if (result) spec.onFinish({ correct: result.correct, quality: result.quality });
    else pick(cursor);
  };

  useImperativeHandle(inputRef, () => ({
    a: advance,
    dir: (d: Dir) => {
      const n = spec.options.length;
      const step = d === 'up' ? -2 : d === 'down' ? 2 : d === 'left' ? -1 : 1;
      let c = cursor;
      for (let k = 0; k < n; k++) {
        c = (c + step + n) % n;
        if (!struck.includes(c)) break;
      }
      setCursor(c);
    },
  }));

  const barColor = patience > 0.5 ? retro.green : patience > 0.2 ? retro.yellow : retro.red;
  const text = intro < spec.intro.length ? spec.intro[intro] : result ? result.text : hint ?? spec.question;

  return (
    <View style={styles.root}>
      <View style={styles.arena}>
        <View style={[box, styles.nameBox]}>
          <Text style={styles.name}>{spec.title}</Text>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>GEDULD</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${patience * 100}%`, backgroundColor: barColor }]} />
            </View>
          </View>
        </View>
        <View style={styles.spriteWrap}>
          <View style={styles.platform} />
          <Canvas style={{ width: 16 * SPRITE_SCALE, height: 22 * SPRITE_SCALE }}>
            <Group transform={[{ scale: SPRITE_SCALE }]}>
              <Picture picture={personPicture(spec.look, 'down', 0)} />
            </Group>
          </Canvas>
        </View>
      </View>

      <View style={styles.bottom}>
        <Pressable style={[box, styles.textBox]} onPress={advance}>
          <Text style={styles.text}>{text}</Text>
          {!asking && <Text style={styles.more}>▼</Text>}
        </Pressable>
        {asking && (
          <View style={[box, styles.options]}>
            {spec.options.map((o, i) => (
              <Pressable key={i} style={styles.option} onPress={() => pick(i)}>
                <Text style={[styles.optionText, struck.includes(i) && styles.struck]} numberOfLines={2}>
                  {i === cursor ? '▶' : ' '} {o.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#F4F0E2', justifyContent: 'space-between' },
  arena: { flex: 1, padding: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  nameBox: { paddingHorizontal: 10, paddingVertical: 8, minWidth: 170, marginTop: 8 },
  name: { fontFamily: retro.font, fontWeight: '900', fontSize: 15, color: retro.ink },
  barRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  barLabel: { fontFamily: retro.font, fontWeight: '900', fontSize: 10, color: retro.accent },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E0DCD0', borderWidth: 2, borderColor: retro.ink, overflow: 'hidden' },
  barFill: { height: '100%' },
  spriteWrap: { alignItems: 'center', justifyContent: 'flex-end', marginTop: 24, marginRight: 24 },
  platform: { position: 'absolute', bottom: 4, width: 130, height: 28, borderRadius: 65, backgroundColor: '#D9D0B8' },
  bottom: { padding: 8, gap: 6 },
  textBox: { minHeight: 80, paddingHorizontal: 14, paddingVertical: 10 },
  text: { fontFamily: retro.font, fontSize: 15, lineHeight: 21, color: retro.ink, fontWeight: '600' },
  more: { position: 'absolute', right: 12, bottom: 6, color: retro.accent },
  options: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 4, paddingHorizontal: 6 },
  option: { width: '50%', paddingVertical: 8, paddingHorizontal: 4 },
  optionText: { fontFamily: retro.font, fontSize: 14, fontWeight: '800', color: retro.ink },
  struck: { color: '#C0B9B0', textDecorationLine: 'line-through' },
});
