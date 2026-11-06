// Importing the tracker registers the background location task, which must happen at startup.
import { restoreRun } from '../lib/tracker';

import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { InkTabBar } from '../components/InkTabBar';
import type { GameState } from '../lib/game';
import { clearSandbox, loadGame, loadProfile, saveProfile, type Profile } from '../lib/storage';
import { CloudProvider } from '../state/CloudProvider';
import { DevProvider } from '../state/DevProvider';
import { GameProvider } from '../state/GameProvider';
import { colors } from '../theme';

export default function RootLayout() {
  // `generation` remounts the game whenever a different save is loaded.
  const [loaded, setLoaded] = useState<{ profile: Profile; game: GameState; generation: number } | null>(null);
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    loadProfile()
      .then(async (profile) => setLoaded({ profile, game: await loadGame(profile), generation: 0 }))
      .catch((e) => console.warn('Spielstand konnte nicht geladen werden', e));
    restoreRun().catch((e) => console.warn('Lauf konnte nicht wiederhergestellt werden', e));
  }, []);

  const switchProfile = useCallback(async (profile: Profile, options?: { reset?: boolean }) => {
    if (options?.reset) await clearSandbox();
    await saveProfile(profile);
    setHour(null);
    const game = await loadGame(profile);
    setLoaded((prev) => ({ profile, game, generation: (prev?.generation ?? 0) + 1 }));
  }, []);

  const dev = useMemo(
    () => ({ profile: loaded?.profile ?? 'main', switchProfile: (p: Profile, o?: { reset?: boolean }) => void switchProfile(p, o), hour, setHour }),
    [loaded?.profile, switchProfile, hour],
  );

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <DevProvider value={dev}>
    <GameProvider key={loaded.generation} initial={loaded.game} profile={loaded.profile}>
      <CloudProvider disabled={loaded.profile === 'sandbox'}>
        <StatusBar style="dark" />
        <Tabs
          tabBar={(props) => <InkTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: colors.background },
          }}>
          <Tabs.Screen name="index" options={{ title: 'Welt' }} />
          <Tabs.Screen name="run" options={{ title: 'Laufen' }} />
          <Tabs.Screen name="history" options={{ title: 'Verlauf' }} />
        </Tabs>
      </CloudProvider>
    </GameProvider>
    </DevProvider>
  );
}
