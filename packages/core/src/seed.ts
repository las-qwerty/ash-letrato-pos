import type {
  AttendanceRecord,
  AuditEntry,
  Branch,
  Category,
  CounterReading,
  Customer,
  EmployeeProfile,
  Material,
  PayrollRun,
  Product,
  Promotion,
  PunchRecord,
  Sale,
  StockMovement,
  StoreSettings,
  User,
  StaffReward,
} from './types';

export const branches: Branch[] = [
  { id: 'br-greenhills', name: 'Main — Greenhills', address: 'Unit 20 Maranaw Plaza, Greenhills East, Mandaluyong', isActive: true },
  { id: 'br-caloocan', name: 'Caloocan', address: 'G/F G09 Victory Central Mall, Caloocan City', isActive: true },
  { id: 'br-galleria', name: 'Robinsons Galleria', address: 'Basement, Robinsons Galleria, Ortigas, QC', isActive: true },
];

export const users: User[] = [
  {
    id: 'u-admin',
    email: 'admin@ashletrato.com',
    firstName: 'Simone',
    lastName: 'Reyes',
    role: 'super_admin',
    branchId: 'br-greenhills',
    canAuthorizeVoids: true,
    pin: '2468',
  },
  {
    id: 'u-maria',
    email: 'maria@ashletrato.com',
    firstName: 'Maria',
    lastName: 'Santos',
    role: 'manager',
    branchId: 'br-greenhills',
    canAuthorizeVoids: true,
    pin: '1357',
  },
  {
    id: 'u-jonas',
    email: 'jonas@ashletrato.com',
    firstName: 'Jonas',
    lastName: 'Cruz',
    role: 'cashier',
    branchId: 'br-caloocan',
    canAuthorizeVoids: false,
    pin: '1122',
  },
  {
    id: 'u-pia',
    email: 'pia@ashletrato.com',
    firstName: 'Pia',
    lastName: 'Lim',
    role: 'handler',
    branchId: 'br-galleria',
    canAuthorizeVoids: false,
    pin: '8899',
  },
];

export { catalogCategories as categories, catalogMaterials as materials, catalogProducts as products } from './catalog';



export const customers: Customer[] = [
  { id: 'c-ana', code: 'C-0001', firstName: 'Ana', lastName: 'Lim', phone: '0917 555 0101', email: 'ana.lim@mail.com', tier: 'gold', loyaltyPoints: 1840, lifetimeSpend: 42300, isSeniorCitizen: false, isPwd: false, birthdate: '1990-11-03', membershipCardNo: 'ASH-0001', membershipStart: '2026-03-01', membershipExpires: '2027-02-28' },
  { id: 'c-ben', code: 'C-0002', firstName: 'Ben', lastName: 'Torres', phone: '0918 555 0102', tier: 'silver', loyaltyPoints: 620, lifetimeSpend: 12400, isSeniorCitizen: false, isPwd: false },
  { id: 'c-cora', code: 'C-0003', firstName: 'Cora', lastName: 'Diaz', phone: '0919 555 0103', tier: 'platinum', loyaltyPoints: 5210, lifetimeSpend: 98200, isSeniorCitizen: true, isPwd: false, discountId: 'SC-1042' },
  { id: 'c-dan', code: 'C-0004', firstName: 'Dan', lastName: 'Uy', phone: '0920 555 0104', tier: 'none', loyaltyPoints: 90, lifetimeSpend: 1800, isSeniorCitizen: false, isPwd: true, discountId: 'PWD-2210' },
  { id: 'c-elsa', code: 'C-0005', firstName: 'Elsa', lastName: 'Mercado', phone: '0921 555 0105', tier: 'silver', loyaltyPoints: 410, lifetimeSpend: 8600, isSeniorCitizen: false, isPwd: false },
];

const now = Date.now();
const hrs = (h: number) => new Date(now - h * 3_600_000).toISOString();

