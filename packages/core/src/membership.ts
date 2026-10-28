import type { Customer } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const DAY_MS = 86_400_000;
const EXPIRING_WITHIN_DAYS = 30;

/** Local calendar date as YYYY-MM-DD. */
export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const utc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
};
const isoOf = (t: number) => new Date(t).toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  return isoOf(utc(date) + days * DAY_MS);
}

/** Same calendar day `years` later; Feb 29 becomes Feb 28 in a non-leap year. */
export function addYears(date: string, years: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const year = y + years;
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${year}-${pad(m)}-${pad(Math.min(d, lastDay))}`;
}

/** Memberships run one year; the last valid day is the day before the anniversary. */
export const membershipExpiry = (start: string) => addDays(addYears(start, 1), -1);

export function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && isoOf(utc(s)) === s;
}

export type MembershipStatus =
  | { state: 'none' }
  | { state: 'valid' | 'expiring' | 'expired'; start?: string; expires: string; daysLeft: number };

type MembershipFields = Pick<Customer, 'membershipCardNo' | 'membershipStart' | 'membershipExpires'>;

export function membershipStatus(c: MembershipFields, today = todayISO()): MembershipStatus {
  if (!c.membershipCardNo || !c.membershipExpires) return { state: 'none' };
  const daysLeft = Math.round((utc(c.membershipExpires) - utc(today)) / DAY_MS);
  const state = daysLeft < 0 ? 'expired' : daysLeft <= EXPIRING_WITHIN_DAYS ? 'expiring' : 'valid';
  return { state, start: c.membershipStart, expires: c.membershipExpires, daysLeft };
}

/** Renewing a term that is still running starts the day after it ends; otherwise it starts today. */
export function renewalStart(c: MembershipFields, today = todayISO()): string {
  const status = membershipStatus(c, today);
  return status.state === 'valid' || status.state === 'expiring' ? addDays(status.expires, 1) : today;
}

/** Customers whose birthday falls in `month` (1–12), ordered by day of month. */
export function birthdaysInMonth<T extends Pick<Customer, 'birthdate'>>(
  customers: T[],
  month: number,
): (T & { day: number })[] {
  return customers
    .flatMap((c) =>
      c.birthdate && isValidISODate(c.birthdate) && Number(c.birthdate.slice(5, 7)) === month
        ? [{ ...c, day: Number(c.birthdate.slice(8, 10)) }]
        : [],
    )
    .sort((a, b) => a.day - b.day);
}
