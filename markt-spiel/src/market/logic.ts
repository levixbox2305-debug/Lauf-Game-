/** Rules of the market game: the save, rewards, levels, quests, shop and story. Pure functions only. */
import {
  BADGE_REWARD,
  BADGES,
  DAILY_BONUS,
  DAILY_OFFERS,
  LOGIN_REWARDS,
  QUEST_KINDS,
  RANKS,
  SHOP,
  SHOP_BY_ID,
  TASK_REWARDS,
  WEEKLY_BONUS,
  type StatKey,
  type TaskKind,
} from './data';
import type { StaffId } from './map';

export type Quest = { id: string; kind: StatKey; text: string; target: number; progress: number; coins: number; xp: number; claimed: boolean };
export type QuestBoard = { key: string; quests: Quest[]; bonusClaimed: boolean };

export type MarketSave = {
  version: 1;
  coins: number;
  xp: number;
  owned: string[];
  equipped: { vest: string; hat: string | null };
  /** Remaining tasks with doubled coins / XP. */
  boosts: { coins: number; xp: number };
  stats: Record<StatKey, number>;
  story: number;
  daily: QuestBoard;
  weekly: QuestBoard;
  /** Daily-shop offers already bought today. */
  shop: { day: string; bought: string[] };
  login: { last: string | null; streak: number };
  badges: string[];
};

export type GameEvent =
  | { type: 'task'; kind: TaskKind }
  | { type: 'talk'; who: StaffId }
  | { type: 'locker' }
  | { type: 'board' }
  | { type: 'buy' };

/** A change to the save plus what the player should be told about it. */
export type Outcome = { save: MarketSave; notes: string[]; error?: string };

