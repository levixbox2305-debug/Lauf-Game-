import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BADGES, SHOP, SHOP_BY_ID, STORE_NAME } from '../../market/data';
import {
  capacity,
  dailyOffers,
  levelFor,
  rankFor,
  resetsIn,
  storyGoal,
  weeklyOffer,
  type MarketSave,
  type Offer,
  type Quest,
} from '../../market/logic';
import { box, retro } from './retro';

export type MenuTab = 'quests' | 'shop' | 'bag' | 'badges' | 'profile';

type Props = {
  save: MarketSave;
  carry: number;
  tab: MenuTab;
  onTab: (tab: MenuTab) => void;
  onClose: () => void;
  onClaim: (period: 'daily' | 'weekly', id: string) => void;
  onBonus: (period: 'daily' | 'weekly') => void;
  onBuy: (offer: Offer, daily: boolean) => void;
  onEquip: (id: string | null, slot: 'vest' | 'hat') => void;
};

const TABS: { id: MenuTab; label: string }[] = [
  { id: 'quests', label: 'Quests' },
  { id: 'shop', label: 'Shop' },
  { id: 'bag', label: 'Tasche' },
  { id: 'badges', label: 'Orden' },
  { id: 'profile', label: 'Profil' },
];

function duration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)} T ${h % 24} Std`;
  return h ? `${h} Std ${m} Min` : `${m} Min`;
}

export function Menu({ save, carry, tab, onTab, onClose, onClaim, onBonus, onBuy, onEquip }: Props) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const resets = resetsIn(now);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.coins}>🪙 {save.coins} Taler</Text>
        <Pressable onPress={onClose} style={[box, styles.close]}>
          <Text style={styles.closeText}>✕ Zurück</Text>
        </Pressable>
      </View>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => onTab(t.id)} style={[styles.tab, tab === t.id && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'quests' && (
          <>
            {storyGoal(save) && (
              <Section title="★ Hauptgeschichte">
                <Text style={styles.body}>{storyGoal(save)}</Text>
              </Section>
            )}
            <QuestList title="Tagesquests" subtitle={`Neu in ${duration(resets.day)}`} period="daily" save={save} onClaim={onClaim} onBonus={onBonus} />
            <QuestList title="Wochenquests" subtitle={`Neu in ${duration(resets.week)}`} period="weekly" save={save} onClaim={onClaim} onBonus={onBonus} />
          </>
        )}

        {tab === 'shop' && <Shop save={save} onBuy={onBuy} dayReset={duration(resets.day)} weekReset={duration(resets.week)} />}

        {tab === 'bag' && (
          <>
            <Section title="Dabei">
              <Text style={styles.body}>
                Kisten: {carry} / {capacity(save)}
              </Text>
              {save.boosts.coins > 0 && <Text style={styles.body}>☕ Doppelte Taler noch {save.boosts.coins} Aufgaben</Text>}
              {save.boosts.xp > 0 && <Text style={styles.body}>🍫 Doppelte EP noch {save.boosts.xp} Aufgaben</Text>}
              {SHOP.filter((i) => i.kind === 'upgrade' && save.owned.includes(i.id)).map((i) => (
                <Text key={i.id} style={styles.body}>
                  {i.icon} {i.name} – {i.desc}
                </Text>
              ))}
            </Section>
            <Section title="Westen">
              <View style={styles.grid}>
                {SHOP.filter((i) => i.kind === 'vest' && save.owned.includes(i.id)).map((i) => (
                  <Pressable key={i.id} onPress={() => onEquip(i.id, 'vest')} style={[box, styles.tile, save.equipped.vest === i.id && styles.tileOn]}>
                    <Swatch color={i.color!} />
                    <Text style={styles.tileText}>{i.name}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>
            <Section title="Kopfbedeckung">
              <View style={styles.grid}>
                <Pressable onPress={() => onEquip(null, 'hat')} style={[box, styles.tile, save.equipped.hat === null && styles.tileOn]}>
                  <Text style={styles.icon}>🙂</Text>
                  <Text style={styles.tileText}>Ohne</Text>
                </Pressable>
                {SHOP.filter((i) => i.kind === 'hat' && save.owned.includes(i.id)).map((i) => (
                  <Pressable key={i.id} onPress={() => onEquip(i.id, 'hat')} style={[box, styles.tile, save.equipped.hat === i.id && styles.tileOn]}>
                    <Text style={styles.icon}>{i.icon}</Text>
                    <Text style={styles.tileText}>{i.name}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>
          </>
        )}

        {tab === 'badges' && (
          <Section title={`Orden ${save.badges.length} / ${BADGES.length}`}>
            <View style={styles.grid}>
              {BADGES.map((b) => {
                const has = save.badges.includes(b.id);
                return (
                  <View key={b.id} style={[box, styles.tile, !has && styles.locked]}>
                    <Text style={styles.icon}>{has ? b.icon : '❔'}</Text>
                    <Text style={styles.tileText}>{b.name}</Text>
                    <Text style={styles.small}>
                      {Math.min(save.stats[b.stat], b.target)} / {b.target}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Section>
        )}

        {tab === 'profile' && <Profile save={save} />}
      </ScrollView>
    </View>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={[box, styles.section]}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.small}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

function Swatch({ color }: { color: string }) {
  if (color === 'rainbow') {
    return (
      <View style={[styles.swatch, { flexDirection: 'row', overflow: 'hidden' }]}>
        {['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA'].map((c) => (
          <View key={c} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>
    );
  }
  return <View style={[styles.swatch, { backgroundColor: color }]} />;
}

function Bar({ value }: { value: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.min(1, value) * 100}%` }]} />
    </View>
  );
}

