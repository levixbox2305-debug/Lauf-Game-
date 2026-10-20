import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { authErrorMessage, fetchSave, pushSave, supabase } from '../lib/cloud';
import type { GameState } from '../lib/game';
import { mergeStates, sameState } from '../lib/sync';
import { useGame } from './GameProvider';

export type SyncStatus = 'off' | 'signedOut' | 'syncing' | 'synced' | 'error';

type CloudApi = {
  enabled: boolean;
  email: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Resolves to an error, or to a hint when the email still needs confirming. */
  signUp: (email: string, password: string) => Promise<{ error?: string; info?: string }>;
  signOut: () => Promise<void>;
  syncNow: () => void;
};

const CloudContext = createContext<CloudApi | null>(null);

/** How long to wait after a change before uploading, so a burst of building is one upload. */
const DEBOUNCE_MS = 1500;

/** `disabled` keeps the developer playground out of the backup. */
export function CloudProvider({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  const client = disabled ? null : supabase;
  const { state, mergeRemote } = useGame();
  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setStatus] = useState<SyncStatus>('syncing');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const userId = client ? (session?.user.id ?? null) : null;

  const stateRef = useRef<GameState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [client]);

  const running = useRef(false);
  const pending = useRef(false);

  // Pull, merge, push: the cloud copy never loses runs that another device uploaded meanwhile.
  const sync = useCallback(async () => {
    if (!userId) return;
    if (running.current) {
      pending.current = true;
      return;
    }
    running.current = true;
    setStatus('syncing');
    try {
      do {
        pending.current = false;
        const local = stateRef.current;
        const remote = await fetchSave(userId);
        const merged = remote ? mergeStates(local, remote) : local;
        if (!remote || !sameState(merged, remote)) await pushSave(userId, merged);
        mergeRemote(merged);
      } while (pending.current);
      setStatus('synced');
      setLastSyncedAt(Date.now());
    } catch (e) {
      console.warn('Sync fehlgeschlagen', e);
      setStatus('error');
    } finally {
      running.current = false;
    }
  }, [userId, mergeRemote]);

  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => void sync(), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [userId, state, sync]);

  // Coming back to the app is when another device's changes are most likely waiting.
  useEffect(() => {
    if (!userId) return;
    if (Platform.OS === 'web') {
      const onVisible = () => document.visibilityState === 'visible' && void sync();
      document.addEventListener('visibilitychange', onVisible);
      return () => document.removeEventListener('visibilitychange', onVisible);
    }
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void sync());
    return () => sub.remove();
  }, [userId, sync]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Backup ist nicht eingerichtet.';
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? authErrorMessage(error.message) : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Backup ist nicht eingerichtet.' };
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: authErrorMessage(error.message) };
    if (!data.session) return { info: 'Fast geschafft: Bestätige den Link in deiner E-Mail und melde dich dann hier an.' };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    // Local data stays on the device; only the connection to the cloud ends.
    await supabase?.auth.signOut();
  }, []);

  const status: SyncStatus = !client ? 'off' : userId ? syncStatus : 'signedOut';

  const api = useMemo<CloudApi>(
    () => ({
      enabled: client !== null,
      email: session?.user.email ?? null,
      status,
      lastSyncedAt,
      signIn,
      signUp,
      signOut,
      syncNow: () => void sync(),
    }),
    [client, session, status, lastSyncedAt, signIn, signUp, signOut, sync],
  );

  return <CloudContext.Provider value={api}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudApi {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error('useCloud muss innerhalb von CloudProvider verwendet werden');
  return ctx;
}
