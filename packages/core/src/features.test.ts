import { describe, expect, it } from 'vitest';
import {
  accessibleModules,
  addDays,
  addYears,
  birthdaysInMonth,
  consumptionFor,
  effectivePermissions,
  formatSheets,
  hasPermission,
  isValidISODate,
  membershipExpiry,
  membershipStatus,
  paperSheets,
  printedPages,
  renewalStart,
  staffMonthReport,
  type EmployeeProfile,
  type Product,
  type Sale,
  type User,
} from './index';

const user = (over: Partial<User>): User => ({
  id: 'u-x',
  email: 'x@test.local',
  firstName: 'X',
  lastName: 'Test',
  role: 'cashier',
  branchId: 'br-caloocan',
  canAuthorizeVoids: false,
  pin: '',
  ...over,
});

describe('permissions', () => {
  it('owner always has every module and feature, even with an empty grant list', () => {
    const owner = user({ role: 'super_admin', permissions: [] });
    expect(effectivePermissions(owner).size).toBe(21);
    expect(hasPermission(owner, 'rewards')).toBe(true);
  });

  it('cashiers get role defaults and no sensitive features', () => {
    const c = user({ role: 'cashier' });
    expect(accessibleModules(c)).toEqual(['pos', 'sales', 'customers']);
    expect(hasPermission(c, 'void_refund')).toBe(false);
    expect(hasPermission(c, 'membership')).toBe(false);
  });

  it('the legacy supervisor flag grants void/refund authority', () => {
    expect(hasPermission(user({ role: 'cashier', canAuthorizeVoids: true }), 'void_refund')).toBe(true);
  });

  it('explicit grants replace role defaults', () => {
    const c = user({ role: 'cashier', permissions: ['pos', 'membership'] });
    expect(accessibleModules(c)).toEqual(['pos']);
    expect(hasPermission(c, 'membership')).toBe(true);
    expect(hasPermission(c, 'customer_history')).toBe(false);
  });

  it('managers do not get staff accounts or rewards by default', () => {
    const m = user({ role: 'manager' });
    expect(hasPermission(m, 'users')).toBe(false);
    expect(hasPermission(m, 'rewards')).toBe(false);
    expect(hasPermission(m, 'membership')).toBe(true);
  });
});

describe('paper', () => {
  it('back-to-back printing uses half the sheets, rounded up per copy', () => {
    expect(paperSheets(10, 1, 'duplex')).toBe(5);
    expect(paperSheets(11, 1, 'duplex')).toBe(6);
    expect(paperSheets(11, 3, 'duplex')).toBe(18);
    expect(paperSheets(10, 2, 'single')).toBe(20);
    expect(printedPages(10, 2)).toBe(20);
  });

  it('formats stock as reams and loose sheets', () => {
    expect(formatSheets(1500)).toBe('3 reams');
    expect(formatSheets(1620)).toBe('3 reams + 120 sheets');
    expect(formatSheets(120)).toBe('120 sheets');
    expect(formatSheets(500)).toBe('1 ream');
    expect(formatSheets(-5)).toBe('-5 sheets (over-drawn)');
  });
});

const product = (over: Partial<Product>): Product => ({
  id: 'p',
  sku: 'P',
  name: 'P',
  categoryId: 'c',
  kind: 'service',
  price: 1,
  pricing: 'fixed',
  consumes: [],
  isActive: true,
  ...over,
});

describe('consumption', () => {
  it('area jobs draw recipes by square feet, not by line quantity', () => {
    const tarp = product({
      pricing: 'area',
      consumes: [
        { materialId: 'mat-tarp', qty: 0.01 },
        { materialId: 'mat-ink-c', qty: 0.002 },
      ],
    });
    const uses = consumptionFor({ qty: 1, area: { width: 4, height: 6, unit: 'sq ft', rate: 28 } }, tarp);
    expect(uses).toEqual([
      { materialId: 'mat-tarp', qty: 0.24 },
      { materialId: 'mat-ink-c', qty: 0.048 },
    ]);
  });

  it('paper jobs draw sheets from the chosen size and scale ink by printed pages', () => {
    const copy = product({
      paperMaterialIds: ['mat-short', 'mat-a4', 'mat-long'],
      consumes: [{ materialId: 'mat-ink-k', qty: 0.001 }],
    });
    const uses = consumptionFor(
      { qty: 20, paper: { materialId: 'mat-a4', sides: 'duplex', pages: 10, copies: 2 } },
      copy,
    );
    expect(uses).toEqual([
      { materialId: 'mat-ink-k', qty: 0.02 },
      { materialId: 'mat-a4', qty: 10 },
    ]);
  });
});

