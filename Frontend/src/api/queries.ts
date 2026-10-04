/**
 * Query + mutation hooks. One file keeps the cache keys discoverable in one
 * place; screens never call the API modules directly.
 *
 * Invalidation rules follow the backend's derived fields:
 *  - payments change a debt's status/balance AND debtor aggregates AND stats
 *  - debt create/delete change debtor aggregates AND stats
 *  - debtor delete cascades to their debts
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, type ProfileUpdateInput } from './auth';
import { debtsApi, type DebtCreateInput, type DebtUpdateInput } from './debts';
import { debtorsApi, type DebtorInput } from './debtors';
import { paymentsApi, type PaymentCreateInput } from './payments';
import { statsApi } from './stats';
import type { DebtFilters } from './types';

export const keys = {
  stats: ['stats', 'summary'] as const,
  debtList: (filters: DebtFilters) => ['debts', filters] as const,
  debtDetail: (id: number) => ['debts', 'detail', id] as const,
  debtorList: (q: string) => ['debtors', q] as const,
  debtorDetail: (id: number) => ['debtors', 'detail', id] as const,
  debtorDebts: (id: number) => ['debts', { debtorId: id }] as const,
};

/** Refresh everything that can change when money moves. */
export function useMoneyInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
    void queryClient.invalidateQueries({ queryKey: ['debts'] });
    void queryClient.invalidateQueries({ queryKey: ['debtors'] });
  };
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: () => statsApi.summary() });
}

export function useDebts(filters: DebtFilters) {
  return useQuery({
    queryKey: keys.debtList(filters),
    queryFn: () => debtsApi.list(filters),
  });
}

export function useDebt(id: number | null) {
  return useQuery({
    queryKey: keys.debtDetail(id ?? -1),
    queryFn: () => debtsApi.detail(id as number),
    enabled: id !== null,
  });
}

export function useDebtors(q = '') {
  return useQuery({ queryKey: keys.debtorList(q), queryFn: () => debtorsApi.list(q || undefined) });
}

export function useDebtor(id: number | null) {
  return useQuery({
    queryKey: keys.debtorDetail(id ?? -1),
    queryFn: () => debtorsApi.detail(id as number),
    enabled: id !== null,
  });
}

export function useCreateDebt() {
  const invalidate = useMoneyInvalidation();
  return useMutation({
    mutationFn: (input: DebtCreateInput) => debtsApi.create(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateDebt(id: number) {
  const invalidate = useMoneyInvalidation();
  return useMutation({
    mutationFn: (input: DebtUpdateInput) => debtsApi.update(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteDebt() {
  const invalidate = useMoneyInvalidation();
  return useMutation({
    mutationFn: (id: number) => debtsApi.remove(id),
    onSuccess: () => invalidate(),
  });
}

export function useSettleDebt() {
  const invalidate = useMoneyInvalidation();
  return useMutation({
    mutationFn: ({ id, method }: { id: number; method?: string }) => debtsApi.settle(id, method),
    onSuccess: () => invalidate(),
  });
}

export function useReopenDebt() {
  const invalidate = useMoneyInvalidation();
  return useMutation({
    mutationFn: (id: number) => debtsApi.reopen(id),
    onSuccess: () => invalidate(),
  });
}

export function useRecordPayment(debtId: number) {
  const invalidate = useMoneyInvalidation();
  return useMutation({
    mutationFn: (input: PaymentCreateInput) => paymentsApi.record(debtId, input),
    onSuccess: () => invalidate(),
  });
}

export function useUndoPayment() {
  const invalidate = useMoneyInvalidation();
  return useMutation({
    mutationFn: (paymentId: number) => paymentsApi.undo(paymentId),
    onSuccess: () => invalidate(),
  });
}

export function useCreateDebtor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DebtorInput) => debtorsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['debtors'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateDebtor(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<DebtorInput>) => debtorsApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['debtors'] });
      void queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}

export function useDeleteDebtor() {
  const invalidate = useMoneyInvalidation();
  return useMutation({
    mutationFn: (id: number) => debtorsApi.remove(id),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) => authApi.updateProfile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
