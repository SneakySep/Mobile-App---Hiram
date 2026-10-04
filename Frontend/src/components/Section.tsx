import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { colors, spacing } from '@/theme';
import { formatMoney } from '@/lib/format';

interface SectionProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A titled group of content that breaks long screens into scannable parts. */
export function Section({ title, action, children, style }: SectionProps): React.JSX.Element {
  return (
    <View style={[styles.wrapper, style]}>
      {title || action ? (
        <View style={styles.headerRow}>
          {title ? <Text style={styles.title}>{title}</Text> : <View style={styles.flex} />}
          {action}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

/** One label/value row inside a Card. */
export function DetailRow({
  label,
  value,
  isMoney = false,
  tone = 'default',
}: {
  label: string;
  value: string | null | undefined;
  isMoney?: boolean;
  tone?: 'default' | 'danger' | 'muted';
}): React.JSX.Element {
  const display = isMoney ? formatMoney(value ?? '0') : value && value !== '' ? value : '—';

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          isMoney ? styles.rowMoney : null,
          tone === 'danger' ? styles.danger : null,
          tone === 'muted' ? styles.muted : null,
        ]}
      >
        {display}
      </Text>
    </View>
  );
}

/** A labelled currency amount, so formatting stays in one place. */
export function Money({
  value,
  currency,
  style,
}: {
  value: string | number | null | undefined;
  currency?: string;
  style?: StyleProp<TextStyle>;
}): React.JSX.Element {
  return <Text style={[styles.money, style]}>{formatMoney(value, currency)}</Text>;
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textMuted,
    flex: 1,
  },
  flex: { flex: 1 },
  body: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: '600', textAlign: 'right' },
  rowMoney: { fontVariant: ['tabular-nums'] },
  danger: { color: colors.danger },
  muted: { color: colors.textMuted, fontWeight: '400' },
  money: { fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
});
