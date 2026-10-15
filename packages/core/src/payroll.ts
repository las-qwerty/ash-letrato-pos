import type {
  AttendanceRecord,
  EmployeeProfile,
  Payslip,
} from './types';

const MS_HOUR = 3_600_000;
const STANDARD_HOURS_PER_DAY = 8;

/** Inclusive day count between two YYYY-MM-DD dates. */
export function daysInPeriod(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Hours worked for one attendance record (clockIn → clockOut). */
export function workedHours(r: AttendanceRecord): number {
  if (!r.clockIn || !r.clockOut) return 0;
  return Math.max(0, (new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / MS_HOUR);
}

/** Effective hourly rate for overtime math, by salary type. */
export function hourlyEquivalent(p: EmployeeProfile): number {
  switch (p.salaryType) {
    case 'hourly':
      return p.rate;
    case 'daily':
      return p.rate / STANDARD_HOURS_PER_DAY;
    case 'monthly':
      return p.rate / 30 / STANDARD_HOURS_PER_DAY;
  }
}

/**
 * Compute a payslip for an employee over [periodStart, periodEnd] using their
 * attendance records in that window.
 *
 * - daily   → rate × days worked
 * - hourly  → rate × hours worked
 * - monthly → rate × (period days / 30)  (semi-monthly runs ≈ half the rate)
 * Overtime = hours beyond 8/day × hourly equivalent × overtimeRate (default 1.25).
 * Approved paid leave adds rate-equivalent days at the standard daily rate.
 */
export function computePayslip(
  profile: EmployeeProfile,
  attendance: AttendanceRecord[],
  periodStart: string,
  periodEnd: string,
): Payslip {
  const inPeriod = attendance.filter(
    (r) => r.userId === profile.userId && r.date >= periodStart && r.date <= periodEnd,
  );

  const worked = inPeriod.filter((r) => r.clockIn);
  const daysWorked = worked.length;
  const hoursWorked = worked.reduce((a, r) => a + workedHours(r), 0);
  const overtimeHrs = worked.reduce(
    (a, r) => a + Math.max(0, workedHours(r) - STANDARD_HOURS_PER_DAY),
    0,
  );
  const paidLeaveDays = inPeriod.filter(
    (r) => r.leaveApprovedBy && (r.leaveType === 'vacation' || r.leaveType === 'sick' || r.leaveType === 'paid'),
  ).length;

  let gross: number;
  switch (profile.salaryType) {
    case 'daily':
      gross = profile.rate * (daysWorked + paidLeaveDays);
      break;
    case 'hourly':
      gross = profile.rate * hoursWorked;
      break;
    case 'monthly':
      gross = profile.rate * (daysInPeriod(periodStart, periodEnd) / 30);
      break;
  }
  // Monthly-paid staff on approved paid leave is already covered by the prorated gross.
  const overtimePay = overtimeHrs * hourlyEquivalent(profile) * (profile.overtimeRate ?? 1.25);
  const net = gross + overtimePay + profile.allowances - profile.deductions;

  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    userId: profile.userId,
    employeeName: '',
    daysWorked,
    hoursWorked: r2(hoursWorked),
    overtimeHrs: r2(overtimeHrs),
    paidLeaveDays,
    gross: r2(gross),
    overtimePay: r2(overtimePay),
    allowances: profile.allowances,
    deductions: profile.deductions,
    net: r2(net),
  };
}
