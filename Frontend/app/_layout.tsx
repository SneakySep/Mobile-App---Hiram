/**
 * Root layout: providers + the auth gate.
 *
 * The gate is deliberately not a redirect-on-mount trick. While the session is
 * unknown we render a splash; once it resolves we register only the routes the
 * session is allowed to see, so an unauthenticated user can never land on a
 * data screen even by typing the URL.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, queryClient, useAuth } from '@/auth/AuthContext';
import { colors, spacing } from '@/theme';

export default function RootLayout(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Gate />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Gate(): React.JSX.Element {
  const { status } = useAuth();

  if (status === 'bootstrapping') {
    return (
      <View style={styles.splash}>
        <Text style={styles.brand}>Hiram</Text>
        <Text style={styles.tagline}>Debt tracker</Text>
        <ActivityIndicator style={styles.spinner} color={colors.primary} />
      </View>
    );
  }

  const signedIn = status === 'signedIn';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="debt" />
        <Stack.Screen name="person" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  brand: { fontSize: 30, fontWeight: '800', letterSpacing: 1.2, color: colors.primary },
  tagline: { fontSize: 13, color: colors.textMuted, letterSpacing: 0.6 },
  spinner: { marginTop: spacing.xl },
});
