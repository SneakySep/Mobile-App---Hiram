/**
 * Types mirroring the exact JSON the backend returns.
 *
 * Two conventions worth remembering:
 *  - Money always arrives as a string ("2500.50") so no float rounding happens
 *    on the way here. Use `parseMoney` before doing arithmetic.
 *  - Timestamps arrive as "YYYY-MM-DD HH:MM:SS" (no timezone), dates as
 *    "YYYY-MM-DD".
 */

export type DebtStatus = 'pending' | 'partial' | 'settled';

export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'bank' | 'other';

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'gcash', 'maya', 'bank', 'other'];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  maya: 'Maya',
  bank: 'Bank',
  other: 'Other',
};

export type DebtSort = 'recent' | 'oldest' | 'amount_high' | 'amount_low' | 'due_soon';

export const DEBT_SORTS: { value: DebtSort; label: string }[] = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_high', label: 'Highest amount' },
  { value: 'amount_low', label: 'Lowest amount' },
  { value: 'due_soon', label: 'Due soonest' },
];

export interface User {
  id: number;
  name: string;
  email: string;
  currency: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  user: User;
}

export interface Debtor {
  id: number;
  name: string;
  phone: string | null;
  note: string | null;
  /** Only populated by GET /debtors; the detail endpoint returns null. */
  debtCount: number | null;
  totalAmount: string | null;
  outstandingAmount: string | null;
  overdueCount: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Debt {
  id: number;
  debtorId: number;
  debtorName: string | null;
  debtorPhone: string | null;
  amount: string;
  paidAmount: string;
  balance: string;
  dueDate: string | null;
  isOverdue: boolean;
  note: string | null;
  status: DebtStatus;
  settledAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /debts/:id adds the payment history. */
export interface DebtDetail extends Debt {
  payments: Payment[];
}

/** POST /debts also reports whether the debtor was created inline. */
export interface DebtCreateResult extends Debt {
  debtorCreated: boolean;
}

export interface Payment {
  id: number;
  debtId: number;
  amount: string;
  method: PaymentMethod;
  paidAt: string;
  note: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentCreateResult {
  payment: Payment;
  debt: Debt;
}

export interface PaymentDeleteResult {
  id: number;
  deleted: boolean;
  debt: Debt;
}

export interface DebtorDeleteResult {
  id: number;
  deleted: boolean;
  debtsRemoved: number;
}

export interface CollectionDay {
  day: string;
  total: string;
}

export interface StatsSummary {
  totalLent: string;
  totalCollected: string;
  totalOutstanding: string;
  debtCount: number;
  debtorCount: number;
  pendingCount: number;
  partialCount: number;
  settledCount: number;
  overdueCount: number;
  overdueAmount: string;
  collectedPercent: number;
  asOf: string;
  recentCollections: CollectionDay[];
}

export interface DebtFilters {
  status?: DebtStatus | 'all';
  q?: string;
  debtorId?: number;
  overdue?: boolean;
  sort?: DebtSort;
}
