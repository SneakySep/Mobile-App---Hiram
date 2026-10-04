import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme';
import { parseMoney } from '@/lib/format';

/** A big headline number on the dashboard. */
export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string | null;
  tone?: 'default' | 'danger' | 'success';
}): React.JSX.Element {
  const color = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.text;

  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
    </View>
  );
}

/** Horizontal ratio bar, e.g. how much has been collected. */
export function ProgressBar({ ratio }: { ratio: number }): React.JSX.Element {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

/**
 * Plain-View bar chart of collections per day - no chart dependency, so the
 * web bundle stays small and rendering is predictable.
 */
export function CollectionChart({
  points,
}: {
  points: { label: string; value: string | number }[];
}): React.JSX.Element {
  const max = points.reduce<number>((acc, point) => Math.max(acc, parseMoney(point.value)), 0);

  if (points.length === 0 || max <= 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>No payments recorded in the last 14 days.</Text>
      </View>
    );
  }

  return (
    <View style={styles.chart}>
      {points.map((point, index) => {
        const value = parseMoney(point.value);
        const height = value <= 0 ? 3 : Math.max(5, Math.round((value / max) * 96));

        return (
          <View key={`${point.label}-${index}`} style={styles.chartColumn}>
            <View style={styles.chartBarWrap}>
              <View style={[styles.chartBar, { height }]} />
            </View>
            <Text style={styles.chartLabel} numberOfLines={1}>
              {point.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
    minWidth: 150,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  tileValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tileHint: { fontSize: 11, color: colors.textFaint },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.primary },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 128,
    paddingTop: spacing.sm,
  },
  chartColumn: { flex: 1, alignItems: 'center', gap: 4, height: '100%' },
  chartBarWrap: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '86%', maxWidth: 22, borderRadius: 4, backgroundColor: colors.primary },
  chartLabel: { fontSize: 9, color: colors.textFaint },
  emptyChart: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  emptyChartText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