export const sales: Sale[] = [
  {
    id: 's-1', invoiceNumber: 'INV-2026-0841', createdAt: hrs(1), cashierName: 'Jonas Cruz', cashierId: 'u-jonas', branchId: 'br-caloocan', branchName: 'Caloocan',
    customerName: 'Ana Lim',
    lines: [
      { name: 'Tarpaulin Print — 4×6 ft', qty: 1, unitPrice: 672, total: 672 },
      { name: 'Custom Shirt (DTF)', qty: 2, unitPrice: 380, total: 760 },
    ],
    subtotal: 1432, discountTotal: 0, vatExempt: false, taxTotal: 153.43, total: 1432,
    paymentMethod: 'cash', amountTendered: 1500, change: 68, pointsEarned: 143, status: 'completed',
  },
  {
    id: 's-2', invoiceNumber: 'INV-2026-0840', createdAt: hrs(2), cashierName: 'Jonas Cruz', cashierId: 'u-jonas', branchId: 'br-caloocan', branchName: 'Caloocan',
    customerName: 'Cora Diaz',
    lines: [{ name: 'Framed 8R Portrait', qty: 1, unitPrice: 550, total: 550 }],
    subtotal: 550, discountTotal: 98.21, vatExempt: true, taxTotal: 0, total: 392.86,
    paymentMethod: 'gcash', amountTendered: 392.86, change: 0, pointsEarned: 0, status: 'completed',
  },
  {
    id: 's-3', invoiceNumber: 'INV-2026-0839', createdAt: hrs(3), cashierName: 'Maria Santos', cashierId: 'u-maria', branchId: 'br-greenhills', branchName: 'Main — Greenhills',
    lines: [
      { name: 'Sticker Vinyl (die-cut) — 2×3 ft', qty: 3, unitPrice: 210, total: 630 },
      { name: 'Lamination A4', qty: 5, unitPrice: 30, total: 150 },
    ],
    subtotal: 780, discountTotal: 0, vatExempt: false, taxTotal: 83.57, total: 780,
    paymentMethod: 'cash', amountTendered: 800, change: 20, pointsEarned: 78, status: 'completed',
  },
  {
    id: 's-4', invoiceNumber: 'INV-2026-0838', createdAt: hrs(5), cashierName: 'Jonas Cruz', cashierId: 'u-jonas', branchId: 'br-caloocan', branchName: 'Caloocan',
    lines: [{ name: 'Custom Mug', qty: 4, unitPrice: 250, total: 1000 }],
    subtotal: 1000, discountTotal: 0, vatExempt: false, taxTotal: 107.14, total: 1000,
    paymentMethod: 'cash', amountTendered: 1000, change: 0, pointsEarned: 100, status: 'refunded',
    voidReason: 'Print color mismatch — redone free of charge', authorizedBy: 'Maria Santos',
  },
  {
    id: 's-5', invoiceNumber: 'INV-2026-0837', createdAt: hrs(26), cashierName: 'Maria Santos', cashierId: 'u-maria', branchId: 'br-greenhills', branchName: 'Main — Greenhills',
    customerName: 'Dan Uy',
    lines: [
      { name: 'Rush ID Photo Set', qty: 2, unitPrice: 120, total: 240 },
      { name: 'Document Print / Photocopy', qty: 12, unitPrice: 5, total: 60 },
    ],
    subtotal: 300, discountTotal: 53.57, vatExempt: true, taxTotal: 0, total: 214.29,
    paymentMethod: 'cash', amountTendered: 220, change: 5.71, pointsEarned: 0, status: 'completed',
  },
  {
    id: 's-6', invoiceNumber: 'INV-2026-0836', createdAt: hrs(28), cashierName: 'Jonas Cruz', cashierId: 'u-jonas', branchId: 'br-caloocan', branchName: 'Caloocan',
    lines: [{ name: 'Sintra Board Print — 2×2 ft', qty: 1, unitPrice: 380, total: 380 }],
    subtotal: 380, discountTotal: 0, vatExempt: false, taxTotal: 40.71, total: 380,
    paymentMethod: 'maya', amountTendered: 380, change: 0, pointsEarned: 38, status: 'voided',
    voidReason: 'Customer cancelled — wrong dimension entered', authorizedBy: 'Simone Reyes',
  },
];

export const promotions: Promotion[] = [
  {
    id: 'pr-bulk10', code: 'BULK10', name: 'Bulk order — 10% off',
    type: 'percent', pct: 10, minSpend: 500, usageCount: 0, isActive: true,
  },
  {
    id: 'pr-lunch', code: 'STUDIO200', name: '₱200 off big jobs',
    type: 'amount', amount: 200, minSpend: 1000, usageLimit: 50,
    usageCount: 0, isActive: true,
  },
  {
    id: 'pr-4r', code: 'PHOTO12', name: 'Photo 4R — buy 10 get 2 free',
    type: 'bxgy', buyQty: 10, getQty: 2, productId: 'p-001',
    usageCount: 0, isActive: true,
  },
  {
    id: 'pr-old', code: 'LAUNCH15', name: 'Launch promo (ended)',
    type: 'percent', pct: 15, endsAt: '2026-01-31T23:59:59Z',
    usageCount: 0, isActive: false,
  },
];

export const settings: StoreSettings = {
  storeName: 'ASH LETRATO, INC.',
  tin: '212-053-098-00612',
  addressLine1: 'Unit 20 Maranaw Plaza, Greenhills East, Mandaluyong',
  addressLine2: 'BIR Accredited Printer · sales@ashletrato.com',
  phone: '(02) 8725-7641',
  receiptFooter: 'Thank you!\nTHIS DOES NOT SERVE AS AN INVOICE',
  vatRate: 12,
  seniorPwdDiscountPct: 20,
  loyaltyEarnRate: 0.1,
  loyaltyRedeemValue: 0.01,
  supervisorPin: '2468',
  autoLockMinutes: 5,
  notaryFee: 1,
  productionEnabled: false,
  receiptWidthMm: 80,
};

