import { api } from './client';
import type { Debtor, DebtorDeleteResult } from './types';

export interface DebtorInput {
  name: string;
  phone?: string | null;
  note?: string | null;
}

export const debtorsApi = {
  list: (q?: string) => api.get<Debtor[]>('/debtors', { q }),
  detail: (id: number) => api.get<Debtor>(`/debtors/${id}`),
  create: (input: DebtorInput) => api.post<Debtor>('/debtors', input),
  update: (id: number, input: Partial<DebtorInput>) => api.put<Debtor>(`/debtors/${id}`, input),
  remove: (id: number) => api.delete<DebtorDeleteResult>(`/debtors/${id}`),
};
