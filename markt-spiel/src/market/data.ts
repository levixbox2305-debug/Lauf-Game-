/** Everything the market game is made of: departments, shop, quests, ranks and badges. */

/** The store's name, shown on the facade and in texts. */
export const STORE_NAME = 'REWE';

export type CategoryId = 'o' | 'b' | 'k' | 't' | 'g' | 'd' | 's' | 'n';

export const CATEGORIES: Record<CategoryId, { name: string; products: string[]; colors: string[] }> = {
  o: { name: 'Obst & Gemüse', products: ['Bananen', 'Äpfel', 'Tomaten', 'Gurken', 'Paprika', 'Zwiebeln', 'Karotten'], colors: ['#F2C230', '#D8352A', '#5DA83A', '#F08A24'] },
  b: { name: 'Backstation', products: ['Brötchen', 'Brezeln', 'Croissants', 'Vollkornbrot', 'Baguette'], colors: ['#C98A45', '#A8672E', '#E3B474'] },
  k: { name: 'Kühlregal', products: ['Milch', 'Joghurt', 'Butter', 'Gouda', 'Quark', 'Eier'], colors: ['#FFFFFF', '#F4E27A', '#8EC9F0', '#F7B7C8'] },
  t: { name: 'Tiefkühl', products: ['Pizza', 'Rahmspinat', 'Fischstäbchen', 'Vanilleeis', 'Pommes'], colors: ['#E04A3A', '#3A7BD5', '#F2D24B', '#FFFFFF'] },
  g: { name: 'Getränke', products: ['Mineralwasser', 'Apfelschorle', 'Cola', 'Orangensaft', 'Limonade'], colors: ['#4FA3E0', '#E8A23A', '#7A2E1F', '#F3D23B'] },
  d: { name: 'Drogerie', products: ['Zahnpasta', 'Shampoo', 'Duschgel', 'Taschentücher', 'Waschmittel'], colors: ['#B6E0F5', '#C47FD5', '#5BC2A8', '#F28FB0'] },
  s: { name: 'Süßwaren & Snacks', products: ['Schokolade', 'Gummibärchen', 'Chips', 'Kekse', 'Salzstangen'], colors: ['#6B3A1E', '#E8483B', '#F5C542', '#9A5BD6'] },
  n: { name: 'Nudeln & Konserven', products: ['Nudeln', 'Reis', 'Tomatensoße', 'Mehl', 'Hefe', 'Linsen', 'Kaffee'], colors: ['#E9C46A', '#D1495B', '#F4F1DE', '#3D8B5C'] },
};
export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];
export const isShelf = (ch: string): ch is CategoryId => ch.length === 1 && 'obktgdsn'.includes(ch);

// ---------------------------------------------------------------------------------------------
// Tasks, rewards and progress
// ---------------------------------------------------------------------------------------------

export type TaskKind = 'restock' | 'spill' | 'checkout' | 'question' | 'mhd' | 'pfand';
export type StatKey = TaskKind | 'steps' | 'earned' | 'bought';

export const TASK_REWARDS: Record<TaskKind, { coins: number; xp: number }> = {
  restock: { coins: 8, xp: 6 },
  spill: { coins: 12, xp: 8 },
  checkout: { coins: 18, xp: 12 },
  question: { coins: 14, xp: 10 },
  mhd: { coins: 20, xp: 14 },
  pfand: { coins: 15, xp: 10 },
};

export const QUEST_KINDS: { kind: StatKey; text: (n: number) => string; daily: [number, number]; weekly: [number, number]; perUnit: number }[] = [
  { kind: 'restock', text: (n) => `Fülle ${n} Regalplätze auf`, daily: [6, 10], weekly: [40, 60], perUnit: 9 },
  { kind: 'spill', text: (n) => `Wische ${n} Pfützen weg`, daily: [2, 4], weekly: [15, 20], perUnit: 20 },
  { kind: 'checkout', text: (n) => `Kassiere ${n} Kund:innen ab`, daily: [2, 5], weekly: [15, 25], perUnit: 22 },
  { kind: 'question', text: (n) => `Beantworte ${n} Kundenfragen`, daily: [2, 4], weekly: [12, 18], perUnit: 22 },
  { kind: 'mhd', text: (n) => `Mach ${n} MHD-Kontrollen`, daily: [1, 3], weekly: [8, 12], perUnit: 35 },
  { kind: 'pfand', text: (n) => `Leere den Pfandautomaten ${n}×`, daily: [1, 2], weekly: [6, 10], perUnit: 35 },
  { kind: 'steps', text: (n) => `Lauf ${n} Schritte durch den Markt`, daily: [250, 450], weekly: [2500, 3500], perUnit: 0.15 },
  { kind: 'earned', text: (n) => `Verdiene ${n} Taler`, daily: [150, 300], weekly: [1500, 2500], perUnit: 0.4 },
];

/** Bonus for finishing all quests of a day or a week. */
export const DAILY_BONUS = { coins: 100, xp: 40 };
export const WEEKLY_BONUS = { coins: 600, xp: 250 };
/** Daily login reward by streak day (1..7, then it stays at day 7). */
export const LOGIN_REWARDS = [20, 30, 40, 50, 60, 80, 120];

export const RANKS: { level: number; title: string }[] = [
  { level: 1, title: 'Azubi' },
  { level: 5, title: 'Mitarbeiter:in' },
  { level: 10, title: 'Schichtleitung' },
  { level: 15, title: 'Abteilungsleitung' },
  { level: 20, title: 'Marktleitung' },
  { level: 30, title: 'Supermarkt-Legende' },
];

