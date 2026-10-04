/**
 * Profile & settings. Edits name/currency through PUT /auth/profile, then
 * refreshes the session user so the currency everywhere updates. Everything
 * shown under "at a glance" comes from the same stats query as the dashboard.
 */

import React from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from '@/components/Button';
import { Field } from '@/components/Field';
import { Section } from '@/components/Section';
import { Screen, ScreenHeader } from '@/components/Screen';
import { StatTile } from '@/components/Stats';
import { ApiError, getApiBaseUrl } from '@/api/client';
import { useStats, useUpdateProfile } from '@/api/queries';
import { useAuth } from '@/auth/AuthContext';
import { maxLength, mergeErrors, required, type FieldErrors } from '@/lib/validation';
import { formatMoney } from '@/lib/format';
import { colors, radii, spacing } from '@/theme';

const SUGGESTED_CURRENCIES = ['PHP', 'USD', 'EUR', 'JPY'];

export default function ProfileScreen(): React.JSX.Element {
  const { user, currency, signOut, refreshUser } = useAuth();
  const stats = useStats();
  const updateProfile = useUpdateProfile();

  // Draft overrides: null means "not edited", so the fields always mirror the
  // server user until the visitor touches them (no state-sync effect needed).
  const [nameDraft, setNameDraft] = React.useState<string | null>(null);
  const [currencyDraft, setCurrencyDraft] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const name = nameDraft ?? user?.name ?? '';
  const currencyValue = currencyDraft ?? user?.currency ?? 'PHP';
  const setName = (value: string): void => setNameDraft(value);
  const setCurrencyValue = (value: string): void => setCurrencyDraft(value);

  const dirty = nameDraft !== null || currencyDraft !== null;

  const onSave = async (): Promise<void> => {
    const nameIssue = required(name, 'Name', 2) ?? maxLength(name, 80, 'Name');
    const trimmedCurrency = currencyValue.trim();
    const currencyIssue =
      trimmedCurrency === ''
        ? 'Currency is required.'
        : trimmedCurrency.length <= 8
          ? null
          : 'Currency must be 8 characters or fewer.';

    const local: FieldErrors = {
      ...(nameIssue !== null ? { name: nameIssue } : {}),
      ...(currencyIssue !== null ? { currency: currencyIssue } : {}),
    };
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    try {
      await updateProfile.mutateAsync({ name: name.trim(), currency: trimmedCurrency });
      await refreshUser();
      setNameDraft(null);
      setCurrencyDraft(null);
      setErrors({});
    } catch (err) {
      if (err instanceof ApiError) setErrors(mergeErrors(local, err.fields));
    }
  };

  const onSignOut = (): void => {
    Alert.alert('Sign out', 'You will need to log in again to see your debts.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const summary = stats.data;
  const apiBase = getApiBaseUrl();

  return (
    <Screen header={<ScreenHeader title="Profile" subtitle={user?.email ?? null} />}>
      <Card style={styles.gap}>
        <Field
          label="Your name"
          value={name}
          onChangeText={setName}
          error={errors.name ?? null}
          autoCapitalize="words"
          placeholder="Your name"
        />
        <Field
          label="Currency"
          value={currencyValue}
          onChangeText={setCurrencyValue}
          error={errors.currency ?? null}
          hint="3-4 letters works best, e.g. PHP."
          autoCapitalize="characters"
          placeholder="PHP"
        />
        <View style={styles.chipsRow}>
          {SUGGESTED_CURRENCIES.map((code) => (
            <Text
              key={code}
              accessibilityRole="button"
              onPress={() => setCurrencyValue(code)}
              style={[styles.chip, currencyValue.trim() === code ? styles.chipActive : null]}
            >
              {code}
            </Text>
          ))}
        </View>
        <Button
          label={updateProfile.isPending ? 'Saving…' : 'Save changes'}
          onPress={() => void onSave()}
          disabled={!dirty || updateProfile.isPending}
          loading={updateProfile.isPending}
          fullWidth
        />
      </Card>

      <Section title="At a glance">
        <View style={styles.tileRow}>
          <StatTile label="Total lent" value={formatMoney(summary?.totalLent ?? '0.00', currency)} />
          <StatTile
            label="Outstanding"
            value={formatMoney(summary?.totalOutstanding ?? '0.00', currency)}
            tone="danger"
          />
        </View>
        <View style={styles.tileRow}>
          <StatTile label="People" value={String(summary?.debtorCount ?? 0)} />
          <StatTile label="Debts" value={String(summary?.debtCount ?? 0)} />
        </View>
      </Section>

      <Card style={styles.gap}>
        <Text style={styles.muted}>
          You are signed in on this device. Signing out clears the saved session.
        </Text>
        <Button label="Sign out" variant="danger" onPress={onSignOut} fullWidth />
      </Card>

      <View style={styles.apiRow}>
        <Text style={styles.apiLabel}>API</Text>
        <Text accessibilityRole="link" onPress={() => void Linking.openURL(`${apiBase}/health`)} style={styles.apiLink}>
          {apiBase}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  tileRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  chipsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipActive: { borderColor: colors.primary, color: colors.primary, backgroundColor: colors.successSoft },
  muted: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  apiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },
  apiLabel: { fontSize: 11, fontWeight: '700', color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.6 },
  apiLink: { fontSize: 12, color: colors.textFaint },
});
