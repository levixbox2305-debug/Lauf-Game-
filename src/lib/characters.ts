// Residents: each building type has one character who moves in once its challenge run is done.

import type { GameState, ItemId, RunRecord, World, WorldId } from './game';

export type CharacterId =
  | 'tea'
  | 'farmer'
  | 'fisher'
  | 'watch'
  | 'monk'
  | 'samurai'
  | 'student'
  | 'clerk'
  | 'chef'
  | 'conductor'
  | 'salaryman'
  | 'innkeeper'
  | 'hermit';

export type Challenge =
  | { kind: 'distance'; km: number }
  | { kind: 'duration'; minutes: number }
  | { kind: 'pace'; km: number; maxSecPerKm: number }
  /** Start the run before this hour. */
  | { kind: 'before'; hour: number; km: number }
  /** Start the run at or after this hour. */
  | { kind: 'after'; hour: number; km: number };

export type CharacterDef = {
  id: CharacterId;
  name: string;
  role: string;
  world: WorldId;
  /** Building that triggers the challenge and where the character lives. */
  home: ItemId;
  challenge: Challenge;
  /** Where they spend working hours; their home if none of these is built. */
  work: ItemId[];
  /** Night shift: works at night and sleeps during the day. */
  nocturnal?: boolean;
  doing: { work: string; social: string; stroll: string };
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'tea', name: 'Hana', role: 'Teemeisterin', world: 'island', home: 'teahouse',
    challenge: { kind: 'distance', km: 2 }, work: ['teahouse'],
    doing: { work: 'bereitet Matcha zu', social: 'plaudert unter der Sakura', stroll: 'sammelt Kirschblüten' },
  },
  {
    id: 'farmer', name: 'Kenji', role: 'Reisbauer', world: 'island', home: 'rice',
    challenge: { kind: 'before', hour: 9, km: 1 }, work: ['rice'],
    doing: { work: 'pflanzt Reis', social: 'trinkt Tee mit Nachbarn', stroll: 'prüft das Wetter' },
  },
  {
    id: 'fisher', name: 'Mio', role: 'Koi-Pflegerin', world: 'island', home: 'pond',
    challenge: { kind: 'distance', km: 3 }, work: ['pond'],
    doing: { work: 'füttert die Koi', social: 'erzählt Fischgeschichten', stroll: 'sucht schöne Steine' },
  },
  {
    id: 'watch', name: 'Taro', role: 'Nachtwächter', world: 'island', home: 'lantern',
    challenge: { kind: 'after', hour: 20, km: 1 }, work: ['lantern', 'torii'], nocturnal: true,
    doing: { work: 'zündet die Laternen an', social: 'wärmt sich am Teehaus', stroll: 'dreht seine Runde' },
  },
  {
    id: 'monk', name: 'Ryo', role: 'Mönch', world: 'island', home: 'pagoda',
    challenge: { kind: 'duration', minutes: 30 }, work: ['pagoda', 'torii', 'bell'],
    doing: { work: 'meditiert', social: 'segnet die Reisfelder', stroll: 'fegt den Weg' },
  },
  {
    id: 'samurai', name: 'Akira', role: 'Samurai', world: 'island', home: 'castle',
    challenge: { kind: 'distance', km: 10 }, work: ['castle', 'torii'],
    doing: { work: 'übt mit dem Schwert', social: 'trinkt Tee', stroll: 'bewacht die Insel' },
  },
  {
    id: 'student', name: 'Yui', role: 'Schülerin', world: 'city', home: 'house',
    challenge: { kind: 'distance', km: 2 }, work: ['station', 'konbini'],
    doing: { work: 'ist auf dem Weg zur Schule', social: 'holt sich ein Onigiri', stroll: 'hört Musik' },
  },
  {
    id: 'clerk', name: 'Sora', role: 'Konbini-Verkäufer', world: 'city', home: 'konbini',
    challenge: { kind: 'pace', km: 1, maxSecPerKm: 360 }, work: ['konbini'],
    doing: { work: 'füllt die Regale auf', social: 'zieht sich was am Automaten', stroll: 'macht Pause' },
  },
  {
    id: 'chef', name: 'Daichi', role: 'Ramen-Koch', world: 'city', home: 'ramen',
    challenge: { kind: 'distance', km: 5 }, work: ['ramen'],
    doing: { work: 'kocht Brühe', social: 'kauft frische Nudeln', stroll: 'probiert die Konkurrenz' },
  },
  {
    id: 'conductor', name: 'Emi', role: 'Schaffnerin', world: 'city', home: 'station',
    challenge: { kind: 'distance', km: 8 }, work: ['station'],
    doing: { work: 'pfeift den Zug ab', social: 'isst Ramen', stroll: 'schaut auf den Fahrplan' },
  },
  {
    id: 'salaryman', name: 'Hiro', role: 'Büroangestellter', world: 'city', home: 'tower',
    challenge: { kind: 'before', hour: 7, km: 3 }, work: ['tower'],
    doing: { work: 'sitzt im Meeting', social: 'geht mit Kollegen Ramen essen', stroll: 'telefoniert' },
  },
  {
    id: 'innkeeper', name: 'Yuki', role: 'Onsen-Wirtin', world: 'mountain', home: 'onsen',
    challenge: { kind: 'duration', minutes: 45 }, work: ['onsen'],
    doing: { work: 'heizt das Onsen', social: 'bringt Gästen Tee', stroll: 'schaut nach dem Schnee' },
  },
  {
    id: 'hermit', name: 'Jin', role: 'Bergmönch', world: 'mountain', home: 'temple',
    challenge: { kind: 'distance', km: 15 }, work: ['temple', 'jizo'],
    doing: { work: 'läutet die Tempelglocke', social: 'badet im Onsen', stroll: 'pflegt die Jizo-Statuen' },
  },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c])) as Record<CharacterId, CharacterDef>;