function QuestList({
  title,
  subtitle,
  period,
  save,
  onClaim,
  onBonus,
}: {
  title: string;
  subtitle: string;
  period: 'daily' | 'weekly';
  save: MarketSave;
  onClaim: Props['onClaim'];
  onBonus: Props['onBonus'];
}) {
  const board = save[period];
  const allClaimed = board.quests.every((q) => q.claimed);
  return (
    <Section title={title} subtitle={subtitle}>
      {board.quests.map((q: Quest) => {
        const done = q.progress >= q.target;
        return (
          <View key={q.id} style={styles.quest}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.body, q.claimed && styles.claimed]}>{q.text}</Text>
              <Bar value={q.progress / q.target} />
              <Text style={styles.small}>
                {q.progress} / {q.target} · 🪙 {q.coins} · {q.xp} EP
              </Text>
            </View>
            {q.claimed ? (
              <Text style={styles.check}>✔</Text>
            ) : (
              <Pressable disabled={!done} onPress={() => onClaim(period, q.id)} style={[styles.button, !done && styles.buttonOff]}>
                <Text style={styles.buttonText}>Abholen</Text>
              </Pressable>
            )}
          </View>
        );
      })}
      <View style={styles.quest}>
        <Text style={[styles.body, { flex: 1 }]}>🎁 Bonus für alle drei {period === 'daily' ? '(100 Taler)' : '(600 Taler)'}</Text>
        {board.bonusClaimed ? (
          <Text style={styles.check}>✔</Text>
        ) : (
          <Pressable disabled={!allClaimed} onPress={() => onBonus(period)} style={[styles.button, !allClaimed && styles.buttonOff]}>
            <Text style={styles.buttonText}>Öffnen</Text>
          </Pressable>
        )}
      </View>
    </Section>
  );
}

