/**
 * Screen shell: consistent background, safe-area padding, and built-in
 * loading / error / empty handling so no screen forgets a failure state.
 *
 * The online-only MVP treats a failed query as a full-screen retry prompt -
 * that is the honest behaviour when the backend is down.
 */

import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { Button } from './Button';
import { colors, radii, spacing } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  /** Pass the query's isLoading to show the spinner. */
  loading?: boolean;
  /** Pass the query's error to show the retry card. */
  error?: unknown;
  /** Called by the retry button. */
  onRetry?: () => void;
  /** Pull-to-refresh. Provide `refreshing` too. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Shown instead of children when `isEmpty`. */
  empty?: React.ReactNode;
  isEmpty?: boolean;
  /** Alternative to `empty` for the common centered title/message/action card. */
  emptyTitle?: string;
  emptyMessage?: string | null;
  emptyAction?: { label: string; onPress: () => void };
  /** Render children inside a ScrollView (default) or as a flex column. */
  scroll?: boolean;
  /** Set false when the screen renders its own SafeAreaView (e.g. modals). */
  safeArea?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

function describeError(error: unknown): { title: string; message: string } {
  if (error instanceof ApiError) {
    if (error.isNetwork) {
      return {
        title: 'Cannot reach the server',
        message: error.message,
      };
    }
    return { title: 'Something went wrong', message: error.message };
  }
  if (error instanceof Error) {
    return { title: 'Something went wrong', message: error.message };
  }
  return { title: 'Something went wrong', message: 'Unexpected error.' };
}

export function Screen({
  children,
  loading = false,
  error,
  onRetry,
  onRefresh,
  refreshing = false,
  empty,
  isEmpty = false,
  emptyTitle,
  emptyMessage,
  emptyAction,
  scroll = true,
  safeArea = true,
  header,
  footer,
}: ScreenProps): React.JSX.Element {
  let body: React.ReactNode;

  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingLabel}>Loading…</Text>
      </View>
    );
  } else if (error) {
    const { title, message } = describeError(error);
    body = (
      <View style={styles.center}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>{title}</Text>
          <Text style={styles.errorMessage}>{message}</Text>
          {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" /> : null}
        </View>
      </View>
    );
  } else if (isEmpty) {
    body = (
      <View style={styles.center}>
        {empty ?? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{emptyTitle ?? 'Nothing here yet.'}</Text>
            {emptyMessage ? <Text style={styles.errorMessage}>{emptyMessage}</Text> : null}
            {emptyAction ? (
              <Button label={emptyAction.label} onPress={emptyAction.onPress} variant="secondary" />
            ) : null}
          </View>
        )}
      </View>
    );
  } else {
    body = children;
  }

  const content = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
      }
    >
      {header}
      {body}
    </ScrollView>
  ) : (
    <View style={styles.flex}>
      {header}
      <View style={styles.flex}>{body}</View>
    </View>
  );

  const shell = (
    <View style={styles.shell}>
      {content}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  if (!safeArea) {
    return shell;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.flex}>
      {shell}
    </SafeAreaView>
  );
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string | null;
  right?: React.ReactNode;
  /** Pass `<BackButton />` here for detail screens. */
  left?: React.ReactNode;
}
export function ScreenHeader({ title, subtitle, right, left }: ScreenHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {left}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/** Compact text button used in headers ("+ New", "Cancel", …). */
export function ActionText({
  label,
  onPress,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'danger';
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
    >
      <Text style={[styles.actionText, tone === 'danger' ? styles.actionDanger : null]}>{label}</Text>
    </Pressable>
  );
}

/** Round back control for pushed screens; falls back to the tab navigator. */
export function BackButton({ onPress }: { onPress?: () => void }): React.JSX.Element {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home')))}
      style={({ pressed }) => [styles.back, pressed ? styles.backPressed : null]}
    >
      <Text style={styles.backGlyph}>←</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shell: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    minHeight: 260,
  },
  loadingLabel: { color: colors.textMuted, fontSize: 13 },
  errorCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: 420,
    width: '100%',
  },
  errorTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  errorMessage: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  header: {
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 14, color: colors.textMuted },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: { opacity: 0.7 },
  backGlyph: { fontSize: 17, lineHeight: 19, color: colors.text },
  emptyCard: { alignItems: 'center', gap: spacing.md, maxWidth: 360 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  action: { paddingHorizontal: spacing.sm, paddingVertical: 6 },
  actionPressed: { opacity: 0.6 },
  actionText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  actionDanger: { color: colors.danger },
});
