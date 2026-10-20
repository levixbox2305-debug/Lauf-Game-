// Importing the tracker registers the background location task, which must happen at startup.
import { restoreRun } from '../lib/tracker';

import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { GameState } from '../lib/game';
import { loadGame } from '../lib/storage';
import { GameProvider } from '../state/GameProvider';
import { colors, fonts } from '../theme';

function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontFamily: fonts.serif, fontSize: 20, color }}>{glyph}</Text>;
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
          headerShown: false,
          tabBarActiveTintColor: colors.background,
          tabBarInactiveTintColor: colors.inkSoft,
          tabBarStyle: { backgroundColor: colors.ink, borderTopWidth: 0 },
          tabBarLabelStyle: { fontFamily: fonts.serif },
          sceneStyle: { backgroundColor: colors.background },
        }}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Welt', tabBarIcon: ({ focused }) => <TabIcon glyph="島" color={focused ? colors.sakura : colors.inkSoft} /> }}
        />
        <Tabs.Screen
          name="run"
          options={{ title: 'Laufen', tabBarIcon: ({ focused }) => <TabIcon glyph="走" color={focused ? colors.sakura : colors.inkSoft} /> }}
        />
        <Tabs.Screen
          name="history"
          options={{ title: 'Verlauf', tabBarIcon: ({ focused }) => <TabIcon glyph="記" color={focused ? colors.sakura : colors.inkSoft} /> }}
        />
      </Tabs>
    </GameProvider>
  );
}
