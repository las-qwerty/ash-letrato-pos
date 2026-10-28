import type { CommissionBasis, EmployeeProfile, JobRole, Sale, User } from './types';
import { round2 } from './cart';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local YYYY-MM of a timestamp — reports follow the register's wall clock. */
export function monthOf(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function defaultBasis(jobRole?: JobRole): CommissionBasis {
  if (jobRole === 'cashier') return 'transactions';
  if (jobRole === 'graphic_artist') return 'handled_items';
  return 'none';
}

export interface StaffMonthRow {
  userId: string;
  name: string;
  jobRole?: JobRole;
  /** Completed sales rung up by this person as cashier. */
  transactions: number;
  transactionsTotal: number;
  /** Lines this person produced or served as the assigned handler. */
  handledItems: number;
  handledItemsTotal: number;
  basis: CommissionBasis;
  /** The amount commission and the target are measured on. */
  credit: number;
  commissionPct: number;
  commission: number;
  monthlyTarget?: number;
  /** Share of the target reached, in percent. Undefined without a target. */
  targetPct?: number;
  targetReached: boolean;
}

/**
 * Monthly sales and commission per staff member. Only completed sales count,
 * so voided and refunded sales drop out on their own. Rewards are not an input:
 * they never change sales totals or commission.
 */
export function staffMonthReport(input: {
  sales: Sale[];
  users: User[];
  profiles: EmployeeProfile[];
  month: string;
  branchId?: string;
}): StaffMonthRow[] {
  const scoped = input.sales.filter(
    (s) =>
      s.status === 'completed' &&
      monthOf(s.createdAt) === input.month &&
      (!input.branchId || input.branchId === 'all' || s.branchId === input.branchId),
  );
  return input.users
    .map((u) => {
      const p = input.profiles.find((x) => x.userId === u.id);
      const asCashier = scoped.filter((s) => s.cashierId === u.id);
      const asHandler = scoped.flatMap((s) => s.lines.filter((l) => l.handlerId === u.id));
      const transactionsTotal = round2(asCashier.reduce((a, s) => a + s.total, 0));
      const handledItemsTotal = round2(asHandler.reduce((a, l) => a + l.total, 0));
      const basis = p?.commissionBasis ?? defaultBasis(p?.jobRole);
      const credit =
        basis === 'transactions' ? transactionsTotal : basis === 'handled_items' ? handledItemsTotal : 0;
      const commissionPct = basis === 'none' ? 0 : (p?.commissionPct ?? 0);
      const target = p?.monthlyTarget;
      const hasTarget = basis !== 'none' && target != null && target > 0;
      return {
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`,
        jobRole: p?.jobRole,
        transactions: asCashier.length,
        transactionsTotal,
        handledItems: asHandler.length,
        handledItemsTotal,
        basis,
        credit,
        commissionPct,
        commission: round2((credit * commissionPct) / 100),
        monthlyTarget: target,
        targetPct: hasTarget && target ? Math.round((credit / target) * 100) : undefined,
        targetReached: hasTarget && target != null && credit >= target,
      };
    })
    .sort((a, b) => b.credit - a.credit || a.name.localeCompare(b.name));
}