// ─── Enterprise seed data (HR, inventory ledger, production) ─────────────────

export const employeeProfiles: EmployeeProfile[] = [
  { userId: 'u-admin', position: 'Owner', status: 'active', hiredAt: '2019-06-01', salaryType: 'monthly', rate: 60000, allowances: 0, deductions: 0, jobRole: 'other' },
  { userId: 'u-maria', position: 'Branch Manager', status: 'active', hiredAt: '2020-02-10', salaryType: 'monthly', rate: 32000, allowances: 1500, deductions: 800, overtimeRate: 1.25, jobRole: 'other' },
  { userId: 'u-jonas', position: 'Cashier', status: 'active', hiredAt: '2023-09-04', salaryType: 'daily', rate: 610, allowances: 300, deductions: 200, overtimeRate: 1.25, jobRole: 'cashier', commissionBasis: 'transactions', commissionPct: 1, monthlyTarget: 50000 },
  { userId: 'u-pia', position: 'Graphic Artist', status: 'active', hiredAt: '2024-03-11', salaryType: 'hourly', rate: 85, allowances: 0, deductions: 0, jobRole: 'graphic_artist', commissionBasis: 'handled_items', commissionPct: 5, monthlyTarget: 30000 },
];

const today = () => new Date().toISOString().slice(0, 10);
const yday = () => new Date(now - 86_400_000).toISOString().slice(0, 10);

export const attendance: AttendanceRecord[] = [
  { id: 'att-1', userId: 'u-maria', branchId: 'br-greenhills', date: yday(), clockIn: hrs(30), clockOut: hrs(21) },
  { id: 'att-2', userId: 'u-jonas', branchId: 'br-caloocan', date: yday(), clockIn: hrs(31), clockOut: hrs(22) },
  { id: 'att-3', userId: 'u-jonas', branchId: 'br-caloocan', date: today(), clockIn: hrs(4) },
  { id: 'att-4', userId: 'u-pia', branchId: 'br-galleria', date: today(), clockIn: hrs(3) },
];

export const counterReadings: CounterReading[] = [
  { id: 'cr-1', branchId: 'br-caloocan', machine: 'Punching Machine 1', kind: 'open', reading: 41230, employeeId: 'u-jonas', employeeName: 'Jonas Cruz', shiftDate: today(), createdAt: hrs(7) },
  { id: 'cr-2', branchId: 'br-caloocan', machine: 'Punching Machine 1', kind: 'close', reading: 41312, employeeId: 'u-jonas', employeeName: 'Jonas Cruz', shiftDate: yday(), createdAt: hrs(26) },
];

export const punchRecords: PunchRecord[] = [
  { id: 'punch-1', ticketCode: 'JT-0001', branchId: 'br-caloocan', employeeId: 'u-jonas', employeeName: 'Jonas Cruz', serviceType: 'Document Punching / Bind Prep', productId: 'p-punch', saleId: 's-5', qty: 40, damagedQty: 2, reprocessedQty: 1, status: 'completed', createdAt: hrs(25), completedAt: hrs(24) },
  { id: 'punch-2', ticketCode: 'JT-0002', branchId: 'br-greenhills', employeeId: 'u-maria', employeeName: 'Maria Santos', serviceType: 'Official Receipt Pad (50 sets)', productId: 'p-receipt', qty: 38, damagedQty: 0, reprocessedQty: 0, status: 'completed', createdAt: hrs(24), completedAt: hrs(23) },
  { id: 'punch-3', ticketCode: 'JT-0003', branchId: 'br-galleria', employeeId: 'u-pia', employeeName: 'Pia Lim', serviceType: 'Sticker Vinyl (die-cut)', productId: 'p-vinyl-cut', qty: 25, damagedQty: 0, reprocessedQty: 0, status: 'open', createdAt: hrs(2) },
];

export const stockMovements: StockMovement[] = [];

export const payrollRuns: PayrollRun[] = [
  {
    id: 'pay-1', periodStart: yday(), periodEnd: today(), status: 'draft',
    createdBy: 'u-admin', createdAt: hrs(2),
    slips: [
      { userId: 'u-maria', employeeName: 'Maria Santos', daysWorked: 1, hoursWorked: 9, overtimeHrs: 0.5, paidLeaveDays: 0, gross: 1333.33, overtimePay: 83.33, allowances: 75, deductions: 40, net: 1451.66 },
      { userId: 'u-jonas', employeeName: 'Jonas Cruz', daysWorked: 1, hoursWorked: 9, overtimeHrs: 0, paidLeaveDays: 0, gross: 610, overtimePay: 0, allowances: 15, deductions: 10, net: 615 },
    ],
  },
];

export const auditLog: AuditEntry[] = [];

export const staffRewards: StaffReward[] = [];

export const demoCredentials = { email: 'admin@ashletrato.com', password: 'letrato123' };
