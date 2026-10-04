/**
 * Landing route. The root layout's gate hides routes the session may not see,
 * so this only decides where to send the user. It exists as a real route so
 * "/" always resolves, and the tabs group intentionally has no index.tsx
 * (that would conflict with this file for the "/" path).
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme';

export default function Index(): React.JSX.Element {
  const { status } = useAuth();

  if (status === 'bootstrapping') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={status === 'signedIn' ? '/(tabs)/home' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
