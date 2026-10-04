/**
 * One place for colors and spacing so screens stay consistent. Deliberately a
 * plain object - no native theme module, so this runs identically on web.
 */

export const colors = {
  background: '#F4F1EA',
  surface: '#FFFFFF',
  surfaceMuted: '#FAF8F3',
  border: '#E3DED2',
  text: '#22201C',
  textMuted: '#7A7469',
  textFaint: '#A9A395',
  primary: '#1F6F5C',
  primaryDark: '#155645',
  primaryText: '#FFFFFF',
  danger: '#B3261E',
  dangerSoft: '#FCEBE9',
  warning: '#B26A00',
  warningSoft: '#FDF1DF',
  success: '#1F6F5C',
  successSoft: '#E4F0EC',
  info: '#2C5F8A',
  infoSoft: '#E6EFF6',
  overlay: 'rgba(20, 18, 15, 0.42)',
};

export const statusColors: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: colors.warningSoft, fg: colors.warning, label: 'Pending' },
  partial: { bg: colors.infoSoft, fg: colors.info, label: 'Partial' },
  settled: { bg: colors.successSoft, fg: colors.success, label: 'Settled' },
  overdue: { bg: colors.dangerSoft, fg: colors.danger, label: 'Overdue' },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text },
  small: { fontSize: 13, fontWeight: '400' as const, color: colors.textMuted },
  label: { fontSize: 12, fontWeight: '600' as const, color: colors.textMuted },
  mono: { fontVariant: ['tabular-nums' as const] },
};