/** Characters that live in a building of this type. */
export const charactersForItem = (item: ItemId) => CHARACTERS.filter((c) => c.home === item);

export function challengeText(ch: Challenge): string {
  const km = (n: number) => `${n.toLocaleString('de-DE')} km`;
  switch (ch.kind) {
    case 'distance':
      return `Lauf ${km(ch.km)} am Stück`;
    case 'duration':
      return `Lauf ${ch.minutes} Minuten am Stück`;
    case 'pace': {
      const pace = `${Math.floor(ch.maxSecPerKm / 60)}:${String(ch.maxSecPerKm % 60).padStart(2, '0')}`;
      return `Lauf ${km(ch.km)} schneller als ${pace} min/km`;
    }
    case 'before':
      return `Lauf ${km(ch.km)} vor ${ch.hour} Uhr morgens`;
    case 'after':
      return `Lauf ${km(ch.km)} nach ${ch.hour} Uhr abends`;
  }
}

export function challengeMet(ch: Challenge, run: RunRecord): boolean {
  if (run.rejectedReason) return false;
  const km = run.distanceM / 1000;
  const hour = new Date(run.startedAt).getHours();
  switch (ch.kind) {
    case 'distance':
      return km >= ch.km;
    case 'duration':
      return run.durationS >= ch.minutes * 60;
    case 'pace':
      return km >= ch.km && run.durationS / km <= ch.maxSecPerKm;
    case 'before':
      // Early morning only; a run at 1 a.m. shouldn't count as "before 9".
      return km >= ch.km && hour >= 4 && hour < ch.hour;
    case 'after':
      return km >= ch.km && hour >= ch.hour;
  }
}

const hasItem = (world: World, item: ItemId) => world.tiles.some((t) => t.unlocked && t.item === item);

/** Challenges that can be completed right now: the building exists, the character hasn't moved in. */
export function openChallenges(state: GameState): CharacterDef[] {
  return CHARACTERS.filter((c) => !state.residents.includes(c.id) && hasItem(state.worlds[c.world], c.home));
}

export function newResidentsForRun(state: GameState, run: RunRecord): CharacterId[] {
  return openChallenges(state)
    .filter((c) => challengeMet(c.challenge, run))
    .map((c) => c.id);
}