// ---------------------------------------------------------------------------------------------
// Dates and randomness
// ---------------------------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** ISO week, e.g. "2026-W45". Weeks start on Monday. */
export const weekKey = (now: number) => {
  const d = new Date(now);
  const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((day.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${pad(week)}`;
};

/** Milliseconds until the next local midnight (daily reset) and the next Monday (weekly reset). */
export function resetsIn(now: number): { day: number; week: number } {
  const d = new Date(now);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  const toMonday = (8 - (d.getDay() || 7)) % 7 || 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + toMonday).getTime();
  return { day: midnight - now, week: monday - now };
}

export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(list: T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------------------------

const emptyStats = (): Record<StatKey, number> => ({
  restock: 0, spill: 0, checkout: 0, question: 0, mhd: 0, pfand: 0, steps: 0, earned: 0, bought: 0,
});

export function createSave(now: number): MarketSave {
  return refresh(
    {
      version: 1,
      coins: 50,
      xp: 0,
      owned: ['vest-red'],
      equipped: { vest: 'vest-red', hat: null },
      boosts: { coins: 0, xp: 0 },
      stats: emptyStats(),
      story: 0,
      daily: { key: '', quests: [], bonusClaimed: false },
      weekly: { key: '', quests: [], bonusClaimed: false },
      shop: { day: '', bought: [] },
      login: { last: null, streak: 0 },
      badges: [],
    },
    now,
  );
}

/** Accepts saves from older versions or with missing fields. */
export function migrate(raw: Partial<MarketSave>, now: number): MarketSave {
  const base = createSave(now);
  return refresh({ ...base, ...raw, stats: { ...base.stats, ...raw.stats }, boosts: { ...base.boosts, ...raw.boosts } }, now);
}

// ---------------------------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------------------------

/** Total XP needed to reach a level: 50 for level 2, 150 for 3, 500 for 5, 2250 for 10 … */
export const xpForLevel = (level: number) => 25 * (level - 1) * level;

export function levelFor(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return { level, into: xp - xpForLevel(level), needed: xpForLevel(level + 1) - xpForLevel(level) };
}

export const rankFor = (level: number) => [...RANKS].reverse().find((r) => level >= r.level)!.title;

export const capacity = (save: MarketSave) => (save.owned.includes('hubwagen') ? 6 : save.owned.includes('rollwagen') ? 3 : 1);

// ---------------------------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------------------------

const nice = (n: number) => (n >= 200 ? Math.round(n / 50) * 50 : n);

export function makeQuests(period: 'daily' | 'weekly', key: string): Quest[] {
  const rand = seeded(`${period}:${key}`);
  return shuffled(QUEST_KINDS, rand)
    .slice(0, 3)
    .map((q, i) => {
      const [min, max] = q[period];
      const target = nice(min + Math.floor(rand() * (max - min + 1)));
      const coins = Math.max(30, Math.round((target * q.perUnit * (period === 'weekly' ? 1.3 : 1)) / 5) * 5);
      return { id: `${key}-${i}`, kind: q.kind, text: q.text(target), target, progress: 0, coins, xp: Math.round(coins / 2), claimed: false };
    });
}

/** Starts new daily and weekly quests when the day or week has changed. */
export function refresh(save: MarketSave, now: number): MarketSave {
  const day = dayKey(now);
  const week = weekKey(now);
  let next = save;
  if (save.daily.key !== day) next = { ...next, daily: { key: day, quests: makeQuests('daily', day), bonusClaimed: false } };
  if (save.weekly.key !== week) next = { ...next, weekly: { key: week, quests: makeQuests('weekly', week), bonusClaimed: false } };
  if (save.shop.day !== day) next = { ...next, shop: { day, bought: [] } };
  return next;
}

const bump = (board: QuestBoard, kind: StatKey, n: number): QuestBoard => ({
  ...board,
  quests: board.quests.map((q) => (q.kind === kind ? { ...q, progress: Math.min(q.target, q.progress + n) } : q)),
});

export function claimQuest(save: MarketSave, period: 'daily' | 'weekly', id: string): Outcome {
  const board = save[period];
  const quest = board.quests.find((q) => q.id === id);
  if (!quest || quest.claimed) return { save, notes: [], error: 'Schon abgeholt.' };
  if (quest.progress < quest.target) return { save, notes: [], error: 'Noch nicht geschafft.' };
  const next = { ...save, [period]: { ...board, quests: board.quests.map((q) => (q.id === id ? { ...q, claimed: true } : q)) } };
  return gain(next, quest.coins, quest.xp, [`Quest geschafft: +${quest.coins} Taler, +${quest.xp} EP`]);
}

export function claimBonus(save: MarketSave, period: 'daily' | 'weekly'): Outcome {
  const board = save[period];
  if (board.bonusClaimed) return { save, notes: [], error: 'Schon abgeholt.' };
  if (!board.quests.every((q) => q.claimed)) return { save, notes: [], error: 'Hol zuerst alle Quests ab.' };
  const bonus = period === 'daily' ? DAILY_BONUS : WEEKLY_BONUS;
  return gain({ ...save, [period]: { ...board, bonusClaimed: true } }, bonus.coins, bonus.xp, [
    `${period === 'daily' ? 'Tages' : 'Wochen'}-Bonus: +${bonus.coins} Taler, +${bonus.xp} EP`,
  ]);
}

// ---------------------------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------------------------

/** Adds coins and XP, reporting level-ups. Not counted as "earned" (that's only for work). */
function gain(save: MarketSave, coins: number, xp: number, notes: string[]): Outcome {
  const before = levelFor(save.xp).level;
  const next = { ...save, coins: save.coins + coins, xp: save.xp + xp };
  const after = levelFor(next.xp).level;
  const out = [...notes];
  if (after > before) {
    out.push(`Level ${after}!`);
    if (rankFor(after) !== rankFor(before)) out.push(`Neuer Rang: ${rankFor(after)}`);
  }
  return { save: next, notes: out };
}

/** Counts a statistic towards quests and badges. */
export function addStat(save: MarketSave, kind: StatKey, n: number): Outcome {
  let next: MarketSave = {
    ...save,
    stats: { ...save.stats, [kind]: save.stats[kind] + n },
    daily: bump(save.daily, kind, n),
    weekly: bump(save.weekly, kind, n),
  };
  const notes: string[] = [];
  for (const b of BADGES) {
    if (b.stat === kind && !next.badges.includes(b.id) && next.stats[kind] >= b.target) {
      next = { ...next, badges: [...next.badges, b.id], coins: next.coins + BADGE_REWARD };
      notes.push(`${b.icon} ${b.name} erhalten! +${BADGE_REWARD} Taler`);
    }
  }
  for (const [period, label] of [['daily', 'Tages'], ['weekly', 'Wochen']] as const) {
    for (const q of next[period].quests) {
      const was = save[period].quests.find((o) => o.id === q.id);
      if (was && was.progress < q.target && q.progress >= q.target) notes.push(`${label}quest erfüllt: ${q.text} – am Schwarzen Brett abholen!`);
    }
  }
  return { save: next, notes };
}

/** Pays for a finished task, with boosts and the gold name tag applied. */
export function completeTask(save: MarketSave, kind: TaskKind, quality = 1): Outcome & { coins: number; xp: number } {
  const base = TASK_REWARDS[kind];
  let coinMul = save.owned.includes('goldschild') ? 1.1 : 1;
  let xpMul = 1;
  const boosts = { ...save.boosts };
  if (boosts.coins > 0) {
    coinMul *= 2;
    boosts.coins--;
  }
  if (boosts.xp > 0) {
    xpMul *= 2;
    boosts.xp--;
  }
  const coins = Math.max(1, Math.round(base.coins * coinMul * quality));
  const xp = Math.max(1, Math.round(base.xp * xpMul * quality));
  const paid = gain({ ...save, boosts }, coins, xp, []);
  const counted = addStat(paid.save, kind, 1);
  const earned = addStat(counted.save, 'earned', coins);
  const story = advanceStory(earned.save, { type: 'task', kind });
  return { save: story.save, notes: [...paid.notes, ...counted.notes, ...earned.notes, ...story.notes], coins, xp };
}

// ---------------------------------------------------------------------------------------------
// Login reward
// ---------------------------------------------------------------------------------------------

export function claimLogin(save: MarketSave, now: number): Outcome {
  const today = dayKey(now);
  if (save.login.last === today) return { save, notes: [] };
  const yesterday = dayKey(new Date(now).setDate(new Date(now).getDate() - 1));
  const streak = save.login.last === yesterday ? save.login.streak + 1 : 1;
  const coins = LOGIN_REWARDS[Math.min(streak, LOGIN_REWARDS.length) - 1];
  return gain({ ...save, login: { last: today, streak } }, coins, 0, [`Tagesbonus (Tag ${streak} in Folge): +${coins} Taler`]);
}

// ---------------------------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------------------------

export type Offer = { id: string; price: number; discount: number };

/** Rotates every day: consumables and cosmetics, each with a discount. */
export function dailyOffers(day: string): Offer[] {
  const rand = seeded(`shop:${day}`);
  const pool = SHOP.filter((i) => !i.weeklyOnly && i.price > 0 && i.kind !== 'upgrade');
  return shuffled(pool, rand)
    .slice(0, DAILY_OFFERS)
    .map((i) => {
      const discount = [10, 20, 25, 30, 40][Math.floor(rand() * 5)];
      return { id: i.id, price: Math.round((i.price * (100 - discount)) / 100 / 5) * 5, discount };
    });
}

/** One rare item per week. */
export function weeklyOffer(week: string): Offer {
  const pool = SHOP.filter((i) => i.weeklyOnly);
  const item = pool[Math.floor(seeded(`weekly:${week}`)() * pool.length)];
  return { id: item.id, price: item.price, discount: 0 };
}

export const ownsForever = (id: string) => SHOP_BY_ID[id].kind !== 'consumable';

/** `daily` marks a daily-shop offer: one purchase per day. */
export function buy(save: MarketSave, offer: Offer, rand: () => number, daily = false): Outcome {
  const item = SHOP_BY_ID[offer.id];
  if (!item) return { save, notes: [], error: 'Gibt es nicht.' };
  if (ownsForever(item.id) && save.owned.includes(item.id)) return { save, notes: [], error: 'Hast du schon.' };
  if (item.requires && !save.owned.includes(item.requires)) return { save, notes: [], error: `Erst ${SHOP_BY_ID[item.requires].name} kaufen.` };
  if (daily && save.shop.bought.includes(item.id)) return { save, notes: [], error: 'Heute schon gekauft – morgen gibt es neue Angebote.' };
  if (save.coins < offer.price) return { save, notes: [], error: `Dir fehlen ${offer.price - save.coins} Taler.` };

  let next: MarketSave = { ...save, coins: save.coins - offer.price };
  if (daily) next = { ...next, shop: { ...next.shop, bought: [...next.shop.bought, item.id] } };
  const notes = [`${item.icon} ${item.name} gekauft!`];
  if (ownsForever(item.id)) next = { ...next, owned: [...next.owned, item.id] };
  if (item.kind === 'vest') next = { ...next, equipped: { ...next.equipped, vest: item.id } };
  if (item.kind === 'hat') next = { ...next, equipped: { ...next.equipped, hat: item.id } };
  if (item.id === 'kaffee') next = { ...next, boosts: { ...next.boosts, coins: next.boosts.coins + 10 } };
  if (item.id === 'riegel') next = { ...next, boosts: { ...next.boosts, xp: next.boosts.xp + 10 } };
  if (item.id === 'keks') {
    const found = 20 + Math.floor(rand() * 19) * 10;
    next = { ...next, coins: next.coins + found };
    notes.push(`Im Glückskeks: ${found} Taler!`);
  }
  const counted = addStat(next, 'bought', 1);
  const story = advanceStory(counted.save, { type: 'buy' });
  return { save: story.save, notes: [...notes, ...counted.notes, ...story.notes] };
}

export function equip(save: MarketSave, id: string | null, slot: 'vest' | 'hat'): MarketSave {
  if (id !== null && !save.owned.includes(id)) return save;
  if (slot === 'vest' && id === null) return save;
  return { ...save, equipped: { ...save.equipped, [slot]: id } };
}

// ---------------------------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------------------------

type Step = { goal: string; done: (e: GameEvent, save: MarketSave) => boolean; coins: number; xp: number };

const talkTo = (who: StaffId, level = 1) => (e: GameEvent, s: MarketSave) => e.type === 'talk' && e.who === who && levelFor(s.xp).level >= level;
const did = (kind: TaskKind) => (e: GameEvent) => e.type === 'task' && e.kind === kind;

export const STORY: Step[] = [
  { goal: 'Melde dich bei Frau Berger im Büro (oben rechts).', done: talkTo('berger'), coins: 20, xp: 10 },
  { goal: 'Hol deine Weste aus dem Spind im Büro.', done: (e) => e.type === 'locker', coins: 20, xp: 10 },
  { goal: 'Hol im Lager (oben links) eine Kiste und füll ein leeres Regal auf.', done: did('restock'), coins: 30, xp: 20 },
  { goal: 'Hilf einer Kundin mit „?“ über dem Kopf.', done: did('question'), coins: 30, xp: 20 },
  { goal: 'Wisch eine Pfütze im Verkaufsraum weg.', done: did('spill'), coins: 30, xp: 20 },
  { goal: 'Kassiere an einer Kasse ab, an der jemand wartet.', done: did('checkout'), coins: 40, xp: 25 },
  { goal: 'Schau am Schwarzen Brett im Pausenraum nach deinen Quests.', done: (e) => e.type === 'board', coins: 20, xp: 10 },
  { goal: 'Kauf dir etwas am Personal-Shop (Automat im Pausenraum).', done: (e) => e.type === 'buy', coins: 30, xp: 15 },
  { goal: 'Leer den Pfandautomaten neben den Kassen, sobald er voll ist.', done: did('pfand'), coins: 40, xp: 25 },
  { goal: 'Mach eine MHD-Kontrolle am Kühl- oder Tiefkühlregal mit „!“.', done: did('mhd'), coins: 40, xp: 25 },
  { goal: 'Erreiche Level 5 und melde dich bei Frau Berger.', done: talkTo('berger', 5), coins: 150, xp: 0 },
  { goal: 'Erreiche Level 10 und melde dich bei Frau Berger.', done: talkTo('berger', 10), coins: 400, xp: 0 },
];

export const storyGoal = (save: MarketSave): string | null => STORY[save.story]?.goal ?? null;

export function advanceStory(save: MarketSave, event: GameEvent): Outcome {
  const step = STORY[save.story];
  if (!step || !step.done(event, save)) return { save, notes: [] };
  const next = { ...save, story: save.story + 1 };
  const tail = next.story >= STORY.length ? ['Hauptgeschichte abgeschlossen – du bist jetzt fest im Team!'] : [];
  return gain(next, step.coins, step.xp, [`Story-Ziel geschafft: +${step.coins} Taler`, ...tail]);
}
