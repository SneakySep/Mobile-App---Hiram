import { api } from './client';
import type { Debt, DebtCreateResult, DebtDetail, DebtFilters } from './types';

export interface DebtCreateInput {
  /** Provide either debtorId (existing person) or debtorName (creates one). */
  debtorId?: number;
  debtorName?: string;
  /** Decimal string with exactly two places, e.g. "2500.50". Must be > 0. */
  amount: string;
  /** "YYYY-MM-DD" or omit. */
  dueDate?: string | null;
  note?: string | null;
}

export interface DebtUpdateInput {
  debtorId?: number;
  amount?: string;
  dueDate?: string | null;
  note?: string | null;
}

export const debtsApi = {
  list: (filters: DebtFilters = {}) =>
    api.get<Debt[]>('/debts', {
      status: filters.status,
      q: filters.q,
      debtorId: filters.debtorId,
      overdue: filters.overdue ? '1' : undefined,
      sort: filters.sort,
    }),
  detail: (id: number) => api.get<DebtDetail>(`/debts/${id}`),
  create: (input: DebtCreateInput) => api.post<DebtCreateResult>('/debts', input),
  update: (id: number, input: DebtUpdateInput) => api.put<Debt>(`/debts/${id}`, input),
  remove: (id: number) => api.delete<{ id: number; deleted: boolean }>(`/debts/${id}`),
  settle: (id: number, method?: string) => api.post<DebtDetail>(`/debts/${id}/settle`, { method }),
  reopen: (id: number) => api.post<DebtDetail>(`/debts/${id}/reopen`),
};
