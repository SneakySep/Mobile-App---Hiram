import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { GestureResponderEvent, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { colors, radii, spacing } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void | Promise<void>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: colors.primary, borderColor: colors.primary },
    text: { color: colors.primaryText },
  },
  secondary: {
    container: { backgroundColor: colors.surface, borderColor: colors.border },
    text: { color: colors.text },
  },
  danger: {
    container: { backgroundColor: colors.danger, borderColor: colors.danger },
    text: { color: colors.primaryText },
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderColor: 'transparent' },
    text: { color: colors.primary },
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: ButtonProps): React.JSX.Element {
  const palette = variantStyles[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        palette.container,
        size === 'sm' ? styles.sm : styles.md,
        fullWidth ? styles.fullWidth : null,
        inactive ? styles.disabled : null,
        pressed && !inactive ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text.color} />
      ) : (
        <Text style={[styles.text, palette.text, size === 'sm' ? styles.textSm : null]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  md: { minHeight: 48 },
  sm: { minHeight: 38, paddingHorizontal: spacing.md },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  text: { fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },
  textSm: { fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPadded: { padding: spacing.lg },
  cardPressed: { opacity: 0.9 },
});

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  padded?: boolean;
}

export function Card({ children, style, onPress, padded = true }: CardProps): React.JSX.Element {
  const content = <View style={[styles.card, padded ? styles.cardPadded : null, style]}>{children}</View>;

  if (onPress === undefined) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <View style={[pressed ? styles.cardPressed : null]}>{content}</View>
      )}
    </Pressable>
  );
}

