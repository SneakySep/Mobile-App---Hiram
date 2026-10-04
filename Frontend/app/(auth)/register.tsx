/**
 * Create the account. Backend rules: name 2-80, valid email, password 8-100,
 * currency 1-8 chars (defaults to PHP).
 */

import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import {
  email as validateEmail,
  maxLength,
  mergeErrors,
  password as validatePassword,
  required,
  type FieldErrors,
} from '@/lib/validation';
import { colors, spacing } from '@/theme';

const SUGGESTED_CURRENCIES = ['PHP', 'USD', 'EUR', 'JPY'];

export default function RegisterScreen(): React.JSX.Element {
  const { signUp } = useAuth();
  const [name, setName] = React.useState('');
  const [emailValue, setEmailValue] = React.useState('');
  const [passwordValue, setPasswordValue] = React.useState('');
  const [currency, setCurrency] = React.useState('PHP');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (): Promise<void> => {
    const nameIssue = required(name, 'Name', 2) ?? maxLength(name, 80, 'Name');
    const emailIssue = required(emailValue, 'Email') ?? validateEmail(emailValue);
    const passwordIssue = validatePassword(passwordValue);
    const trimmedCurrency = currency.trim();
    const currencyIssue =
      trimmedCurrency === '' || trimmedCurrency.length <= 8 ? null : 'Currency must be 8 characters or fewer.';

    const local: FieldErrors = {
      ...(nameIssue !== null ? { name: nameIssue } : {}),
      ...(emailIssue !== null ? { email: emailIssue } : {}),
      ...(passwordIssue !== null ? { password: passwordIssue } : {}),
      ...(currencyIssue !== null ? { currency: currencyIssue } : {}),
    };
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        email: emailValue.trim(),
        password: passwordValue,
        currency: trimmedCurrency === '' ? undefined : trimmedCurrency,
      });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      setErrors(mergeErrors({}, apiError?.fields ?? {}));
      setFormError(apiError?.message ?? 'Could not create the account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Everything you record stays on your own server.</Text>
          </View>

          <View style={styles.form}>
            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              error={errors.name}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="Juan Dela Cruz"
            />
            <Field
              label="Email"
              value={emailValue}
              onChangeText={setEmailValue}
              error={errors.email}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              value={passwordValue}
              onChangeText={setPasswordValue}
              error={errors.password}
              hint="At least 8 characters."
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              placeholder="••••••••"
            />
            <Field
              label="Currency"
              value={currency}
              onChangeText={setCurrency}
              error={errors.currency}
              hint="Used for every amount, e.g. PHP."
              autoCapitalize="characters"
              maxLength={8}
              placeholder="PHP"
            />

            <View style={styles.quickRow}>
              {SUGGESTED_CURRENCIES.map((code) => (
                <Text
                  key={code}
                  accessibilityRole="button"
                  onPress={() => setCurrency(code)}
                  style={[styles.quickChip, code === currency.toUpperCase() ? styles.quickChipActive : null]}
                >
                  {code}
                </Text>
              ))}
            </View>

            {formError !== null ? <Text style={styles.formError}>{formError}</Text> : null}

            <Button label="Create account" fullWidth loading={submitting} onPress={() => void onSubmit()} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.link}>
              Sign in
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  headerBlock: { gap: spacing.xs, marginBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13.5, color: colors.textMuted },
  form: { gap: spacing.md },
  formError: { fontSize: 13, color: colors.danger },
  quickRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  quickChip: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  quickChipActive: {
    color: colors.primaryText,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  footerText: { fontSize: 14, color: colors.textMuted },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
});

