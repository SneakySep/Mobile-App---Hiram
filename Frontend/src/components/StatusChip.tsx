import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/theme';

interface ChipProps {
  label: string;
  tone?: 'pending' | 'partial' | 'settled' | 'overdue' | 'neutral';
  style?: StyleProp<ViewStyle>;
}

const tones: Record<NonNullable<ChipProps['tone']>, { bg: string; fg: string }> = {
  pending: { bg: colors.warningSoft, fg: colors.warning },
  partial: { bg: colors.infoSoft, fg: colors.info },
  settled: { bg: colors.successSoft, fg: colors.success },
  overdue: { bg: colors.dangerSoft, fg: colors.danger },
  neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
};

export function StatusChip({ label, tone = 'neutral', style }: ChipProps): React.JSX.Element {
  const palette = tones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

/**
 * Debt status pill. An unpaid-but-past-due debt shows "Overdue" instead of
 * "Pending"/"Partial", because that is the fact the user actually needs.
 */
export function DebtStatusChip({
  status,
  isOverdue,
}: {
  status: string;
  isOverdue: boolean;
}): React.JSX.Element {
  if (isOverdue && status !== 'settled') {
    return <StatusChip label="Overdue" tone="overdue" />;
  }
  if (status === 'settled') {
    return <StatusChip label="Settled" tone="settled" />;
  }
  if (status === 'partial') {
    return <StatusChip label="Partial" tone="partial" />;
  }
  return <StatusChip label="Pending" tone="pending" />;
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
