import AsyncStorage from '@react-native-async-storage/async-storage';

import { createSave, migrate, type MarketSave } from './logic';

const KEY = 'laufwelt:markt';

export async function loadMarket(now: number): Promise<MarketSave> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw), now);
  } catch (e) {
    console.warn('Markt-Spielstand konnte nicht geladen werden', e);
  }
  return createSave(now);
}

export async function saveMarket(save: MarketSave): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(save));
}
