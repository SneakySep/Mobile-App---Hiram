/**
 * Money and date helpers.
 *
 * The API returns amounts as fixed-2 strings. We only ever convert them to
 * numbers for display grouping or for client-side pre-validation; the string is
 * what gets sent back so the server stays the source of truth.
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function parseMoney(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(num) ? num : 0;
}

/** "2500.5" -> "2500.50" - the shape the validator expects. */
export function toMoneyString(value: string | number): string {
  return parseMoney(value).toFixed(2);
}

export function formatMoney(value: string | number | null | undefined, currency = 'PHP'): string {
  const num = parseMoney(value);
  const sign = num < 0 ? '-' : '';
  const [int, dec] = Math.abs(num).toFixed(2).split('.');
  const grouped = (int ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${currency} ${grouped}.${dec ?? '00'}`;
}

export function formatCompactMoney(value: string | number | null | undefined, currency = 'PHP'): string {
  const num = Math.abs(parseMoney(value));
  if (num >= 1_000_000) return `${currency} ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 10_000) return `${currency} ${(num / 1000).toFixed(1)}k`;
  return formatMoney(value, currency);
}

/**
 * Server timestamps come as "YYYY-MM-DD HH:MM:SS" in local time. Hermes does
 * not reliably parse the space form, so swap in a "T" (which keeps it local).
 */
export function parseServerDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  // "YYYY-MM-DD" - parse by hand so no timezone shifting happens.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = parseServerDate(value);
  if (date === null) return value;
  const hours = date.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${displayHours}:${minutes} ${suffix}`;
}

export function todayDateOnly(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Send a date-only "YYYY-MM-DD" as noon local, to dodge timezone drift. */
export function dateOnlyToIso(value: string): string {
  return `${value}T12:00:00`;
}

/** For a "due soon" nudge: how many days from today (-1 = yesterday). */
export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function relativeDueLabel(value: string | null | undefined): string {
  const days = daysUntil(value);
  if (days === null) return 'No due date';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return '1 day overdue';
  return `${Math.abs(days)} days overdue`;
}

/** MM/DD or "Sep 30" style label for chart axes. */
export function shortDayLabel(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value.slice(0, 5);
  return `${Number(match[2])}/${Number(match[3])}`;
}
