import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { migrate, type GameState } from './game';

// Native lacks a complete URL implementation; browsers have their own and must keep it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (Platform.OS !== 'web') require('react-native-url-polyfill/auto');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Null when no Supabase project is configured; the app then simply runs without backup. */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// On native, token refresh only runs while the app is in the foreground.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

const TABLE = 'game_saves';

export async function fetchSave(userId: string): Promise<GameState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select('state').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.state ? migrate(data.state) : null;
}

export async function pushSave(userId: string, state: GameState): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

/** Turns Supabase's English auth errors into something a runner understands. */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-Mail oder Passwort stimmt nicht.';
  if (m.includes('email not confirmed')) return 'Bitte bestätige zuerst deine E-Mail (Link im Postfach).';
  if (m.includes('already registered')) return 'Diese E-Mail hat schon ein Konto – melde dich an.';
  if (m.includes('password should be at least')) return 'Das Passwort braucht mindestens 6 Zeichen.';
  if (m.includes('unable to validate email') || m.includes('invalid format')) return 'Diese E-Mail-Adresse sieht ungültig aus.';
  if (m.includes('network') || m.includes('fetch')) return 'Keine Verbindung – versuch es gleich nochmal.';
  return message;
}
