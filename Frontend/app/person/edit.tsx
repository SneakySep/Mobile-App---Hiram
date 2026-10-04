/**
 * Edit a person's details (PUT /debtors/:id). Reached from the person screen
 * with the debtor id in the query. Fields mirror the loaded debtor until the
 * user edits them (draft overrides), so no state-sync effect is needed.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError } from '@/api/client';
import { Button, Card } from '@/components/Button';
import { Field } from '@/components/Field';
import { BackButton, Screen, ScreenHeader } from '@/components/Screen';
import { useDebtor, useUpdateDebtor } from '@/api/queries';
import { maxLength, mergeErrors, phone as validatePhone, required, type FieldErrors } from '@/lib/validation';
import { spacing } from '@/theme';

export default function EditPersonScreen(): React.JSX.Element {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const debtorId = Number.parseInt(String(id ?? ''), 10);
  const validId = Number.isFinite(debtorId);

  const { data: debtor, isLoading } = useDebtor(validId ? debtorId : null);
  const updateDebtor = useUpdateDebtor(debtorId);

  const [nameDraft, setNameDraft] = React.useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = React.useState<string | null>(null);
  const [noteDraft, setNoteDraft] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const name = nameDraft ?? debtor?.name ?? '';
  const phoneValue = phoneDraft ?? debtor?.phone ?? '';
  const note = noteDraft ?? debtor?.note ?? '';

  const dirty = nameDraft !== null || phoneDraft !== null || noteDraft !== null;

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
      await updateDebtor.mutateAsync({
        name: name.trim(),
        phone: phoneValue.trim() === '' ? null : phoneValue.trim(),
        note: note.trim() === '' ? null : note.trim(),
      });
      router.back();
    } catch (err) {
      if (err instanceof ApiError) setErrors(mergeErrors(local, err.fields));
    }
  };

  return (
    <Screen
      loading={isLoading && !debtor}
      header={<ScreenHeader title="Edit person" left={<BackButton onPress={() => router.back()} />} />
      }
      footer={
        <Button
          label={updateDebtor.isPending ? 'Saving…' : 'Save changes'}
          onPress={() => void onSubmit()}
          loading={updateDebtor.isPending}
          disabled={!dirty || updateDebtor.isPending}
          fullWidth
        />
      }
    >
      <Card style={styles.gap}>
        <Field
          label="Name"
          value={name}
          onChangeText={setNameDraft}
          error={errors.name ?? null}
          autoCapitalize="words"
        />
        <Field
          label="Phone"
          value={phoneValue}
          onChangeText={setPhoneDraft}
          error={errors.phone ?? null}
          keyboardType="phone-pad"
          placeholder="Optional"
        />
        <Field
          label="Note"
          value={note}
          onChangeText={setNoteDraft}
          error={errors.note ?? null}
          multiline
          placeholder="Optional"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
});
