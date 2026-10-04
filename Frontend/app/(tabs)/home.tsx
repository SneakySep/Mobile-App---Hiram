/**
 * Dashboard. Reads GET /stats/summary for the headline numbers (all derived
 * server-side) and a due-soonest slice of the ledger for the "due next" list.
 * The client never recomputes money totals.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card } from '@/components/Button';
import { CollectionChart, ProgressBar, StatTile } from '@/components/Stats';
import { Section } from '@/components/Section';
import { DebtRow } from '@/components/Rows';
import { Screen, ScreenHeader } from '@/components/Screen';
import { useDebts, useStats } from '@/api/queries';
import { useAuth } from '@/auth/AuthContext';
import { formatMoney, shortDayLabel, todayDateOnly } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { currency, user } = useAuth();
  const stats = useStats();
  const ledger = useDebts({ sort: 'due_soon' });

  const summary = stats.data;
  const ratio = (summary?.collectedPercent ?? 0) / 100;

  const open = (ledger.data ?? []).filter((debt) => debt.status !== 'settled');
  const today = todayDateOnly();
  const dueSoon = open.filter((debt) => debt.dueDate !== null && debt.dueDate >= today).slice(0, 3);

  const chartPoints = (summary?.recentCollections ?? []).map((point) => ({
    label: shortDayLabel(point.day),
    value: point.total,
  }));

  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] ?? '';

  return (
    <Screen
      loading={stats.isLoading && !stats.data}
      error={stats.error}
      onRetry={() => void stats.refetch()}
      refreshing={stats.isRefetching}
      onRefresh={() => void stats.refetch()}
      header={
        <ScreenHeader
          title={firstName ? `Hi, ${firstName}` : 'Overview'}
          subtitle={summary ? `You are owed ${formatMoney(summary.totalOutstanding, currency)}` : null}
        />
      }
    >
      <View style={styles.tileRow}>
        <StatTile
          label="Outstanding"
          value={formatMoney(summary?.totalOutstanding ?? '0.00', currency)}
          hint={summary ? `${summary.pendingCount + summary.partialCount} still open` : null}
          tone="danger"
        />
        <StatTile
          label="Collected"
          value={formatMoney(summary?.totalCollected ?? '0.00', currency)}
          hint={summary ? `${summary.settledCount} settled` : null}
          tone="success"
        />
      </View>

      <Card style={styles.gap}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Collected so far</Text>
          <Text style={styles.cardValue}>{Math.round(ratio * 100)}%</Text>
        </View>
        <ProgressBar ratio={ratio} />
        <Text style={styles.helper}>
          {formatMoney(summary?.totalCollected ?? '0.00', currency)} back of{' '}
          {formatMoney(summary?.totalLent ?? '0.00', currency)} lent.
        </Text>
      </Card>

      <View style={styles.tileRow}>
        <StatTile label="Total lent" value={formatMoney(summary?.totalLent ?? '0.00', currency)} />
        <StatTile
          label="Overdue"
          value={formatMoney(summary?.overdueAmount ?? '0.00', currency)}
          hint={summary && summary.overdueCount > 0 ? `${summary.overdueCount} past due` : 'Nothing overdue'}
          tone={summary && summary.overdueCount > 0 ? 'danger' : 'default'}
        />
      </View>

      {summary ? (
        <Card style={styles.gap}>
          <Text style={styles.cardTitle}>Debt status</Text>
          <View style={styles.statusRow}>
            <StatusCount label="Pending" value={summary.pendingCount} tone="warning" />
            <StatusCount label="Partial" value={summary.partialCount} tone="info" />
            <StatusCount label="Settled" value={summary.settledCount} tone="success" />
          </View>
        </Card>
      ) : null}

      <Section title="Collected · last 14 days">
        <Card>
          <CollectionChart points={chartPoints} />
        </Card>
      </Section>

      <Section
        title="Due next"
        action={
          <Text accessibilityRole="button" onPress={() => router.push('/(tabs)/debts')} style={styles.seeAll}>
            See all
          </Text>
        }
      >
        {dueSoon.length === 0 ? (
          <Card>
            <Text style={styles.helper}>
              {open.length === 0
                ? 'No open debts right now. Nice.'
                : 'Nothing is due soon — the rest are overdue or have no due date.'}
            </Text>
          </Card>
        ) : (
          dueSoon.map((debt) => <DebtRow key={debt.id} debt={debt} onPress={() => router.push(`/debt/${debt.id}`)} />)
        )}
      </Section>

      <View style={styles.actions}>
        <Button label="Record a debt" fullWidth onPress={() => router.push('/debt/new')} />
        <Button label="Add a person" variant="secondary" fullWidth onPress={() => router.push('/person/new')} />
      </View>
    </Screen>
  );
}

function StatusCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'warning' | 'info' | 'success';
}): React.JSX.Element {
  const color = tone === 'warning' ? colors.warning : tone === 'info' ? colors.info : colors.success;
  return (
    <View style={styles.statusCell}>
      <Text style={[styles.statusValue, { color }]}>{value}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tileRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  gap: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  cardValue: { fontSize: 13, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] },
  helper: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  statusRow: { flexDirection: 'row', gap: spacing.md },
  statusCell: { flex: 1, alignItems: 'center', gap: 2 },
  statusValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statusLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  seeAll: { fontSize: 13, fontWeight: '700', color: colors.primary },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});

