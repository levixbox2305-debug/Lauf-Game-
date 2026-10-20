import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { distanceM, type GeoPoint } from './geo';
import { clearActiveRun, loadActiveRun, saveActiveRun, type ActiveRun, type TrackingMode } from './storage';

export const LOCATION_TASK = 'laufwelt-location';

/** Readings worse than this are too imprecise to count. */
const MAX_ACCURACY_M = 35;
/** Ignore jitter while standing still. */
const MIN_STEP_M = 3;
/** Anything faster between two points is a GPS jump, not running. */
const MAX_STEP_SPEED_MS = 12;

type Listener = (run: ActiveRun | null) => void;

const listeners = new Set<Listener>();
let current: ActiveRun | null = null;
let watchSub: Location.LocationSubscription | null = null;
// Background and foreground updates can overlap; process them one after another.
let queue: Promise<void> = Promise.resolve();

function emit() {
  for (const l of listeners) l(current);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

export function ingest(locations: Location.LocationObject[]): Promise<void> {
  queue = queue.then(async () => {
    // The background task may run after the app was killed, so fall back to storage.
    const run = current ?? (await loadActiveRun());
    if (!run) return;

    for (const loc of locations) {
      const { accuracy, latitude, longitude } = loc.coords;
      if (accuracy != null && accuracy > MAX_ACCURACY_M) continue;

      const point: GeoPoint = { lat: latitude, lon: longitude, t: loc.timestamp };
      const last = run.points[run.points.length - 1];
      if (!last) {
        run.points.push(point);
        continue;
      }
      if (point.t <= last.t) continue;

      const step = distanceM(last, point);
      const dt = (point.t - last.t) / 1000;
      if (step < MIN_STEP_M || step / dt > MAX_STEP_SPEED_MS) continue;

      run.distanceM += step;
      run.points.push(point);
    }

    current = run;
    await saveActiveRun(run);
    emit();
  });
  return queue;
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.warn('Standort-Task Fehler', error.message);
      return;
    }
    if (data?.locations?.length) await ingest(data.locations);
  });
}

const locationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 5,
};

async function startForegroundWatch() {
  watchSub?.remove();
  watchSub = await Location.watchPositionAsync({ ...locationOptions, timeInterval: 2000 }, (loc) => {
    void ingest([loc]);
  });
}

async function startBackgroundUpdates(): Promise<boolean> {
  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      ...locationOptions,
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Laufwelt',
        notificationBody: 'Dein Lauf wird aufgezeichnet 🏃',
        notificationColor: '#2F7D4F',
      },
    });
    return true;
  } catch (e) {
    // Expo Go cannot run background location; we still track while the app is open.
    console.warn('Hintergrund-Tracking nicht verfügbar, nutze Vordergrund', e);
    return false;
  }
}

export type StartResult = { ok: true; mode: TrackingMode } | { ok: false; reason: string };

export async function startRun(): Promise<StartResult> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return { ok: false, reason: 'Ohne Standortfreigabe kann Laufwelt deinen Lauf nicht messen.' };
  }

  let mode: TrackingMode = 'foreground';
  if (Platform.OS !== 'web') {
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.status === 'granted' && (await Location.isBackgroundLocationAvailableAsync())) {
        mode = (await startBackgroundUpdates()) ? 'background' : 'foreground';
      }
    } catch {
      mode = 'foreground';
    }
  }

  current = { startedAt: Date.now(), distanceM: 0, points: [], mode };
  await saveActiveRun(current);
  if (mode === 'foreground') await startForegroundWatch();
  emit();
  return { ok: true, mode };
}

/** Picks up a run that was still going when the app was closed. */
export async function restoreRun(): Promise<void> {
  const run = await loadActiveRun();
  if (!run) return;
  current = run;
  if (run.mode === 'foreground') {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status === 'granted') await startForegroundWatch();
  }
  emit();
}

export type FinishedRun = { startedAt: number; endedAt: number; distanceM: number; durationS: number };

export async function stopRun(): Promise<FinishedRun | null> {
  watchSub?.remove();
  watchSub = null;
  if (Platform.OS !== 'web') {
    try {
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      }
    } catch (e) {
      console.warn('Konnte Standort-Updates nicht stoppen', e);
    }
  }
  await queue;

  const run = current ?? (await loadActiveRun());
  current = null;
  await clearActiveRun();
  emit();
  if (!run) return null;

  const endedAt = Date.now();
  return {
    startedAt: run.startedAt,
    endedAt,
    distanceM: run.distanceM,
    durationS: Math.round((endedAt - run.startedAt) / 1000),
  };
}