function Shop({ save, onBuy, dayReset, weekReset }: { save: MarketSave; onBuy: Props['onBuy']; dayReset: string; weekReset: string }) {
  const daily = dailyOffers(save.daily.key);
  const weekly = weeklyOffer(save.weekly.key);
  const owned = (id: string) => SHOP_BY_ID[id].kind !== 'consumable' && save.owned.includes(id);

  const row = (offer: Offer, isDaily: boolean) => {
    const item = SHOP_BY_ID[offer.id];
    const sold = owned(offer.id) || (isDaily && save.shop.bought.includes(offer.id));
    const locked = item.requires && !save.owned.includes(item.requires);
    return (
      <View key={`${isDaily}-${offer.id}`} style={styles.offer}>
        <Text style={styles.offerIcon}>{item.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.body}>
            {item.name}
            {offer.discount > 0 && <Text style={styles.discount}> −{offer.discount} %</Text>}
          </Text>
          <Text style={styles.small}>{locked ? `Erst ${SHOP_BY_ID[item.requires!].name} kaufen` : item.desc}</Text>
        </View>
        {sold ? (
          <Text style={styles.check}>{owned(offer.id) ? 'Hast du' : 'Gekauft'}</Text>
        ) : (
          <Pressable
            disabled={!!locked}
            onPress={() => onBuy(offer, isDaily)}
            style={[styles.button, (locked || save.coins < offer.price) && styles.buttonOff]}>
            <Text style={styles.buttonText}>🪙 {offer.price}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <>
      <Section title="Tagesangebote" subtitle={`Neu in ${dayReset}`}>
        {daily.map((o) => row(o, true))}
      </Section>
      <Section title="✨ Wochen-Highlight" subtitle={`Neu in ${weekReset}`}>
        {row(weekly, false)}
      </Section>
      <Section title="Sortiment">
        {SHOP.filter((i) => (i.kind === 'upgrade' || i.kind === 'consumable') && !i.weeklyOnly).map((i) => row({ id: i.id, price: i.price, discount: 0 }, false))}
      </Section>
    </>
  );
}

function Profile({ save }: { save: MarketSave }) {
  const lv = levelFor(save.xp);
  const s = save.stats;
  return (
    <>
      <Section title={`${rankFor(lv.level)} · Level ${lv.level}`}>
        <Bar value={lv.into / lv.needed} />
        <Text style={styles.small}>
          {lv.into} / {lv.needed} EP bis Level {lv.level + 1}
        </Text>
        <Text style={styles.body}>🔥 Tagesbonus: {save.login.streak} Tag(e) in Folge</Text>
      </Section>
      <Section title="Statistik">
        {[
          ['Regalplätze aufgefüllt', s.restock],
          ['Pfützen gewischt', s.spill],
          ['Kund:innen abkassiert', s.checkout],
          ['Fragen beantwortet', s.question],
          ['MHD-Kontrollen', s.mhd],
          ['Pfandautomat geleert', s.pfand],
          ['Schritte', s.steps],
          ['Taler verdient', s.earned],
          ['Einkäufe im Shop', s.bought],
        ].map(([label, n]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.body}>{label}</Text>
            <Text style={styles.statValue}>{n}</Text>
          </View>
        ))}
      </Section>
      <Text style={styles.footnote}>
        Ein Fan-Spiel. {STORE_NAME} ist eine Marke ihrer Inhaberin; dieses Spiel steht in keiner Verbindung zu ihr.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#3A3438' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 },
  coins: { fontFamily: retro.font, fontWeight: '900', fontSize: 16, color: '#FFE08A' },
  close: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 3 },
  closeText: { fontFamily: retro.font, fontWeight: '800', fontSize: 13, color: retro.ink },
  tabs: { flexDirection: 'row', paddingHorizontal: 8, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: '#5A5257', alignItems: 'center' },
  tabActive: { backgroundColor: retro.cream },
  tabText: { fontFamily: retro.font, fontWeight: '800', fontSize: 12, color: '#D9D4CC' },
  tabTextActive: { color: retro.accent },
  content: { padding: 10, gap: 10, backgroundColor: retro.cream, minHeight: '100%', paddingBottom: 40 },
  section: { padding: 12, gap: 8 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontFamily: retro.font, fontWeight: '900', fontSize: 15, color: retro.accent },
  body: { fontFamily: retro.font, fontSize: 13, color: retro.ink, fontWeight: '600' },
  small: { fontFamily: retro.font, fontSize: 11, color: retro.muted },
  claimed: { color: retro.muted, textDecorationLine: 'line-through' },
  quest: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  check: { fontFamily: retro.font, fontWeight: '900', color: retro.green, fontSize: 13 },
  button: { backgroundColor: retro.accent, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 4, borderWidth: 2, borderColor: retro.ink },
  buttonOff: { backgroundColor: '#B5AFA6' },
  buttonText: { fontFamily: retro.font, fontWeight: '900', fontSize: 12, color: '#FFFFFF' },
  barTrack: { height: 8, borderRadius: 4, borderWidth: 2, borderColor: retro.ink, backgroundColor: '#E0DCD0', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: retro.green },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  offerIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  discount: { color: retro.accent, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31%', alignItems: 'center', padding: 8, gap: 4, borderWidth: 3 },
  tileOn: { borderColor: retro.accent, backgroundColor: '#FFF1F1' },
  tileText: { fontFamily: retro.font, fontSize: 11, fontWeight: '700', color: retro.ink, textAlign: 'center' },
  locked: { opacity: 0.55 },
  icon: { fontSize: 26 },
  swatch: { width: 30, height: 30, borderRadius: 4, borderWidth: 2, borderColor: retro.ink },
  stat: { flexDirection: 'row', justifyContent: 'space-between' },
  statValue: { fontFamily: retro.font, fontWeight: '900', fontSize: 13, color: retro.ink },
  footnote: { fontFamily: retro.font, fontSize: 10, color: retro.muted, textAlign: 'center', marginTop: 6 },
});
