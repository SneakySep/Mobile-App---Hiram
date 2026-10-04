/**
 * Debt detail. Loads GET /debts/:id (which carries the payment history), lets
 * the user record a payment against the remaining balance, settle or reopen the
 * debt, and delete it. Money math stays on the server; the client only formats.
 */

import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError } from '@/api/client';
import { Button, Card } from '@/components/Button';
import { Field } from '@/components/Field';
import { DebtStatusChip } from '@/components/StatusChip';
import { DetailRow, Section } from '@/components/Section';
import { PaymentRow } from '@/components/Rows';
import { BackButton, Screen, ScreenHeader } from '@/components/Screen';
import {
  useDebt,
  useDeleteDebt,
  useRecordPayment,
  useReopenDebt,
  useSettleDebt,
  useUndoPayment,
} from '@/api/queries';
import { useAuth } from '@/auth/AuthContext';
import { formatMoney, relativeDueLabel } from '@/lib/format';
import {
  amount as validateAmount,
  blankToNull,
  normalizeAmount,
} from '@/lib/validation';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/api/types';
import { Segmented } from '@/components/Choice';
import { colors, spacing } from '@/theme';

const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}));

export default function DebtDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const debtId = Number.parseInt(String(id ?? ''), 10);
  const validId = Number.isFinite(debtId);

  const { currency } = useAuth();
  const { data: debt, isLoading, error, refetch, isRefetching } = useDebt(validId ? debtId : null);
  const recordPayment = useRecordPayment(debtId);
  const undoPayment = useUndoPayment();
  const settle = useSettleDebt();
  const reopen = useReopenDebt();
  const remove = useDeleteDebt();

  const [payAmount, setPayAmount] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('cash');
  const [payNote, setPayNote] = React.useState('');
  const [payError, setPayError] = React.useState<string | null>(null);

  const payments = debt?.payments ?? [];
  const canPay = debt !== undefined && debt.status !== 'settled';

  const onAddPayment = async (): Promise<void> => {
    if (!debt) return;
    const issue = validateAmount(payAmount, { required: true, max: Number(debt.balance) });
    if (issue) {
      setPayError(issue);
      return;
    }
    setPayError(null);
    try {
      await recordPayment.mutateAsync({
        amount: normalizeAmount(payAmount),
        method,
        note: blankToNull(payNote),
      });
      setPayAmount('');
      setPayNote('');
    } catch (err) {
      if (err instanceof ApiError) setPayError(err.firstFieldMessage ?? err.message);
    }
  };

  const confirmDelete = (): void => {
    if (!debt) return;
    Alert.alert('Delete this debt?', `${debt.debtorName ?? 'This'} will lose this record.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          void remove.mutateAsync(debt.id).then(() => router.replace('/(tabs)/debts')),
      },
    ]);
  };

  return (
    <Screen
      scroll
      loading={isLoading && !debt}
      error={error}
      onRetry={() => void refetch()}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      header={
        <ScreenHeader
          title={debt?.debtorName ?? 'Debt'}
          subtitle={debt ? relativeDueLabel(debt.dueDate) : null}
          left={<BackButton onPress={() => router.back()} />}
          right={
            debt ? (
              <DebtStatusChip status={debt.status} isOverdue={debt.isOverdue} />
            ) : null
          }
        />
      }
      footer={
        debt ? (
          <View style={styles.footerRow}>
            {debt.status === 'settled' ? (
              <Button
                label="Reopen debt"
                variant="secondary"
                onPress={() => void reopen.mutateAsync(debt.id)}
                loading={reopen.isPending}
                style={styles.footerBtn}
              />
            ) : (
              <Button
                label={`Settle in full · ${formatMoney(debt.balance, currency)}`}
                onPress={() => void settle.mutateAsync({ id: debt.id, method: 'cash' })}
                loading={settle.isPending}
                style={styles.footerBtn}
              />
            )}
            <Button label="Delete" variant="danger" onPress={confirmDelete} style={styles.deleteBtn} />
          </View>
        ) : null
      }
    >
      {debt ? (
        <>
          <Card style={styles.amountCard}>
            <Text style={styles.balanceLabel}>{debt.status === 'settled' ? 'Settled' : 'Remaining'}</Text>
            <Text style={styles.balanceValue}>{formatMoney(debt.balance, currency)}</Text>
            <Text style={styles.balanceMeta}>
              {formatMoney(debt.paidAmount, currency)} paid of {formatMoney(debt.amount, currency)}
            </Text>
          </Card>

          {canPay ? (
            <Section title="Record a payment">
              <Card style={styles.gap}>
                <Field
                  label="Amount"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  error={payError}
                  keyboardType="decimal-pad"
                  adornment={currency}
                  placeholder={debt.balance}
                />
                <Segmented options={METHOD_OPTIONS} value={method} onChange={setMethod} />
                <Field label="Note" value={payNote} onChangeText={setPayNote} placeholder="Optional" />
                <Button
                  label={recordPayment.isPending ? 'Saving…' : 'Add payment'}
                  onPress={() => void onAddPayment()}
                  loading={recordPayment.isPending}
                  disabled={recordPayment.isPending}
                  fullWidth
                />
              </Card>
            </Section>
          ) : null}

          <Section title="Details">
            <Card style={styles.gap}>
              <DetailRow label="Person" value={debt.debtorName} />
              <DetailRow label="Phone" value={debt.debtorPhone} tone={debt.debtorPhone ? 'default' : 'muted'} />
              <DetailRow label="Amount" value={debt.amount} isMoney />
              <DetailRow label="Paid" value={debt.paidAmount} isMoney />
              <DetailRow label="Due date" value={debt.dueDate} tone={debt.dueDate ? 'default' : 'muted'} />
              <DetailRow label="Note" value={debt.note} tone={debt.note ? 'default' : 'muted'} />
            </Card>
          </Section>

          <Section title={`Payments (${payments.length})`}>
            {payments.length === 0 ? (
              <Card>
                <Text style={styles.muted}>No payments yet.</Text>
              </Card>
            ) : (
              payments.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  onUndo={() => void undoPayment.mutateAsync(payment.id)}
                  undoing={undoPayment.isPending && undoPayment.variables === payment.id}
                />
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
  amountCard: { alignItems: 'center', gap: 4, paddingVertical: spacing.xl },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  balanceValue: { fontSize: 34, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  balanceMeta: { fontSize: 13, color: colors.textMuted },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  footerBtn: { flex: 1 },
  deleteBtn: { flexShrink: 0 },
});

