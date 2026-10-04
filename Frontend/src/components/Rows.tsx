import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Button';
import { DebtStatusChip, StatusChip } from './StatusChip';
import type { Debt, Debtor, Payment } from '@/api/types';
import { PAYMENT_METHOD_LABELS } from '@/api/types';
import { formatDateOnly, formatMoney, parseMoney, relativeDueLabel } from '@/lib/format';
import { useAuth } from '@/auth/AuthContext';
import { colors, radii, spacing } from '@/theme';

function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '?').slice(0, 2).toUpperCase();
  return ((parts[0] ?? '')[0] + (parts[parts.length - 1] ?? '')[0]).toUpperCase();
}

export function DebtRow({ debt, onPress }: { debt: Debt; onPress: () => void }): React.JSX.Element {
  const { currency } = useAuth();
  const paid = parseMoney(debt.paidAmount);
  const total = parseMoney(debt.amount);
  const ratio = total > 0 ? paid / total : 0;

  return (
    <Card onPress={onPress} padded={false}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(debt.debtorName)}</Text>
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.title} numberOfLines={1}>
              {debt.debtorName ?? 'Unknown'}
            </Text>
            <Text style={styles.amount}>{formatMoney(debt.balance, currency)}</Text>
          </View>

          <View style={styles.rowMiddle}>
            <Text style={styles.meta} numberOfLines={1}>
              {debt.note ? debt.note : `of ${formatMoney(debt.amount, currency)}`}
            </Text>
            <DebtStatusChip status={debt.status} isOverdue={debt.isOverdue} />
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, ratio * 100)}%` }]} />
          </View>

          <Text style={[styles.due, debt.isOverdue ? styles.dueOverdue : null]}>
            {relativeDueLabel(debt.dueDate)}
            {paid > 0 ? `  ·  paid ${formatMoney(debt.paidAmount, currency)}` : ''}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export function DebtorRow({ debtor, onPress }: { debtor: Debtor; onPress: () => void }): React.JSX.Element {
  const { currency } = useAuth();
  const outstanding = parseMoney(debtor.outstandingAmount);
  const overdue = debtor.overdueCount ?? 0;

  return (
    <Card onPress={onPress} padded={false}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(debtor.name)}</Text>
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.title} numberOfLines={1}>
              {debtor.name}
            </Text>
            <Text style={[styles.amount, outstanding <= 0 ? styles.settledAmount : null]}>
              {formatMoney(debtor.outstandingAmount ?? '0.00', currency)}
            </Text>
          </View>
          <View style={styles.rowMiddle}>
            <Text style={styles.meta} numberOfLines={1}>
              {debtor.debtCount === 1 ? '1 debt' : `${debtor.debtCount ?? 0} debts`}
              {debtor.phone ? `  ·  ${debtor.phone}` : ''}
            </Text>
            {overdue > 0 ? (
              <StatusChip label={`${overdue} overdue`} tone="overdue" />
            ) : outstanding <= 0 ? (
              <StatusChip label="Clear" tone="settled" />
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

export function PaymentRow({
  payment,
  onUndo,
  undoing = false,
}: {
  payment: Payment;
  onUndo?: () => void;
  undoing?: boolean;
}): React.JSX.Element {
  const { currency } = useAuth();

  return (
    <View style={styles.paymentRow}>
      <View style={styles.paymentLeft}>
        <Text style={styles.paymentAmount}>{formatMoney(payment.amount, currency)}</Text>
        <Text style={styles.paymentMeta}>
          {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
          {'  ·  '}
          {formatDateOnly(payment.paidAt) ?? payment.paidAt}
        </Text>
        {payment.note ? <Text style={styles.paymentNote}>{payment.note}</Text> : null}
      </View>
      {onUndo ? (
        <Text
          accessibilityRole="button"
          onPress={undoing ? undefined : onUndo}
          style={[styles.undo, undoing ? styles.undoDisabled : null]}
        >
          {undoing ? 'Undoing…' : 'Undo'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  rowBody: { flex: 1, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowMiddle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  amount: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  settledAmount: { color: colors.success },
  meta: { fontSize: 12.5, color: colors.textMuted, flexShrink: 1 },
  due: { fontSize: 11.5, color: colors.textFaint },
  dueOverdue: { color: colors.danger, fontWeight: '600' },
  progressTrack: { height: 4, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentLeft: { flex: 1, gap: 2 },
  paymentAmount: { fontSize: 15, fontWeight: '700', color: colors.success, fontVariant: ['tabular-nums'] },
  paymentMeta: { fontSize: 12, color: colors.textMuted },
  paymentNote: { fontSize: 12, color: colors.textFaint, fontStyle: 'italic' },
  undo: { fontSize: 13, fontWeight: '600', color: colors.danger, paddingVertical: 2 },
  undoDisabled: { opacity: 0.5 },
});
