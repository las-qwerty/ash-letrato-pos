import { describe, expect, it } from 'vitest';
import {
  computePayslip,
  daysInPeriod,
  hourlyEquivalent,
  workedHours,
  type AttendanceRecord,
  type EmployeeProfile,
} from './index';

const profile = (over: Partial<EmployeeProfile> = {}): EmployeeProfile => ({
  userId: 'u1',
  position: 'Cashier',
  status: 'active',
  hiredAt: '2024-01-01',
  salaryType: 'daily',
  rate: 600,
  allowances: 100,
  deductions: 50,
  overtimeRate: 1.25,
  ...over,
});

const att = (over: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  id: `a-${Math.random().toString(36).slice(2)}`,
  userId: 'u1',
  branchId: 'b1',
  date: '2026-03-10',
  clockIn: '2026-03-10T08:00:00',
  clockOut: '2026-03-10T17:00:00', // 9h → 1h OT
  ...over,
});

const PERIOD = ['2026-03-01', '2026-03-15'] as const;

describe('daysInPeriod / workedHours / hourlyEquivalent', () => {
  it('inclusive day count and reversed-range safety', () => {
    expect(daysInPeriod('2026-03-01', '2026-03-15')).toBe(15);
    expect(daysInPeriod('2026-03-15', '2026-03-01')).toBe(0);
  });

  it('worked hours from clock times', () => {
    expect(workedHours(att())).toBe(9);
    expect(workedHours(att({ clockOut: undefined }))).toBe(0);
  });

  it('hourly equivalent by salary type', () => {
    expect(hourlyEquivalent(profile({ salaryType: 'hourly', rate: 80 }))).toBe(80);
    expect(hourlyEquivalent(profile({ salaryType: 'daily', rate: 640 }))).toBe(80);
    expect(hourlyEquivalent(profile({ salaryType: 'monthly', rate: 19200 }))).toBe(80);
  });
});

describe('computePayslip', () => {
  it('daily: rate × days worked + allowances − deductions', () => {
    const slips = computePayslip(
      profile(),
      [att({ date: '2026-03-05', clockIn: '2026-03-05T08:00:00', clockOut: '2026-03-05T16:00:00' }), att({ date: '2026-03-06', clockIn: '2026-03-06T08:00:00', clockOut: '2026-03-06T16:00:00' })],
      ...PERIOD,
    );
    expect(slips.daysWorked).toBe(2);
    expect(slips.gross).toBe(1200);
    expect(slips.net).toBe(1250); // +100 allowances −50 deductions
  });

  it('counts hours >8/day as overtime at the multiplier', () => {
    const s = computePayslip(profile(), [att()], ...PERIOD); // 9h day
    expect(s.overtimeHrs).toBe(1);
    expect(s.overtimePay).toBeCloseTo(75 * 1.25, 2); // 600/8 = 75/hr
    expect(s.net).toBe(600 + 93.75 + 100 - 50);
  });

  it('hourly: rate × hours actually worked', () => {
    const s = computePayslip(
      profile({ salaryType: 'hourly', rate: 80 }),
      [att({ clockOut: '2026-03-10T12:00:00' })], // 4h
      ...PERIOD,
    );
    expect(s.gross).toBe(320);
    expect(s.overtimeHrs).toBe(0);
  });

  it('monthly: prorated by period length ÷ 30', () => {
    const s = computePayslip(profile({ salaryType: 'monthly', rate: 18000 }), [], ...PERIOD);
    expect(s.gross).toBe(9000); // 15/30 × 18000
  });

  it('approved paid leave pays daily staff without attendance', () => {
    const s = computePayslip(
      profile(),
      [att({ clockIn: undefined, clockOut: undefined, leaveType: 'vacation', leaveApprovedBy: 'Boss' })],
      ...PERIOD,
    );
    expect(s.paidLeaveDays).toBe(1);
    expect(s.gross).toBe(600);
  });

  it('ignores records outside the period and other users', () => {
    const s = computePayslip(
      profile(),
      [att({ date: '2026-04-01' }), att({ userId: 'u2', date: '2026-03-05' })],
      ...PERIOD,
    );
    expect(s.daysWorked).toBe(0);
    expect(s.gross).toBe(0);
  });

  it('unapproved leave is not paid', () => {
    const s = computePayslip(
      profile(),
      [att({ clockIn: undefined, clockOut: undefined, leaveType: 'vacation' })],
      ...PERIOD,
    );
    expect(s.paidLeaveDays).toBe(0);
    expect(s.gross).toBe(0);
  });
});
