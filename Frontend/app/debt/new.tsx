/**
 * Record a debt. Either attach it to an existing person (tap a suggestion) or
 * type a fresh name - the backend creates the debtor and links it when needed.
 * Amount is validated on the client but the server owns the real rules.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ApiError } from '@/api/client';
import { Button, Card } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Section } from '@/components/Section';
import { useCreateDebt, useDebtors } from '@/api/queries';
import { useAuth } from '@/auth/AuthContext';
import {
  amount as validateAmount,
  blankToNull,
  dateOnly as validateDate,
  mergeErrors,
  normalizeAmount,
  required,
  type FieldErrors,
} from '@/lib/validation';
import { todayDateOnly } from '@/lib/format';
import { colors, radii, spacing } from '@/theme';

export default function NewDebtScreen(): React.JSX.Element {
  const router = useRouter();
  const { currency } = useAuth();
  const createDebt = useCreateDebt();
  const { data: people = [] } = useDebtors();

  const [debtorId, setDebtorId] = React.useState<number | null>(null);
  const [debtorName, setDebtorName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [note, setNote] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const pick = (id: number, name: string): void => {
    setDebtorId(id);
    setDebtorName(name);
    setErrors((prev) => ({ ...prev, debtorId: '', debtorName: '' }));
  };

  const onSubmit = async (): Promise<void> => {
    const local: FieldErrors = {};
    const nameIssue = debtorId === null ? required(debtorName, 'Debtor', 2) : null;
    if (nameIssue) local.debtorName = nameIssue;
    const amountIssue = validateAmount(amount, { required: true, max: 1000000 });
    if (amountIssue) local.amount = amountIssue;
    const dateIssue = validateDate(dueDate);
    if (dateIssue) local.dueDate = dateIssue;

    setErrors(local);
    if (Object.keys(local).length > 0) return;

    try {
      const created = await createDebt.mutateAsync({
        ...(debtorId !== null ? { debtorId } : { debtorName: debtorName.trim() }),
        amount: normalizeAmount(amount),
        dueDate: blankToNull(dueDate),
        note: blankToNull(note),
      });
      router.replace(`/debt/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) setErrors(mergeErrors(local, err.fields));
    }
  };

  return (
    <Screen
      header={<ScreenHeader title="Record a debt" subtitle="Who owes you, and how much." />}
      footer={
        <Button
          label={createDebt.isPending ? 'Saving…' : 'Save debt'}
          onPress={() => void onSubmit()}
          loading={createDebt.isPending}
          disabled={createDebt.isPending}
          fullWidth
        />
      }
    >
      {debtorId === null ? (
        <Section title="Choose a person">
          <View style={styles.suggestions}>
            {people.length === 0 ? (
              <Text style={styles.emptyHint}>No saved people yet — type a new name below.</Text>
            ) : (
              people.map((debtor) => (
                <Pressable
                  key={debtor.id}
                  accessibilityRole="button"
                  onPress={() => pick(debtor.id, debtor.name)}
                  style={({ pressed }) => [styles.suggestion, pressed ? styles.suggestionPressed : null]}
                >
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {debtor.name}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </Section>
      ) : (
        <Card style={styles.chosenRow}>
          <Text style={styles.chosenLabel}>For</Text>
          <Text style={styles.chosenName} numberOfLines={1}>
            {debtorName}
          </Text>
          <Text accessibilityRole="button" onPress={() => setDebtorId(null)} style={styles.change}>
            Change
          </Text>
        </Card>
      )}

      <Card style={styles.gap}>
        <Field
          label="Debtor name"
          value={debtorName}
          onChangeText={(text) => {
            setDebtorName(text);
            if (debtorId !== null) setDebtorId(null);
          }}
          error={errors.debtorName || errors.debtorId || null}
          hint={debtorId === null ? 'New person — or pick an existing one below.' : null}
          autoCapitalize="words"
          editable={debtorId === null}
          placeholder="e.g. Juan Dela Cruz"
        />

        <Field
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          error={errors.amount || null}
          keyboardType="decimal-pad"
          adornment={currency}
          placeholder="0.00"
        />

        <Field
          label="Due date"
          value={dueDate}
          onChangeText={setDueDate}
          error={errors.dueDate || null}
          placeholder={todayDateOnly()}
          hint="Optional · YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />

        <Field
          label="Note"
          value={note}
          onChangeText={setNote}
          error={errors.note || null}
          multiline
          placeholder="Optional, e.g. sari-sari store tab"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  suggestion: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  suggestionPressed: { opacity: 0.7, borderColor: colors.primary },
  suggestionText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  emptyHint: { fontSize: 13, color: colors.textMuted },
  chosenRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chosenLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  chosenName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  change: { fontSize: 14, fontWeight: '700', color: colors.primary },
});