export const BADGES: { id: string; name: string; icon: string; stat: StatKey; target: number }[] = [
  { id: 'regal', name: 'Regal-Orden', icon: '📦', stat: 'restock', target: 50 },
  { id: 'wisch', name: 'Wisch-Orden', icon: '🧽', stat: 'spill', target: 25 },
  { id: 'kasse', name: 'Kassen-Orden', icon: '🧾', stat: 'checkout', target: 30 },
  { id: 'info', name: 'Auskunfts-Orden', icon: '💬', stat: 'question', target: 25 },
  { id: 'frisch', name: 'Frische-Orden', icon: '🥛', stat: 'mhd', target: 15 },
  { id: 'pfand', name: 'Pfand-Orden', icon: '♻️', stat: 'pfand', target: 15 },
  { id: 'lauf', name: 'Lauf-Orden', icon: '👟', stat: 'steps', target: 5000 },
  { id: 'geld', name: 'Taler-Orden', icon: '💰', stat: 'earned', target: 5000 },
];
export const BADGE_REWARD = 200;

// ---------------------------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------------------------

export type HatId = 'cap' | 'beanie' | 'chef' | 'helmet' | 'crown';

export type ShopItem = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  price: number;
  kind: 'upgrade' | 'consumable' | 'vest' | 'hat';
  /** Upgrade that has to be owned first. */
  requires?: string;
  /** Vest colour or hat sprite. */
  color?: string;
  hat?: HatId;
  /** Only ever offered as the weekly highlight. */
  weeklyOnly?: boolean;
};

export const SHOP: ShopItem[] = [
  { id: 'rollwagen', name: 'Rollwagen', icon: '🛒', desc: 'Trage 3 Kisten gleichzeitig.', price: 150, kind: 'upgrade' },
  { id: 'hubwagen', name: 'Hubwagen', icon: '🚜', desc: 'Trage 6 Kisten gleichzeitig.', price: 600, kind: 'upgrade', requires: 'rollwagen' },
  { id: 'sneaker', name: 'Turnschuhe', icon: '👟', desc: 'Du läufst schneller.', price: 250, kind: 'upgrade' },
  { id: 'pager', name: 'Pager', icon: '📟', desc: 'Zeigt, wo die nächste Aufgabe wartet.', price: 200, kind: 'upgrade' },
  { id: 'scanner', name: 'Profi-Scanner', icon: '🔫', desc: 'Streicht an Kasse und Kühlregal eine falsche Antwort.', price: 400, kind: 'upgrade' },
  { id: 'goldschild', name: 'Gold-Namensschild', icon: '📛', desc: '+10 % Taler für jede Aufgabe.', price: 900, kind: 'upgrade' },
  { id: 'kaffee', name: 'Kaffee', icon: '☕', desc: 'Doppelte Taler für die nächsten 10 Aufgaben.', price: 80, kind: 'consumable' },
  { id: 'riegel', name: 'Müsliriegel', icon: '🍫', desc: 'Doppelte Erfahrung für die nächsten 10 Aufgaben.', price: 80, kind: 'consumable' },
  { id: 'keks', name: 'Glückskeks', icon: '🥠', desc: 'Enthält 20 bis 200 Taler.', price: 60, kind: 'consumable' },
  { id: 'vest-red', name: 'Rote Weste', icon: '🦺', desc: 'Die klassische Dienstweste.', price: 0, kind: 'vest', color: '#CC2A2A' },
  { id: 'vest-blue', name: 'Blaue Weste', icon: '🦺', desc: 'Kühl wie das Kühlregal.', price: 120, kind: 'vest', color: '#2F6FD0' },
  { id: 'vest-green', name: 'Grüne Weste', icon: '🦺', desc: 'Frisch wie die Gemüseabteilung.', price: 120, kind: 'vest', color: '#3C9A4A' },
  { id: 'vest-purple', name: 'Lila Weste', icon: '🦺', desc: 'Für echte Schokofans.', price: 180, kind: 'vest', color: '#7B4BC2' },
  { id: 'vest-black', name: 'Schwarze Weste', icon: '🦺', desc: 'Nachtschicht-Look.', price: 220, kind: 'vest', color: '#2B2B33' },
  { id: 'vest-gold', name: 'Goldene Weste', icon: '✨', desc: 'Glänzt mit jeder Neonröhre um die Wette.', price: 1500, kind: 'vest', color: '#E0B12E', weeklyOnly: true },
  { id: 'vest-rainbow', name: 'Regenbogen-Weste', icon: '🌈', desc: 'Selten und bunt.', price: 1800, kind: 'vest', color: 'rainbow', weeklyOnly: true },
  { id: 'hat-cap', name: 'Rote Kappe', icon: '🧢', desc: 'Sportlich durch die Gänge.', price: 150, kind: 'hat', hat: 'cap', color: '#CC2A2A' },
  { id: 'hat-beanie', name: 'Wollmütze', icon: '🧶', desc: 'Für Schichten am Tiefkühlregal.', price: 150, kind: 'hat', hat: 'beanie', color: '#2F6FD0' },
  { id: 'hat-chef', name: 'Bäckermütze', icon: '👨‍🍳', desc: 'Direkt von der Backstation.', price: 250, kind: 'hat', hat: 'chef', color: '#FFFFFF' },
  { id: 'hat-helmet', name: 'Bauhelm', icon: '⛑️', desc: 'Sicherheit geht vor im Lager.', price: 200, kind: 'hat', hat: 'helmet', color: '#F2C230' },
  { id: 'hat-crown', name: 'Krone', icon: '👑', desc: 'Für Mitarbeiter:in des Monats.', price: 2500, kind: 'hat', hat: 'crown', color: '#F2C230', weeklyOnly: true },
];
export const SHOP_BY_ID = Object.fromEntries(SHOP.map((i) => [i.id, i])) as Record<string, ShopItem>;

/** How many offers the daily shop shows. */
export const DAILY_OFFERS = 4;
