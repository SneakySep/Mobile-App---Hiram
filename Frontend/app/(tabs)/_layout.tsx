/**
 * Main navigation. The header is hidden everywhere: each screen paints its own
 * header via <ScreenHeader />, which keeps the look identical on web and native
 * and lets detail screens own their action row. Icons are plain glyphs so the
 * app does not need @expo/vector-icons in the web bundle.
 */

import React from 'react';
import { StyleSheet, Text, type ColorValue } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme';

export default function TabsLayout(): React.JSX.Element {
  const { status } = useAuth();

  if (status !== 'signedIn') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: (p) => <Glyph char="▤" {...p} /> }} />
      <Tabs.Screen name="debts" options={{ title: 'Debts', tabBarIcon: (p) => <Glyph char="₽" {...p} /> }} />
      <Tabs.Screen name="people" options={{ title: 'People', tabBarIcon: (p) => <Glyph char="☺" {...p} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: (p) => <Glyph char="◉" {...p} /> }} />
    </Tabs>
  );
}

function Glyph({
  char,
  color,
  focused,
}: {
  char: string;
  color: ColorValue;
  size: number;
  focused: boolean;
}): React.JSX.Element {
  return <Text style={[styles.glyph, { color, opacity: focused ? 1 : 0.7 }]}>{char}</Text>;
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 62,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  glyph: { fontSize: 18, lineHeight: 20 },
});
