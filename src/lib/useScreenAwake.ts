import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const TAG = 'laufwelt-run';

type WakeLockSentinel = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> } };

/**
 * Keeps the screen on while `active`. In the browser this is what keeps GPS running,
 * because Safari stops location updates once the screen locks.
 */
export function useScreenAwake(active: boolean) {
  useEffect(() => {
    if (!active) return;

    if (Platform.OS !== 'web') {
      activateKeepAwakeAsync(TAG).catch(() => {});
      return () => {
        deactivateKeepAwake(TAG).catch(() => {});
      };
    }

    // The browser drops the wake lock whenever the page is hidden, so take it again on return.
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await (navigator as WakeLockNavigator).wakeLock?.request('screen')) ?? null;
      } catch {
        lock = null;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}
