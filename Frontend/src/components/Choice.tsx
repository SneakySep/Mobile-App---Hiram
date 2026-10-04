import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Wrap to multiple lines instead of scrolling horizontally. */
  wrap?: boolean;
  size?: 'sm' | 'md';
}

/** Chip-style selector used for status filters, sorts, and payment methods. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  wrap = true,
  size = 'sm',
}: SegmentedProps<T>): React.JSX.Element {
  const chips = options.map((option) => {
    const active = option.value === value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(option.value)}
        style={({ pressed }) => [
          styles.chip,
          size === 'md' ? styles.chipMd : null,
          active ? styles.chipActive : null,
          pressed ? styles.chipPressed : null,
        ]}
      >
        <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{option.label}</Text>
      </Pressable>
    );
  });

  if (wrap) {
    return <View style={styles.wrapRow}>{chips}</View>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
      {chips}
    </ScrollView>
  );
}

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** Simple labelled on/off pill (used for the "overdue only" filter). */
export function TogglePill({ label, value, onChange }: ToggleProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: value }}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.chip,
        styles.chipMd,
        value ? styles.chipDanger : null,
        pressed ? styles.chipPressed : null,
      ]}
    >
      <Text style={[styles.chipText, value ? styles.chipTextActive : null]}>
        {value ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scrollRow: { gap: spacing.sm, paddingRight: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipMd: { paddingVertical: 9 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  chipPressed: { opacity: 0.85 },
  chipText: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primaryText },
});
