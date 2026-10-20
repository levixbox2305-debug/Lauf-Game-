import AsyncStorage from '@react-native-async-storage/async-storage';

import { createGame, migrate, type GameState } from './game';
import type { GeoPoint } from './geo';

const GAME_KEY = 'laufwelt:game';
const ACTIVE_RUN_KEY = 'laufwelt:activeRun';

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

export async function loadGame(): Promise<GameState> {
  try {
    const raw = await AsyncStorage.getItem(GAME_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Spielstand konnte nicht geladen werden', e);
  }
  return createGame();
}

export async function saveGame(state: GameState): Promise<void> {
  await AsyncStorage.setItem(GAME_KEY, JSON.stringify(state));
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
