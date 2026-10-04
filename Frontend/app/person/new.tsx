/**
 * Add a person. Minimal surface: name (required), phone and note (optional).
 * The backend enforces uniqueness loosely, so duplicates are allowed by design.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError } from '@/api/client';
import { Button, Card } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen, ScreenHeader } from '@/components/Screen';
import { useCreateDebtor } from '@/api/queries';
import { maxLength, mergeErrors, phone as validatePhone, required, type FieldErrors } from '@/lib/validation';
import { spacing } from '@/theme';

export default function NewPersonScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ forDebt?: string }>();
  const createDebtor = useCreateDebtor();

  const [name, setName] = React.useState('');
  const [phoneValue, setPhone] = React.useState('');
  const [note, setNote] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const onSubmit = async (): Promise<void> => {
    const local: FieldErrors = {};
    const nameIssue = required(name, 'Name', 2) ?? maxLength(name, 80, 'Name');
    if (nameIssue) local.name = nameIssue;
    const phoneIssue = validatePhone(phoneValue);
    if (phoneIssue) local.phone = phoneIssue;
    const noteIssue = maxLength(note, 500, 'Note');
    if (noteIssue) local.note = noteIssue;

    setErrors(local);
    if (Object.keys(local).length > 0) return;

    try {
      const created = await createDebtor.mutateAsync({
        name: name.trim(),
        phone: phoneValue.trim() === '' ? null : phoneValue.trim(),
        note: note.trim() === '' ? null : note.trim(),
      });
      if (params.forDebt === '1') {
        router.back();
      } else {
        router.replace(`/person/${created.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) setErrors(mergeErrors(local, err.fields));
    }
  };

  return (
    <Screen
      header={<ScreenHeader title="Add a person" subtitle="Someone you lend money to." />}
      footer={
        <Button
          label={createDebtor.isPending ? 'Saving…' : 'Save person'}
          onPress={() => void onSubmit()}
          loading={createDebtor.isPending}
          disabled={createDebtor.isPending}
          fullWidth
        />
      }
    >
      <Card style={styles.gap}>
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          error={errors.name ?? null}
          autoCapitalize="words"
          placeholder="Full name"
        />
        <Field
          label="Phone"
          value={phoneValue}
          onChangeText={setPhone}
          error={errors.phone ?? null}
          keyboardType="phone-pad"
          placeholder="Optional"
          hint={params.forDebt === '1' ? 'They will be attached to your new debt.' : null}
        />
        <Field label="Note" value={note} onChangeText={setNote} error={errors.note ?? null} multiline placeholder="Optional" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
});
