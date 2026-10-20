// Importing the tracker registers the background location task, which must happen at startup.
import { restoreRun } from '../lib/tracker';

import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { GameState } from '../lib/game';
import { loadGame } from '../lib/storage';
import { GameProvider } from '../state/GameProvider';
import { colors } from '../theme';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

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
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          sceneStyle: { backgroundColor: colors.background },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Welt', tabBarIcon: () => <TabIcon emoji="🏝️" /> }} />
        <Tabs.Screen name="run" options={{ title: 'Laufen', tabBarIcon: () => <TabIcon emoji="🏃" /> }} />
        <Tabs.Screen name="history" options={{ title: 'Verlauf', tabBarIcon: () => <TabIcon emoji="📜" /> }} />
      </Tabs>
    </GameProvider>
  );
}
