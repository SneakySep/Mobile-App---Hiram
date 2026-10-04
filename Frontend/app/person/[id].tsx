/**
 * Person detail: their aggregate balances (recomputed from their own debt list
 * so the numbers are always consistent with what is shown) plus every debt they
 * have. Lets you add a debt for them, edit their info, or delete them.
 */

import React from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card } from '@/components/Button';
import { DebtRow } from '@/components/Rows';
import { DetailRow, Section } from '@/components/Section';
import { ActionText, BackButton, Screen, ScreenHeader } from '@/components/Screen';
import { useDebtor, useDebts, useDeleteDebtor } from '@/api/queries';
import { useAuth } from '@/auth/AuthContext';
import { formatMoney, parseMoney } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function PersonDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const debtorId = Number.parseInt(String(id ?? ''), 10);
  const validId = Number.isFinite(debtorId);

  const { currency } = useAuth();
  const { data: debtor, isLoading, error, refetch, isRefetching } = useDebtor(validId ? debtorId : null);
  const { data: debts = [] } = useDebts({ debtorId, sort: 'recent' });
  const remove = useDeleteDebtor();

  const outstanding = debts
    .filter((debt) => debt.status !== 'settled')
    .reduce((sum, debt) => sum + parseMoney(debt.balance), 0);
  const totalLent = debts.reduce((sum, debt) => sum + parseMoney(debt.amount), 0);
  const overdueCount = debts.filter((debt) => debt.isOverdue).length;

  const confirmDelete = (): void => {
    if (!debtor) return;
    Alert.alert(
      'Delete this person?',
      `Their ${debts.length} debt${debts.length === 1 ? '' : 's'} will also be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void remove.mutateAsync(debtor.id).then(() => router.replace('/(tabs)/people')),
        },
      ],
    );
  };

  const openPhone = (): void => {
    if (debtor?.phone) void Linking.openURL(`tel:${debtor.phone}`);
  };

  return (
    <Screen
      loading={isLoading && !debtor}
      error={error}
      onRetry={() => void refetch()}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      header={
        <ScreenHeader
          title={debtor?.name ?? 'Person'}
          subtitle={debtor?.phone ?? null}
          left={<BackButton onPress={() => router.back()} />}
          right={<ActionText label="Edit" onPress={() => router.push(`/person/edit?id=${debtorId}`)} />}
        />
      }
      footer={
        <View style={styles.footerRow}>
          <Button label="Record a debt" onPress={() => router.push('/debt/new')} style={styles.footerBtn} />
          <Button label="Delete" variant="danger" onPress={confirmDelete} style={styles.deleteBtn} />
        </View>
      }
    >
      {debtor ? (
        <>
          <Card style={styles.summary}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Outstanding</Text>
              <Text style={[styles.summaryValue, outstanding > 0 ? styles.danger : null]}>
                {formatMoney(outstanding.toFixed(2), currency)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Total lent</Text>
              <Text style={styles.summaryValue}>{formatMoney(totalLent.toFixed(2), currency)}</Text>
            </View>
          </Card>

          <Section title="Details">
            <Card style={styles.gap}>
              <DetailRow label="Name" value={debtor.name} />
              <DetailRow
                label="Phone"
                value={debtor.phone}
                tone={debtor.phone ? 'default' : 'muted'}
              />
              {debtor.phone ? (
                <Text accessibilityRole="button" onPress={openPhone} style={styles.callLink}>
                  Call {debtor.phone}
                </Text>
              ) : null}
              <DetailRow label="Note" value={debtor.note} tone={debtor.note ? 'default' : 'muted'} />
              <DetailRow label="Debts" value={String(debts.length)} />
              {overdueCount > 0 ? <DetailRow label="Overdue" value={String(overdueCount)} tone="danger" /> : null}
            </Card>
          </Section>

          <Section title={`Debts (${debts.length})`}>
            {debts.length === 0 ? (
              <Card>
                <Text style={styles.muted}>No debts for this person yet.</Text>
              </Card>
            ) : (
              debts.map((debt) => (
                <DebtRow key={debt.id} debt={debt} onPress={() => router.push(`/debt/${debt.id}`)} />
              ))
            )}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  muted: { fontSize: 13, color: colors.textMuted },
  summary: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  summaryCell: { flex: 1, alignItems: 'center', gap: 2 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  summaryValue: { fontSize: 20, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  danger: { color: colors.danger },
  callLink: { fontSize: 14, fontWeight: '700', color: colors.primary },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  footerBtn: { flex: 1 },
  deleteBtn: { flexShrink: 0 },
});