describe('membership', () => {
  it('a membership runs one year and ends the day before the anniversary', () => {
    expect(addYears('2026-10-28', 1)).toBe('2027-10-28');
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
    expect(membershipExpiry('2026-10-28')).toBe('2027-10-27');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('reports valid, expiring and expired memberships against a date', () => {
    const card = { membershipCardNo: 'M-1', membershipExpires: '2027-10-27' };
    expect(membershipStatus(card, '2026-10-28')).toMatchObject({ state: 'valid', daysLeft: 364 });
    expect(membershipStatus(card, '2027-10-20')).toMatchObject({ state: 'expiring', daysLeft: 7 });
    expect(membershipStatus(card, '2027-10-28')).toMatchObject({ state: 'expired', daysLeft: -1 });
    expect(membershipStatus({}, '2026-10-28')).toEqual({ state: 'none' });
  });

  it('renewal starts the day after a running term ends, or today once it has lapsed', () => {
    const card = { membershipCardNo: 'M-1', membershipExpires: '2027-10-27' };
    expect(renewalStart(card, '2026-10-28')).toBe('2027-10-28');
    expect(renewalStart(card, '2027-11-01')).toBe('2027-11-01');
  });

  it('finds birthdays in a month, ordered by day, and rejects impossible dates', () => {
    const list = [
      { id: 'a', birthdate: '1990-11-20' },
      { id: 'b', birthdate: '1985-11-03' },
      { id: 'c', birthdate: '1979-12-01' },
      { id: 'd' },
    ];
    expect(birthdaysInMonth(list, 11).map((c) => c.id)).toEqual(['b', 'a']);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-02-28')).toBe(true);
  });
});

const sale = (over: Partial<Sale>): Sale => ({
  id: 's',
  invoiceNumber: 'INV-1',
  createdAt: '2026-10-05T04:00:00.000Z',
  cashierName: 'Jonas Cruz',
  branchId: 'br-caloocan',
  branchName: 'Caloocan',
  lines: [],
  subtotal: 0,
  discountTotal: 0,
  vatExempt: false,
  taxTotal: 0,
  total: 0,
  paymentMethod: 'cash',
  amountTendered: 0,
  change: 0,
  pointsEarned: 0,
  status: 'completed',
  ...over,
});

describe('staff monthly report', () => {
  const users: User[] = [
    user({ id: 'u-jonas', firstName: 'Jonas', role: 'cashier' }),
    user({ id: 'u-pia', firstName: 'Pia', role: 'handler', branchId: 'br-galleria' }),
    user({ id: 'u-maria', firstName: 'Maria', role: 'manager', branchId: 'br-greenhills' }),
  ];
  const profiles: EmployeeProfile[] = [
    {
      userId: 'u-jonas',
      position: 'Cashier',
      status: 'active',
      hiredAt: '2023-01-01',
      salaryType: 'daily',
      rate: 850,
      allowances: 0,
      deductions: 0,
      jobRole: 'cashier',
      commissionPct: 2,
      monthlyTarget: 250,
    },
    {
      userId: 'u-pia',
      position: 'Graphic artist',
      status: 'active',
      hiredAt: '2024-05-02',
      salaryType: 'daily',
      rate: 780,
      allowances: 0,
      deductions: 0,
      jobRole: 'graphic_artist',
      commissionPct: 10,
      monthlyTarget: 600,
    },
  ];
  const sales: Sale[] = [
    sale({
      id: 'sA',
      total: 300,
      cashierId: 'u-jonas',
      lines: [
        { name: 'Tarp', qty: 1, unitPrice: 200, total: 200, handlerId: 'u-pia' },
        { name: 'Copies', qty: 10, unitPrice: 10, total: 100, handlerId: 'u-jonas' },
      ],
    }),
    sale({
      id: 'sB',
      createdAt: '2026-10-10T04:00:00.000Z',
      branchId: 'br-greenhills',
      branchName: 'Main — Greenhills',
      total: 500,
      cashierId: 'u-maria',
      cashierName: 'Maria Santos',
      lines: [{ name: 'Sticker', qty: 1, unitPrice: 500, total: 500, handlerId: 'u-pia' }],
    }),
    sale({ id: 'sVoid', total: 999, cashierId: 'u-jonas', status: 'voided' }),
    sale({ id: 'sSep', createdAt: '2026-09-20T04:00:00.000Z', total: 888, cashierId: 'u-jonas' }),
  ];

  it('credits cashiers with sales they rang up and artists with lines they produced', () => {
    const rows = staffMonthReport({ sales, users, profiles, month: '2026-10' });
    const jonas = rows.find((r) => r.userId === 'u-jonas')!;
    const pia = rows.find((r) => r.userId === 'u-pia')!;
    expect(jonas).toMatchObject({ transactions: 1, transactionsTotal: 300, credit: 300, commission: 6, targetReached: true, targetPct: 120 });
    expect(pia).toMatchObject({ handledItems: 2, handledItemsTotal: 700, credit: 700, commission: 70, targetReached: true, targetPct: 117 });
  });

  it('shows transactions for everyone but pays commission only on the basis set for them', () => {
    const rows = staffMonthReport({ sales, users, profiles, month: '2026-10' });
    const maria = rows.find((r) => r.userId === 'u-maria')!;
    expect(maria).toMatchObject({ transactionsTotal: 500, basis: 'none', credit: 0, commission: 0, targetReached: false });
  });

  it('filters by branch', () => {
    const rows = staffMonthReport({ sales, users, profiles, month: '2026-10', branchId: 'br-caloocan' });
    expect(rows.find((r) => r.userId === 'u-pia')!.credit).toBe(200);
    expect(rows.find((r) => r.userId === 'u-maria')!.transactionsTotal).toBe(0);
  });
});
