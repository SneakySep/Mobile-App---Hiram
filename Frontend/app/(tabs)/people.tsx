/**
 * People. GET /debtors returns each debtor with aggregate balances already
 * computed by the backend, so the list can show who owes what without N+1
 * queries from the client.
 */

import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ActionText, Screen, ScreenHeader } from '@/components/Screen';
import { DebtorRow } from '@/components/Rows';
import { useDebtors } from '@/api/queries';
import { colors, radii, spacing } from '@/theme';

export default function PeopleScreen(): React.JSX.Element {
  const router = useRouter();

  const [searchText, setSearchText] = React.useState('');
  const [debounced, setDebounced] = React.useState('');

  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(searchText.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchText]);

  const { data, isLoading, error, refetch, isRefetching } = useDebtors(debounced);
  const debtors = data ?? [];

  return (
    <Screen
      loading={isLoading && debtors.length === 0}
      error={error}
      onRetry={() => void refetch()}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      isEmpty={debtors.length === 0}
      emptyTitle={debounced !== '' ? 'Nobody found' : 'No people yet'}
      emptyMessage={
        debounced !== ''
          ? `No debtor matches "${debounced}".`
          : 'Add the people you lend to so you can attach debts to them.'
      }
      emptyAction={
        debounced !== ''
          ? { label: 'Clear search', onPress: () => setSearchText('') }
          : { label: 'Add a person', onPress: () => router.push('/person/new') }
      }
      header={
        <ScreenHeader
          title="People"
          subtitle={debtors.length === 0 ? null : `${debtors.length} ${debtors.length === 1 ? 'person' : 'people'}`}
          right={<ActionText label="+ New" onPress={() => router.push('/person/new')} />}
        />
      }
    >
      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search by name or phone"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />

      <View style={styles.list}>
        {debtors.map((debtor) => (
          <DebtorRow key={debtor.id} debtor={debtor} onPress={() => router.push(`/person/${debtor.id}`)} />
        ))}
      </View>
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
  list: { gap: spacing.sm },
});
