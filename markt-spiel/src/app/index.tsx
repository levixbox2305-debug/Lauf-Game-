import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Controls } from '../components/market/Controls';
import { DialogBox, type Dialog } from '../components/market/DialogBox';
import { Encounter, type EncounterInput, type EncounterSpec } from '../components/market/Encounter';
import { GameView } from '../components/market/GameView';
import { Menu, type MenuTab } from '../components/market/Menu';
import { retro } from '../components/market/retro';
import { CATEGORIES, CATEGORY_IDS, STORE_NAME, type CategoryId, type TaskKind } from '../market/data';
import type { Appearance } from '../market/draw';
import { facing, getEngine } from '../market/engine';
import {
  addStat,
  advanceStory,
  buy,
  capacity,
  claimBonus,
  claimLogin,
  claimQuest,
  completeTask,
  equip,
  levelFor,
  rankFor,
  refresh,
  storyGoal,
  type MarketSave,
  type Offer,
  type Outcome,
} from '../market/logic';
import { checkoutAt, index, STAFF, tileAt, type Dir, type StaffId } from '../market/map';
import { loadMarket, saveMarket } from '../market/storage';
import {
  categoryAt,
  euro,
  makeBestBefore,
  makeCheckout,
  makeQuestion,
  npcAt,
  removeNpc,
  type Npc,
} from '../market/world';

const PLAYER_LOOK = { skin: '#F1C7A3', hair: '#4A3020', pants: '#2F3B5C' };
const STAFF_LOOKS: Record<StaffId, Appearance> = {
  berger: { skin: '#F5D0B0', hair: '#9A9A9A', shirt: '#FFFFFF', pants: '#3A3A3A', vest: 'vest-red' },
  kalle: { skin: '#C98E66', hair: '#1E1E24', shirt: '#FFFFFF', pants: '#4B3A2A', vest: 'vest-red', hat: 'hat-helmet' },
  bernd: { skin: '#E8B48F', hair: '#A0522D', shirt: '#FFFFFF', pants: '#FFFFFF', vest: null, hat: 'hat-chef' },
  aylin: { skin: '#C98E66', hair: '#1E1E24', shirt: '#FFFFFF', pants: '#2F3B5C', vest: 'vest-red' },
  jonas: { skin: '#F1C7A3', hair: '#D9B55A', shirt: '#FFFFFF', pants: '#2F3B5C', vest: 'vest-red', hat: 'hat-cap' },
};

const SHOPPER_LINES = [
  'Ich wollte nur kurz Milch holen. Jetzt ist der Wagen voll.',
  'Haben Sie das auch in Bio?',
  'Schön sauber hier heute!',
  'Wann kommt denn wieder frisches Brot?',
  'Mein Kind wollte unbedingt zu den Süßigkeiten …',
  'Die Musik hier drin hab ich jetzt den ganzen Tag im Ohr.',
  'Ich suche seit zehn Minuten meinen Einkaufszettel.',
];
const STAFF_LINES: Record<StaffId, string[]> = {
  berger: [
    'Schau ab und zu aufs Schwarze Brett – jeden Tag gibt es neue Quests.',
    'Leere Regalplätze erkennst du am gelben Preisschild ohne Ware davor.',
    'Ein sauberer Markt ist ein guter Markt!',
  ],
  kalle: [
    'Stell dich vor eine Palette und drück A, dann gebe ich dir eine Kiste.',
    'Mit einem Rollwagen aus dem Personal-Shop trägst du drei Kisten auf einmal.',
    'Den Hubwagen fahr ich nur sonntags. Spaß. Wir haben sonntags zu.',
  ],
  bernd: [
    'Moin! Heute ganz frisch: Fleischkäse. Aber erst Feierabend, dann Brötchen.',
    'An der Theke ist immer was los. Zum Glück bin ich schnell.',
  ],
  aylin: [
    'Kassieren ist einfach: Summe minus Geld … äh, andersrum. Geld minus Summe!',
    'Wenn du schnell antwortest, gibt die Kundschaft mehr Trinkgeld.',
  ],
  jonas: [
    'Der Automat hier hat jeden Tag andere Angebote. Und einmal die Woche was ganz Seltenes!',
    'Mit B gedrückt halten rennst du. Psst, nicht der Chefin sagen.',
    'Ich hab schon den Wisch-Orden. Fehlen nur noch sieben …',
  ],
};

