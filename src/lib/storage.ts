import AsyncStorage from '@react-native-async-storage/async-storage';

import { createGame, type GameState } from './game';
import type { GeoPoint } from './geo';

const GAME_KEY = 'laufwelt:game';
const ACTIVE_RUN_KEY = 'laufwelt:activeRun';

export type TrackingMode = 'background' | 'foreground';

export type ActiveRun = {
  startedAt: number;
  distanceM: number;
  points: GeoPoint[];
  mode: TrackingMode;
};

export async function loadGame(): Promise<GameState> {
  try {
    const raw = await AsyncStorage.getItem(GAME_KEY);
    if (raw) return JSON.parse(raw) as GameState;
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
  return raw ? (JSON.parse(raw) as ActiveRun) : null;
}

export async function saveActiveRun(run: ActiveRun): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(run));
}

export async function clearActiveRun(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_RUN_KEY);
}
