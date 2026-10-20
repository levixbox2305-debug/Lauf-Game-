// Importing the tracker registers the background location task, which must happen at startup.
import { restoreRun } from '../lib/tracker';

import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { InkTabBar } from '../components/InkTabBar';
import type { GameState } from '../lib/game';
import { loadGame } from '../lib/storage';
import { GameProvider } from '../state/GameProvider';
import { colors } from '../theme';

export default function RootLayout() {
  const [initial, setInitial] = useState<GameState | null>(null);

  useEffect(() => {
    loadGame().then(setInitial);
    restoreRun().catch((e) => console.warn('Lauf konnte nicht wiederhergestellt werden', e));
  }, []);

  if (!initial) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <GameProvider initial={initial}>
      <StatusBar style="dark" />
      <Tabs
        tabBar={(props) => <InkTabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
        <Tabs.Screen name="index" options={{ title: 'Welt' }} />
        <Tabs.Screen name="run" options={{ title: 'Laufen' }} />
        <Tabs.Screen name="history" options={{ title: 'Verlauf' }} />
      </Tabs>
    </GameProvider>
  );
}
