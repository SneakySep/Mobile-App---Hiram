import { api } from './client';
import type { Payment, PaymentCreateResult, PaymentDeleteResult, PaymentMethod } from './types';

export interface PaymentCreateInput {
  /** Decimal string, two places. Must not exceed the debt balance. */
  amount: string;
  method?: PaymentMethod;
  /** ISO-8601-ish "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:mm:ss". Omit for now. */
  paidAt?: string;
  note?: string | null;
}

export const paymentsApi = {
  listForDebt: (debtId: number) => api.get<Payment[]>(`/debts/${debtId}/payments`),
  record: (debtId: number, input: PaymentCreateInput) =>
    api.post<PaymentCreateResult>(`/debts/${debtId}/payments`, input),
  undo: (paymentId: number) => api.delete<PaymentDeleteResult>(`/payments/${paymentId}`),
};
