/**
 * The debts ledger. Filtering happens server-side (status, sort, search,
 * overdue) so the list never disagrees with the stats; the client only owns the
 * filter controls and debounces the search box.
 */

import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ActionText, Screen, ScreenHeader } from '@/components/Screen';
import { Card } from '@/components/Button';
import { Segmented, TogglePill } from '@/components/Choice';
import { DebtRow } from '@/components/Rows';
import { useDebts } from '@/api/queries';
import { useAuth } from '@/auth/AuthContext';
import { formatMoney, parseMoney } from '@/lib/format';
import { DEBT_SORTS } from '@/api/types';
import type { DebtFilters, DebtSort } from '@/api/types';
import { colors, radii, spacing } from '@/theme';

type StatusOption = 'all' | 'pending' | 'partial' | 'settled' | 'overdue';

const STATUS_OPTIONS: { value: StatusOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'settled', label: 'Settled' },
];

const SHORT_SORT: Record<DebtSort, string> = {
  recent: 'Recent',
  oldest: 'Oldest',
  amount_high: 'High',
  amount_low: 'Low',
  due_soon: 'Due',
};

export default function DebtsScreen(): React.JSX.Element {
  const router = useRouter();
  const { currency } = useAuth();

  const [searchText, setSearchText] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [status, setStatus] = React.useState<StatusOption>('all');
  const [sort, setSort] = React.useState<DebtSort>('recent');
  const [overdueOnly, setOverdueOnly] = React.useState(false);

  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(searchText.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchText]);

  const filters: DebtFilters = {
    status: status === 'overdue' ? 'all' : status,
    sort,
    ...(debounced !== '' ? { q: debounced } : {}),
    ...(overdueOnly || status === 'overdue' ? { overdue: true } : {}),
  };

  const { data, isLoading, error, refetch, isRefetching } = useDebts(filters);
  const debts = data ?? [];
  const outstanding = debts
    .filter((debt) => debt.status !== 'settled')
    .reduce((sum, debt) => sum + parseMoney(debt.balance), 0);

  const hasFilters = status !== 'all' || overdueOnly || debounced !== '';

  const clearFilters = () => {
    setStatus('all');
    setOverdueOnly(false);
    setSearchText('');
    setDebounced('');
  };

  return (
    <Screen
      loading={isLoading && debts.length === 0}
      error={error}
      onRetry={() => void refetch()}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      isEmpty={debts.length === 0}
      emptyTitle={hasFilters ? 'Nothing matches' : 'No debts yet'}
      emptyMessage={
        hasFilters
          ? 'Try a different status, or clear the search.'
          : 'Record the first loan you made and it will show up here.'
      }
      emptyAction={
        hasFilters
          ? { label: 'Clear filters', onPress: clearFilters }
          : { label: 'Record a debt', onPress: () => router.push('/debt/new') }
      }
      header={
        <ScreenHeader
          title="Debts"
          subtitle={
            debts.length === 0
              ? null
              : `${debts.length} shown · ${formatMoney(outstanding.toFixed(2), currency)} open`
          }
          right={<ActionText label="+ New" onPress={() => router.push('/debt/new')} />}
        />
      }
    >
      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search name or note"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />

      <Segmented options={STATUS_OPTIONS} value={status} onChange={setStatus} />

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort</Text>
        <View style={styles.sortChips}>
          <Segmented
            options={DEBT_SORTS.map((s) => ({ value: s.value, label: SHORT_SORT[s.value] }))}
            value={sort}
            onChange={setSort}
          />
        </View>
      </View>

      <TogglePill label="Only overdue" value={overdueOnly} onChange={setOverdueOnly} />

      <View style={styles.list}>
        {debts.map((debt) => (
          <DebtRow key={debt.id} debt={debt} onPress={() => router.push(`/debt/${debt.id}`)} />
        ))}
      </View>
      {debts.length === 0 ? null : (
        <Card>
          <Text style={styles.helper}>That is everything for these filters.</Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  sortLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sortChips: { flex: 1, minWidth: 220 },
  list: { gap: spacing.sm },
  helper: { fontSize: 12.5, color: colors.textFaint, textAlign: 'center' },
});
