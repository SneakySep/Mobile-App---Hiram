/**
 * Sign in. Also the landing point after a forced sign-out, so it surfaces the
 * reason (expired token vs. unreachable server) above the form.
 */

import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { email as validateEmail, required, mergeErrors, type FieldErrors } from '@/lib/validation';
import { colors, radii, spacing } from '@/theme';

export default function LoginScreen(): React.JSX.Element {
  const { signIn, signedOutReason, consumeSignedOutReason } = useAuth();
  const [emailValue, setEmailValue] = React.useState('');
  const [passwordValue, setPasswordValue] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (): Promise<void> => {
    consumeSignedOutReason();

    const emailIssue = required(emailValue, 'Email') ?? validateEmail(emailValue);
    const passwordIssue = required(passwordValue, 'Password');

    const local: FieldErrors = {
      ...(emailIssue !== null ? { email: emailIssue } : {}),
      ...(passwordIssue !== null ? { password: passwordIssue } : {}),
    };

    setErrors(local);
    setFormError(null);

    if (local.email !== undefined || local.password !== undefined) {
      return;
    }

    setSubmitting(true);
    try {
      await signIn({ email: emailValue.trim(), password: passwordValue });
      // The root layout's gate swaps the stack; nothing else to do here.
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      setErrors(mergeErrors({}, apiError?.fields ?? {}));
      setFormError(apiError?.message ?? 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>Hiram</Text>
            <Text style={styles.tagline}>Track what you lent. See what is still owed.</Text>
          </View>

          {signedOutReason !== null ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{signedOutReason}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
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
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              placeholder="••••••••"
              onSubmitEditing={() => void onSubmit()}
            />

            {formError !== null ? <Text style={styles.formError}>{formError}</Text> : null}

            <Button label="Sign in" fullWidth loading={submitting} onPress={() => void onSubmit()} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <Link href="/(auth)/register" style={styles.link} onPress={consumeSignedOutReason}>
              Create an account
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
  brandBlock: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  brand: { fontSize: 32, fontWeight: '800', letterSpacing: 1.2, color: colors.primary },
  tagline: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  notice: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  noticeText: { fontSize: 13, color: colors.warning, lineHeight: 19 },
  form: { gap: spacing.md },
  formError: { fontSize: 13, color: colors.danger },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  footerText: { fontSize: 14, color: colors.textMuted },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
