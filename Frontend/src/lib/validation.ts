/**
 * Client-side field validators. These exist purely to give instant feedback -
 * the API still owns the real rules, and its 422 field errors are surfaced
 * through `ApiError.fields` and merged over these.
 */

export type FieldErrors = Record<string, string>;

export function required(value: string, label: string, min = 1): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return `${label} is required.`;
  if (trimmed.length < min) return `${label} must be at least ${min} characters.`;
  return null;
}

export const email = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed === '') return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address.';
  return null;
};

export const password = (value: string, min = 8): string | null => {
  if (value === '') return 'Password is required.';
  if (value.length < min) return `Password must be at least ${min} characters.`;
  return null;
};

/** Mirrors the backend `amount` rule: positive, at most two decimals. */
export function amount(value: string, options: { required?: boolean; max?: number } = {}): string | null {
  const trimmed = value.trim();
  const isRequired = options.required !== false;

  if (trimmed === '') {
    return isRequired ? 'Amount is required.' : null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return 'Enter a valid amount with up to 2 decimals.';
  }

  const num = Number.parseFloat(trimmed);
  if (!Number.isFinite(num) || num <= 0) {
    return 'Amount must be greater than zero.';
  }
  if (options.max !== undefined && num > options.max) {
    return `Amount cannot be more than ${options.max.toFixed(2)}.`;
  }
  return null;
}

/** Mirrors the backend `date` rule: strict YYYY-MM-DD, optional. */
export const dateOnly = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'Use the format YYYY-MM-DD.';
  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'That date does not exist.';
  return null;
};

export const phone = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (trimmed.length > 30) return 'Phone number is too long.';
  return null;
};

export const maxLength = (value: string, max: number, label: string): string | null =>
  value.trim().length > max ? `${label} must be ${max} characters or fewer.` : null;

/** Send only the fields the API knows about, blank strings as null. */
export function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Normalise user input to the "2500.50" the API expects. */
export function normalizeAmount(value: string): string {
  const num = Number.parseFloat(value.trim());
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

/**
 * Merge our own errors with server-provided ones. Server wins, since it has the
 * authoritative rules (e.g. "amount cannot be less than what was paid").
 */
export function mergeErrors(local: FieldErrors, server?: FieldErrors): FieldErrors {
  return { ...local, ...(server ?? {}) };
}