type DialogState = { id: number; dialog: Dialog; line: number; cursor: number };

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [save, setSave] = useState<MarketSave | null>(null);
  /** The latest save, also between renders – actions read and write it synchronously. */
  const saveRef = useRef<MarketSave | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [encounter, setEncounter] = useState<{ key: number; spec: EncounterSpec } | null>(null);
  const [menu, setMenu] = useState<MenuTab | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const toastId = useRef(0);
  const encounterInput = useRef<EncounterInput | null>(null);

  const toast = useCallback((texts: string[]) => {
    if (!texts.length) return;
    setToasts((t) => [...t, ...texts.map((text) => ({ id: toastId.current++, text }))].slice(-4));
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((list) => list.slice(1)), 2600);
    return () => clearTimeout(t);
  }, [toasts]);

  /** Applies a rules outcome to the save and tells the player what happened. */
  const apply = useCallback(
    (fn: (s: MarketSave) => Outcome) => {
      const current = saveRef.current;
      if (!current) return null;
      const out = fn(current);
      if (out.error) toast([out.error]);
      else {
        saveRef.current = out.save;
        setSave(out.save);
        toast(out.notes);
      }
      return out;
    },
    [toast],
  );

  const say = useCallback((lines: string[], options: Omit<Dialog, 'lines'> = {}) => {
    setDialog((d) => ({ id: (d?.id ?? 0) + 1, dialog: { lines, ...options }, line: 0, cursor: 0 }));
  }, []);

  // Load, then hand out the daily login reward and greet newcomers.
  useEffect(() => {
    loadMarket(Date.now()).then((loaded) => {
      const login = claimLogin(loaded, Date.now());
      saveRef.current = login.save;
      setSave(login.save);
      toast(login.notes);
      if (loaded.story === 0) {
        say(
          [
            `Willkommen zu deinem ersten Tag bei ${STORE_NAME}!`,
            'Steuerkreuz: laufen. A: sprechen und benutzen. B gedrückt halten: rennen.',
            'Unter MENÜ findest du Quests, den Shop, deine Tasche und deine Orden.',
            'Frau Berger, die Marktleiterin, wartet im Büro oben rechts auf dich.',
          ],
          { speaker: 'Lautsprecher-Durchsage' },
        );
      }
    });
  }, [say, toast]);

  // Save shortly after every change; also roll over to new quests at midnight.
  useEffect(() => {
    if (!save) return;
    const t = setTimeout(() => saveMarket(save).catch((e) => console.warn('Markt konnte nicht gespeichert werden', e)), 600);
    return () => clearTimeout(t);
  }, [save]);
  useEffect(() => {
    const t = setInterval(() => {
      const s = saveRef.current;
      if (!s) return;
      const next = refresh(s, Date.now());
      if (next === s) return;
      saveRef.current = next;
      setSave(next);
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const blocking = !!(dialog || encounter || menu);
  useEffect(() => {
    getEngine().frozen = blocking || !focused;
    if (!focused) getEngine().held = null;
  }, [blocking, focused]);
  useEffect(() => {
    getEngine().fast = !!save?.owned.includes('sneaker');
  }, [save?.owned]);

  const onStep = useCallback(() => apply((s) => addStat(s, 'steps', 1)), [apply]);

  // ------------------------------------------------------------------------------------------
  // Work
  // ------------------------------------------------------------------------------------------

  const finishTask = useCallback(
    (kind: TaskKind, quality = 1) => {
      const current = saveRef.current;
      if (!current) return;
      const out = completeTask(current, kind, quality);
      saveRef.current = out.save;
      setSave(out.save);
      toast([`+${out.coins} Taler · +${out.xp} EP`, ...out.notes]);
    },
    [toast],
  );

  const startEncounter = useCallback((spec: EncounterSpec) => setEncounter({ key: Date.now(), spec }), []);
  const endEncounter = useCallback(() => setEncounter(null), []);

  const startCheckout = useCallback(
    (npc: Npc) => {
      const c = makeCheckout(Math.random);
      const scanner = !!saveRef.current?.owned.includes('scanner');
      const wrongToStrike = scanner ? c.options.findIndex((o) => o !== c.answer) : -1;
      startEncounter({
        title: 'KUNDIN AN KASSE',
        look: npc.look,
        intro: [
          `Piep! Piep! Du scannst: ${c.items.map((i) => `${i.name} ${euro(i.cents)}`).join(', ')}.`,
          `Macht zusammen ${euro(c.total)}. Die Kundin zahlt mit ${euro(c.paid)}.`,
        ],
        question: `Wie viel Rückgeld bekommt sie? (${euro(c.paid)} − ${euro(c.total)})`,
        options: c.options.map((o, i) => ({ label: euro(o), correct: o === c.answer, struck: i === wrongToStrike })),
        seconds: 25,
        win: 'Stimmt genau! „Danke, schönen Tag noch!“',
        lose: 'Die Kundin seufzt und geht zur Nachbarkasse …',
        onFinish: ({ correct, quality }) => {
          removeNpc(getEngine().world, npc.id);
          endEncounter();
          if (correct) finishTask('checkout', quality);
        },
      });
    },
    [startEncounter, endEncounter, finishTask],
  );

  const startQuestion = useCallback(
    (npc: Npc) => {
      const q = makeQuestion(Math.random);
      startEncounter({
        title: 'KUNDE MIT FRAGE',
        look: npc.look,
        intro: [`„Entschuldigung! Wo finde ich ${q.product}?“`],
        question: `In welcher Abteilung gibt es ${q.product}?`,
        options: q.options.map((c) => ({ label: CATEGORIES[c].name, correct: c === q.category })),
        seconds: 18,
        win: `„Ah, bei ${CATEGORIES[q.category].name}! Vielen Dank!“`,
        lose: '„Dann frag ich jemand anderen …“',
        onFinish: ({ correct, quality }) => {
          removeNpc(getEngine().world, npc.id);
          endEncounter();
          if (correct) finishTask('question', quality);
        },
      });
    },
    [startEncounter, endEncounter, finishTask],
  );

  const startBestBefore = useCallback(
    (shelf: number, category: CategoryId) => {
      const b = makeBestBefore(Math.random, Date.now(), category);
      const scanner = !!saveRef.current?.owned.includes('scanner');
      const wrongToStrike = scanner ? (b.answer + 1) % b.items.length : -1;
      startEncounter({
        title: 'MHD-KONTROLLE',
        look: STAFF_LOOKS.berger,
        intro: [`Frau Berger: „Im ${CATEGORIES[category].name} ist was abgelaufen. Heute ist der ${b.today} – findest du es?“`],
        question: `Heute ist der ${b.today}. Was ist abgelaufen?`,
        options: b.items.map((it, i) => ({ label: `${it.name} ${it.date}`, correct: i === b.answer, struck: i === wrongToStrike })),
        seconds: 20,
        win: 'Frau Berger: „Gut aufgepasst! Das kommt aus dem Regal.“',
        lose: 'Frau Berger: „Zu langsam – das mache ich schnell selbst.“',
        onFinish: ({ correct, quality }) => {
          const w = getEngine().world;
          if (w.mhd === shelf) {
            w.mhd = null;
            w.version++;
          }
          endEncounter();
          if (correct) finishTask('mhd', quality);
        },
      });
    },
    [startEncounter, endEncounter, finishTask],
  );

  const storeroom = useCallback(function reopen() {
    const s = saveRef.current!;
    const p = getEngine().player;
    const cap = capacity(s);
    if (p.carry.length >= cap) {
      say([`Du trägst schon ${cap === 1 ? 'eine Kiste' : `${cap} Kisten`}. Mehr geht nicht!`], {
        choices: [
          { label: 'Kisten zurückstellen', onPick: () => ((p.carry = []), toast(['Kisten zurückgestellt.'])) },
          { label: 'Okay', onPick: () => undefined },
        ],
      });
      return;
    }
    say([`Welche Ware nimmst du mit? (${p.carry.length} / ${cap})`], {
      speaker: 'Lager',
      choices: [
        ...CATEGORY_IDS.map((c) => ({
          label: CATEGORIES[c].name,
          onPick: () => {
            p.carry = [...p.carry, c];
            if (p.carry.length < cap) setTimeout(() => reopen(), 0);
          },
        })),
        { label: 'Fertig', onPick: () => undefined },
      ],
    });
  }, [say, toast]);

  const talk = useCallback(
    (who: StaffId) => {
      const s = saveRef.current!;
      const level = levelFor(s.xp).level;
      const staff = STAFF.find((m) => m.id === who)!;
      let lines: string[];
      if (who === 'berger' && s.story === 0) {
        lines = [
          `Da bist du ja! Ich bin Frau Berger und leite diesen ${STORE_NAME}-Markt.`,
          'Hier ist immer was zu tun: Regale auffüllen, Pfützen wischen, Kundschaft helfen, kassieren.',
          'Zieh dir zuerst deine Weste an – dein Spind ist gleich hier im Büro, ganz links.',
        ];
      } else if (who === 'berger' && s.story === 10) {
        lines = level >= 5 ? ['Level 5 – stark! Ab heute bist du offiziell Mitarbeiter:in.', 'Hier, ein kleiner Bonus. Weiter so!'] : [`Komm wieder, wenn du Level 5 erreicht hast. Du bist gerade Level ${level}.`];
      } else if (who === 'berger' && s.story === 11) {
        lines = level >= 10 ? ['Level 10! Ich mache dich zur Schichtleitung.', 'Der Markt läuft mit dir einfach besser. Danke!'] : [`Für die Schichtleitung brauchst du Level 10. Du bist Level ${level}.`];
      } else {
        const pool = STAFF_LINES[who];
        lines = [pool[Math.floor(Math.random() * pool.length)]];
        const goal = storyGoal(s);
        if (who === 'berger' && goal) lines.push(`Deine nächste Aufgabe: ${goal}`);
      }
      say(lines, {
        speaker: `${staff.name} · ${staff.role}`,
        onClose: () => apply((cur) => advanceStory(cur, { type: 'talk', who })),
      });
    },
    [say, apply],
  );

  const interact = useCallback(() => {
    const s = saveRef.current;
    if (!s) return;
    const e = getEngine();
    const p = e.player;
    const { x, y } = facing(p);
    const staff = STAFF.find((m) => m.x === x && m.y === y);
    if (staff) return talk(staff.id);
    const npc = npcAt(e.world, x, y);
    if (npc?.kind === 'asker') return startQuestion(npc);
    if (npc?.kind === 'queue') return say(['„Ich warte hier an der Kasse!“ (Stell dich vor das Kassenband und drück A.)']);
    if (npc) return say([`„${SHOPPER_LINES[Math.floor(Math.random() * SHOPPER_LINES.length)]}“`], { speaker: 'Kundschaft' });

    const i = index(x, y);
    if (e.world.spills.has(i)) {
      e.world.spills.delete(i);
      e.world.version++;
      return finishTask('spill');
    }
    const ch = tileAt(x, y);
    const category = categoryAt(i);
    if (category) {
      const name = CATEGORIES[category].name;
      if (e.world.mhd === i) return startBestBefore(i, category);
      if (e.world.empty.has(i)) {
        const k = p.carry.indexOf(category);
        if (k < 0) {
          const carrying = p.carry.length ? ` Du trägst gerade: ${[...new Set(p.carry.map((c) => CATEGORIES[c].name))].join(', ')}.` : '';
          return say([`Hier fehlt Ware: ${name}. Hol im Lager eine Kiste ${name}.${carrying}`]);
        }
        p.carry = p.carry.filter((_, j) => j !== k);
        e.world.empty.delete(i);
        e.world.version++;
        return finishTask('restock');
      }
      const products = CATEGORIES[category].products;
      return say([`${name}: alles voll. ${products.slice(0, 3).join(', ')} …`]);
    }
    switch (ch) {
      case 'L':
        return storeroom();
      case 'K': {
        const k = checkoutAt(x, y);
        const waiting = e.world.npcs.find((n) => n.kind === 'queue' && n.checkout === k);
        return waiting ? startCheckout(waiting) : say([`Kasse ${k + 1}: Gerade wartet niemand.`]);
      }
      case 'P':
        if (e.world.pfand >= 100) {
          e.world.pfand = 0;
          e.world.version++;
          say([`Du leerst den Pfandautomaten: ${120 + Math.floor(Math.random() * 80)} Flaschen und Dosen!`]);
          return finishTask('pfand');
        }
        return say([`Der Pfandautomat ist zu ${Math.floor(e.world.pfand)} % voll. Leeren erst ab 100 %.`]);
      case 'Z':
        return setMenu('shop');
      case 'Q':
        apply((cur) => advanceStory(cur, { type: 'board' }));
        return setMenu('quests');
      case 'M':
        if (s.story === 1) {
          apply((cur) => advanceStory(cur, { type: 'locker' }));
          return say(['Du ziehst deine rote Dienstweste an. Sitzt!']);
        }
        return setMenu('bag');
      case 'T':
        return talk('bernd');
      case 'B':
        return say(['Auf dem Schreibtisch liegen Dienstpläne und eine Tasse mit der Aufschrift „Chefin“.']);
      case 'a':
        return say(['Jemand hat hier seinen Kaffee stehen lassen.']);
      case 'x':
        return say(['Leere Kartons. Die kommen später in die Presse.']);
      case 'p':
        return say(['Eine Zimmerpflanze. Sie sieht durstig aus.']);
      case 'w':
        return say(['Einkaufswagen. Einer quietscht ganz fürchterlich.']);
      case 'C':
        return say(['Ein geparktes Auto. Auf dem Rücksitz: drei leere Einkaufstaschen.']);
      case 'D':
        return say(['Die Schiebetür surrt auf und zu.']);
    }
  }, [talk, startQuestion, startCheckout, startBestBefore, storeroom, finishTask, say, apply]);

  // ------------------------------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------------------------------

  const state = useRef({ dialog, encounter, menu });
  useLayoutEffect(() => {
    state.current = { dialog, encounter, menu };
  }, [dialog, encounter, menu]);

  const advanceDialog = useCallback(() => {
    const d = state.current.dialog;
    if (!d) return;
    if (d.line < d.dialog.lines.length - 1) return setDialog({ ...d, line: d.line + 1 });
    if (d.dialog.choices) return;
    state.current.dialog = null;
    setDialog(null);
    d.dialog.onClose?.();
  }, []);

  const pickChoice = useCallback((i: number) => {
    const d = state.current.dialog;
    const choice = d?.dialog.choices?.[i];
    if (!d || !choice || choice.disabled) return;
    state.current.dialog = null;
    setDialog(null);
    choice.onPick();
    d.dialog.onClose?.();
  }, []);

  const pressA = useCallback(() => {
    const { dialog: d, encounter: enc, menu: m } = state.current;
    if (m) return;
    if (enc) return encounterInput.current?.a();
    if (d) {
      const last = d.line >= d.dialog.lines.length - 1;
      return last && d.dialog.choices ? pickChoice(d.cursor) : advanceDialog();
    }
    interact();
  }, [interact, advanceDialog, pickChoice]);

  const pressDir = useCallback((dir: Dir | null) => {
    const { dialog: d, encounter: enc } = state.current;
    if (enc && dir) return encounterInput.current?.dir(dir);
    if (d?.dialog.choices && dir) {
      const n = d.dialog.choices.length;
      if (dir === 'up' || dir === 'down') setDialog({ ...d, cursor: (d.cursor + (dir === 'up' ? n - 1 : 1)) % n });
      return;
    }
    getEngine().held = dir;
  }, []);

  const pressB = useCallback(
    (down: boolean) => {
      getEngine().running = down;
      if (!down) return;
      const { dialog: d, menu: m } = state.current;
      if (m) setMenu(null);
      else if (d && !d.dialog.choices) advanceDialog();
      else if (d?.dialog.choices) pickChoice(d.dialog.choices.length - 1);
    },
    [advanceDialog, pickChoice],
  );

  const toggleMenu = useCallback(() => {
    if (state.current.encounter) return;
    setMenu((m) => (m ? null : 'quests'));
  }, []);

  // Keyboard on the web: arrows/WASD, Space/Enter = A, Shift/X = B, M/Esc = menu.
  useEffect(() => {
    if (Platform.OS !== 'web' || !focused) return;
    const keys: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const down = (ev: KeyboardEvent) => {
      const dir = keys[ev.key];
      if (dir) {
        ev.preventDefault();
        if (!ev.repeat || !(state.current.dialog || state.current.encounter)) pressDir(dir);
      } else if (ev.repeat) return;
      else if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        pressA();
      }
      else if (ev.key === 'Shift' || ev.key === 'x') pressB(true);
      else if (ev.key === 'm' || ev.key === 'Escape') toggleMenu();
    };
    const up = (ev: KeyboardEvent) => {
      const dir = keys[ev.key];
      if (dir && getEngine().held === dir) getEngine().held = null;
      if (ev.key === 'Shift' || ev.key === 'x') pressB(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [focused, pressA, pressB, pressDir, toggleMenu]);

  // ------------------------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------------------------

  const appearance = useMemo<Appearance>(
    () => ({
      ...PLAYER_LOOK,
      shirt: '#8A8F98',
      vest: save && save.story >= 2 ? save.equipped.vest : null,
      hat: save?.equipped.hat ?? null,
    }),
    [save?.story, save?.equipped.vest, save?.equipped.hat], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!save) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={retro.accent} />
      </View>
    );
  }

  const lv = levelFor(save.xp);
  const goal = storyGoal(save);
  const carry = getEngine().player.carry;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.hud}>
        <Text style={styles.hudText}>🪙 {save.coins}</Text>
        <Text style={styles.hudText}>
          Lv {lv.level} · {rankFor(lv.level)}
        </Text>
        <Text style={styles.hudText}>
          📦 {carry.length}/{capacity(save)}
        </Text>
      </View>
      <View style={styles.xpTrack}>
        <View style={[styles.xpFill, { width: `${(lv.into / lv.needed) * 100}%` }]} />
      </View>
      {goal && (
        <Text style={styles.goal} numberOfLines={2}>
          ★ {goal}
        </Text>
      )}

      <View style={styles.game}>
        <GameView
          player={appearance}
          staff={STAFF_LOOKS}
          active={focused}
          onStep={onStep}
          pager={save.owned.includes('pager')}
        />
        {encounter && <Encounter key={encounter.key} spec={encounter.spec} inputRef={encounterInput} />}
        {dialog && !encounter && (
          <DialogBox key={`${dialog.id}-${dialog.line}`} dialog={dialog.dialog} line={dialog.line} cursor={dialog.cursor} onAdvance={advanceDialog} onPick={pickChoice} />
        )}
        <View style={styles.toasts} pointerEvents="none">
          {toasts.map((t) => (
            <Text key={t.id} style={styles.toast}>
              {t.text}
            </Text>
          ))}
        </View>
      </View>

      <View style={{ paddingBottom: insets.bottom, backgroundColor: retro.shell }}>
        <Controls onDir={pressDir} onA={pressA} onB={pressB} onStart={toggleMenu} />
      </View>

      {menu && (
        <Menu
          save={save}
          carry={carry.length}
          tab={menu}
          onTab={setMenu}
          onClose={() => setMenu(null)}
          onClaim={(period, id) => apply((s) => claimQuest(s, period, id))}
          onBonus={(period) => apply((s) => claimBonus(s, period))}
          onBuy={(offer: Offer, daily) => apply((s) => buy(s, offer, Math.random, daily))}
          onEquip={(id, slot) => apply((s) => ({ save: equip(s, id, slot), notes: [] }))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: retro.shell },
  center: { alignItems: 'center', justifyContent: 'center' },
  hud: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4, backgroundColor: retro.ink },
  hudText: { fontFamily: retro.font, color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  xpTrack: { height: 4, backgroundColor: '#5A5257' },
  xpFill: { height: '100%', backgroundColor: retro.gold },
  goal: { fontFamily: retro.font, fontSize: 12, fontWeight: '700', color: retro.ink, backgroundColor: '#FFF6B0', paddingHorizontal: 10, paddingVertical: 4 },
  game: { flex: 1, overflow: 'hidden' },
  toasts: { position: 'absolute', top: 8, left: 8, right: 8, alignItems: 'center', gap: 4 },
  toast: {
    fontFamily: retro.font,
    fontWeight: '800',
    fontSize: 12,
    color: retro.ink,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: retro.ink,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
