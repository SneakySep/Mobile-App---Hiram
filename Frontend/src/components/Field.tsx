/**
 * Labelled text input with inline error text. `error` is expected to be either
 * the client-side validation message or the server's field message - the
 * screens merge the two with server winning.
 */

import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextStyle, TextInputProps, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/theme';

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  hint?: string | null;
  multiline?: boolean;
  /** Rendered to the right of the label, e.g. the currency for amount fields. */
  adornment?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function Field({
  label,
  value,
  onChangeText,
  error,
  hint,
  multiline = false,
  adornment,
  containerStyle,
  inputStyle,
  ...inputProps
}: FieldProps): React.JSX.Element {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {adornment ? <Text style={styles.adornment}>{adornment}</Text> : null}
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.textFaint}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          focused ? styles.focused : null,
          error ? styles.invalid : null,
          inputStyle,
        ]}
        {...inputProps}
      />

      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 },
  adornment: { fontSize: 12, color: colors.textFaint },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  focused: { borderColor: colors.primary },
  invalid: { borderColor: colors.danger },
  error: { fontSize: 12, color: colors.danger },
  hint: { fontSize: 12, color: colors.textFaint },
});
