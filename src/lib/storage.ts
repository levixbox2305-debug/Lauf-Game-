import AsyncStorage from '@react-native-async-storage/async-storage';

import { createGame, migrate, type GameState } from './game';
import type { GeoPoint } from './geo';
import { createSandboxGame } from './sandbox';

const GAME_KEY = 'laufwelt:game';
const SANDBOX_KEY = 'laufwelt:sandbox';
const PROFILE_KEY = 'laufwelt:profile';
const ACTIVE_RUN_KEY = 'laufwelt:activeRun';

/** 'sandbox' is the developer playground: its own save, never synced. */
export type Profile = 'main' | 'sandbox';

const gameKey = (profile: Profile) => (profile === 'sandbox' ? SANDBOX_KEY : GAME_KEY);

export async function loadProfile(): Promise<Profile> {
  return (await AsyncStorage.getItem(PROFILE_KEY)) === 'sandbox' ? 'sandbox' : 'main';
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, profile);
}

export async function clearSandbox(): Promise<void> {
  await AsyncStorage.removeItem(SANDBOX_KEY);
}

export type TrackingMode = 'background' | 'foreground';

export type ActiveRun = {
  startedAt: number;
  distanceM: number;
  /** A new segment starts after every pause, so the route doesn't connect across it. */
  segments: GeoPoint[][];
  mode: TrackingMode;
  pausedAt: number | null;
  pausedMs: number;
};

export async function loadGame(profile: Profile = 'main'): Promise<GameState> {
  try {
    const raw = await AsyncStorage.getItem(gameKey(profile));
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Spielstand konnte nicht geladen werden', e);
  }
  return profile === 'sandbox' ? createSandboxGame() : createGame();
}

export async function saveGame(state: GameState, profile: Profile = 'main'): Promise<void> {
  await AsyncStorage.setItem(gameKey(profile), JSON.stringify(state));
}

export async function loadActiveRun(): Promise<ActiveRun | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
  if (!raw) return null;
  const run = JSON.parse(raw) as ActiveRun & { points?: GeoPoint[] };
  // Runs saved before pausing existed had a single list of points.
  if (!run.segments) return { ...run, segments: [run.points ?? []], pausedAt: null, pausedMs: 0 };
  return run;
}

export async function saveActiveRun(run: ActiveRun): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(run));
}

export async function clearActiveRun(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_RUN_KEY);
}
