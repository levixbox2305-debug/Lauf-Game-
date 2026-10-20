import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { Route } from './game';
import { distanceM, type GeoPoint } from './geo';
import { clearActiveRun, loadActiveRun, saveActiveRun, type ActiveRun, type TrackingMode } from './storage';

export const LOCATION_TASK = 'laufwelt-location';

/** Readings worse than this are too imprecise to count. */
const MAX_ACCURACY_M = 35;
/** Ignore jitter while standing still. */
const MIN_STEP_M = 3;
/** Anything faster between two points is a GPS jump, not running. */
const MAX_STEP_SPEED_MS = 12;
/** Saved routes are thinned out to keep storage small. */
const MAX_ROUTE_POINTS = 400;

type Listener = (run: ActiveRun | null) => void;

const listeners = new Set<Listener>();
let current: ActiveRun | null = null;
let watchSub: Location.LocationSubscription | null = null;
// Location updates, pause and resume all modify the run; apply them one after another.
let queue: Promise<void> = Promise.resolve();

function emit() {
  for (const l of listeners) l(current);
}

function enqueue(change: (run: ActiveRun) => void): Promise<void> {
  queue = queue.then(async () => {
    // The background task may run after the app was killed, so fall back to storage.
    const run = current ?? (await loadActiveRun());
    if (!run) return;
    change(run);
    current = { ...run };
    await saveActiveRun(current);
    emit();
  });
  return queue;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

export function elapsedSeconds(run: ActiveRun, now = Date.now()): number {
  const end = run.pausedAt ?? now;
  return Math.max(0, (end - run.startedAt - run.pausedMs) / 1000);
}

export function ingest(locations: Location.LocationObject[]): Promise<void> {
  return enqueue((run) => {
    if (run.pausedAt) return;
    const segment = run.segments[run.segments.length - 1];
    for (const loc of locations) {
      const { accuracy, latitude, longitude } = loc.coords;
      if (accuracy != null && accuracy > MAX_ACCURACY_M) continue;

      const point: GeoPoint = { lat: latitude, lon: longitude, t: loc.timestamp };
      const last = segment[segment.length - 1];
      if (!last) {
        segment.push(point);
        continue;
      }
      if (point.t <= last.t) continue;

      const step = distanceM(last, point);
      const dt = (point.t - last.t) / 1000;
      if (step < MIN_STEP_M || step / dt > MAX_STEP_SPEED_MS) continue;

      run.distanceM += step;
      segment.push(point);
    }
  });
}

export const pauseRun = () =>
  enqueue((run) => {
    if (!run.pausedAt) run.pausedAt = Date.now();
  });

export const resumeRun = () =>
  enqueue((run) => {
    if (!run.pausedAt) return;
    run.pausedMs += Date.now() - run.pausedAt;
    run.pausedAt = null;
    run.segments.push([]);
  });

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
        notificationBody: 'Dein Lauf wird aufgezeichnet',
        notificationColor: '#C8392B',
      },
    });
    return true;
  } catch (e) {
    // Expo Go cannot run background location; we still track while the app is open.
    console.warn('Hintergrund-Tracking nicht verfügbar, nutze Vordergrund', e);
    return false;
  }
}

async function stopLocationUpdates() {
  watchSub?.remove();
  watchSub = null;
  if (Platform.OS === 'web') return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch (e) {
    console.warn('Konnte Standort-Updates nicht stoppen', e);
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

  current = { startedAt: Date.now(), distanceM: 0, segments: [[]], mode, pausedAt: null, pausedMs: 0 };
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

export type FinishedRun = {
  startedAt: number;
  endedAt: number;
  distanceM: number;
  durationS: number;
  route: Route;
};

export function toRoute(segments: GeoPoint[][]): Route {
  const total = segments.reduce((n, s) => n + s.length, 0);
  const step = Math.max(1, Math.ceil(total / MAX_ROUTE_POINTS));
  return segments
    .filter((s) => s.length > 1)
    .map((s) => {
      const thinned = s.filter((_, i) => i % step === 0 || i === s.length - 1);
      return thinned.map((p) => [Math.round(p.lat * 1e6) / 1e6, Math.round(p.lon * 1e6) / 1e6] as [number, number]);
    });
}

/** Stops tracking and returns the run; the caller decides whether to save it. */
export async function finishRun(): Promise<FinishedRun | null> {
  await stopLocationUpdates();
  await queue;

  const run = current ?? (await loadActiveRun());
  current = null;
  await clearActiveRun();
  emit();
  if (!run) return null;

  const endedAt = run.pausedAt ?? Date.now();
  return {
    startedAt: run.startedAt,
    endedAt,
    distanceM: run.distanceM,
    durationS: Math.round(elapsedSeconds(run, endedAt)),
    route: toRoute(run.segments),
  };
}
