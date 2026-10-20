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

export const categories: Category[] = [
  { id: 'cat-print', name: 'Tarpaulin & Signage', sortOrder: 1 },
  { id: 'cat-doc', name: 'Documents & Copying', sortOrder: 2 },
  { id: 'cat-photo', name: 'Photo & ID', sortOrder: 3 },
  { id: 'cat-card', name: 'PVC IDs & Cards', sortOrder: 4 },
  { id: 'cat-sticker', name: 'Stickers & Vinyl', sortOrder: 5 },
  { id: 'cat-biz', name: 'Business Forms', sortOrder: 6 },
  { id: 'cat-notary', name: 'Notary & Gov Documents', sortOrder: 7 },
  { id: 'cat-merch', name: 'Merchandise', sortOrder: 8 },
];

export const materials: Material[] = [
  { id: 'mat-tarp', code: 'TRP-13OZ', name: 'Tarpaulin 13oz', unit: 'roll', stockQty: 6, minStockLevel: 4, costPerUnit: 2200 },
  { id: 'mat-vinyl', code: 'VNY-GLOSS', name: 'Gloss Vinyl', unit: 'roll', stockQty: 3, minStockLevel: 4, costPerUnit: 1850 },
  { id: 'mat-ink-c', code: 'INK-CYN', name: 'Eco-solvent Ink — Cyan', unit: 'liter', stockQty: 2.4, minStockLevel: 2, costPerUnit: 3100 },
  { id: 'mat-ink-m', code: 'INK-MAG', name: 'Eco-solvent Ink — Magenta', unit: 'liter', stockQty: 1.2, minStockLevel: 2, costPerUnit: 3100 },
  { id: 'mat-ink-y', code: 'INK-YLW', name: 'Eco-solvent Ink — Yellow', unit: 'liter', stockQty: 3.1, minStockLevel: 2, costPerUnit: 3100 },
  { id: 'mat-ink-k', code: 'INK-BLK', name: 'Eco-solvent Ink — Black', unit: 'liter', stockQty: 4.0, minStockLevel: 2, costPerUnit: 3100 },
  { id: 'mat-photo', code: 'PPR-GLOSS', name: 'Photo Paper Gloss A4', unit: 'carton', stockQty: 9, minStockLevel: 5, costPerUnit: 640 },
  { id: 'mat-board', code: 'BRD-SINTRA', name: 'Sintra Board 3mm', unit: 'piece', stockQty: 22, minStockLevel: 10, costPerUnit: 380 },
  { id: 'mat-pvc', code: 'CRD-PVC', name: 'PVC ID Cards (blank)', unit: 'piece', stockQty: 320, minStockLevel: 80, costPerUnit: 9 },
  { id: 'mat-ncr', code: 'PPR-NCR3', name: 'NCR Paper 3-ply', unit: 'carton', stockQty: 4, minStockLevel: 2, costPerUnit: 980 },
  { id: 'mat-card', code: 'PPR-CARD', name: 'Cardstock A4 250gsm', unit: 'carton', stockQty: 7, minStockLevel: 3, costPerUnit: 520 },
  { id: 'mat-lam', code: 'FILM-LAM', name: 'Laminating Film A4', unit: 'pack', stockQty: 6, minStockLevel: 3, costPerUnit: 340 },
  { id: 'mat-frame', code: 'FRM-WOOD', name: 'Wood Frame 8×10', unit: 'piece', stockQty: 7, minStockLevel: 8, costPerUnit: 150 },
  { id: 'mat-a4', code: 'PPR-A4-80', name: 'A4 Copy Paper 80gsm', unit: 'sheet', stockQty: 9500, minStockLevel: 2500, costPerUnit: 0.32, unitsPerPack: 500, packUnit: 'ream' },
];

export const products: Product[] = [
  // Large format — area priced
  { id: 'p-tarp', kind: 'service', sku: 'SRV-TRP', name: 'Tarpaulin Print', categoryId: 'cat-print', price: 28, pricing: 'area', areaUnit: 'sq ft', consumes: [{ materialId: 'mat-tarp', qty: 0.01 }, { materialId: 'mat-ink-c', qty: 0.002 }], isActive: true },
  { id: 'p-sintra', kind: 'service', sku: 'SRV-SNT', name: 'Sintra Board Print', categoryId: 'cat-print', price: 95, pricing: 'area', areaUnit: 'sq ft', consumes: [{ materialId: 'mat-board', qty: 0.05 }], isActive: true },
  { id: 'p-vinyl-cut', kind: 'service', sku: 'SRV-VNY', name: 'Sticker Vinyl (die-cut)', categoryId: 'cat-sticker', price: 35, pricing: 'area', areaUnit: 'sq ft', consumes: [{ materialId: 'mat-vinyl', qty: 0.01 }], isActive: true },
  // Copying & documents
  { id: 'p-photocopy', kind: 'service', sku: 'SRV-COPY', name: 'Document Print / Photocopy', categoryId: 'cat-doc', price: 5, pricing: 'fixed', consumes: [], stockQty: 999, isActive: true },
  { id: 'p-scan', kind: 'service', sku: 'SRV-SCN', name: 'Scanning (per page)', categoryId: 'cat-doc', price: 15, pricing: 'fixed', consumes: [], stockQty: 999, isActive: true },
  { id: 'p-laminate', kind: 'service', sku: 'SRV-LAM', name: 'Lamination A4', categoryId: 'cat-doc', price: 30, pricing: 'fixed', consumes: [{ materialId: 'mat-lam', qty: 0.01 }], stockQty: 200, isActive: true },
  { id: 'p-blue-bw', kind: 'service', sku: 'SRV-BPBW', name: 'Blueprint Copy — B&W', categoryId: 'cat-doc', price: 60, pricing: 'fixed', consumes: [{ materialId: 'mat-ink-k', qty: 0.005 }], stockQty: 999, isActive: true },
  { id: 'p-blue-cl', kind: 'service', sku: 'SRV-BPCL', name: 'Blueprint Copy — Color', categoryId: 'cat-doc', price: 120, pricing: 'fixed', consumes: [{ materialId: 'mat-ink-c', qty: 0.004 }], stockQty: 999, isActive: true },
  // Photo & ID
  { id: 'p-rush4r', kind: 'service', sku: 'SRV-4R', name: 'Photo Print 4R', categoryId: 'cat-photo', price: 25, pricing: 'fixed', consumes: [{ materialId: 'mat-photo', qty: 0.02 }], stockQty: 999, isActive: true },
  { id: 'p-idphoto', kind: 'service', sku: 'SRV-IDP', name: 'Rush ID Photo Set', categoryId: 'cat-photo', price: 120, pricing: 'fixed', consumes: [{ materialId: 'mat-photo', qty: 0.05 }], stockQty: 150, isActive: true },
  { id: 'p-8r-frame', kind: 'service', sku: 'SRV-8RF', name: 'Framed 8R Portrait', categoryId: 'cat-photo', price: 550, pricing: 'fixed', consumes: [{ materialId: 'mat-photo', qty: 0.1 }, { materialId: 'mat-frame', qty: 1 }], stockQty: 7, isActive: true },
  // PVC IDs & cards
  { id: 'p-pvc', kind: 'service', sku: 'SRV-PVC', name: 'PVC ID Card', categoryId: 'cat-card', price: 150, pricing: 'fixed', consumes: [{ materialId: 'mat-pvc', qty: 1 }], stockQty: 320, isActive: true },
  { id: 'p-pvc-land', kind: 'service', sku: 'SRV-PVCL', name: 'PVC ID w/ Lanyard', categoryId: 'cat-card', price: 250, pricing: 'fixed', consumes: [{ materialId: 'mat-pvc', qty: 1 }], stockQty: 180, isActive: true },
  // Business forms
  { id: 'p-layout', kind: 'service', sku: 'SRV-LYT', name: 'Design & Layout Fee', categoryId: 'cat-print', price: 200, pricing: 'fixed', consumes: [], stockQty: 999, isActive: true },
  { id: 'p-bizcards', kind: 'service', sku: 'SRV-BCD', name: 'Business Cards (100 pcs)', categoryId: 'cat-biz', price: 350, pricing: 'fixed', consumes: [{ materialId: 'mat-card', qty: 0.15 }], stockQty: 999, isActive: true },
  { id: 'p-receipt', kind: 'service', sku: 'SRV-ORP', name: 'Official Receipt Pad (50 sets)', categoryId: 'cat-biz', price: 450, pricing: 'fixed', consumes: [{ materialId: 'mat-ncr', qty: 0.06 }], stockQty: 999, isActive: true, machineTracked: true },
  { id: 'p-atp', kind: 'service', sku: 'SRV-ATP', name: 'BIR ATP Processing', categoryId: 'cat-biz', price: 1500, pricing: 'fixed', consumes: [], stockQty: 999, isActive: true },
  // Notary & government documents
  { id: 'p-notary', kind: 'service', sku: 'SRV-NOT', name: 'Notary Service', categoryId: 'cat-notary', price: 100, pricing: 'fixed', consumes: [{ materialId: 'mat-a4', qty: 2 }], stockQty: 999, isActive: true, notaryFee: true, description: 'Notarization of documents — ₱1 doc-stamp fee added at checkout.' },
  { id: 'p-govdoc', kind: 'service', sku: 'SRV-GOV', name: 'Government Document (PSA/NSO cert.)', categoryId: 'cat-notary', price: 150, pricing: 'fixed', consumes: [{ materialId: 'mat-a4', qty: 3 }], stockQty: 999, isActive: true },
  { id: 'p-punch', kind: 'service', sku: 'SRV-PCH', name: 'Document Punching / Bind Prep', categoryId: 'cat-notary', price: 40, pricing: 'fixed', consumes: [], stockQty: 999, isActive: true, machineTracked: true, description: 'Punching-machine job — tracked in Production for accountability.' },
  // Merch
  { id: 'p-mug', kind: 'product', sku: 'MRC-MUG', name: 'Custom Mug', categoryId: 'cat-merch', price: 250, pricing: 'fixed', consumes: [], stockQty: 34, isActive: true },
  { id: 'p-shirt', kind: 'product', sku: 'MRC-TEE', name: 'Custom Shirt (DTF)', categoryId: 'cat-merch', price: 380, pricing: 'fixed', consumes: [], stockQty: 52, isActive: true },
  { id: 'p-tote', kind: 'product', sku: 'MRC-TOTE', name: 'Tote Bag Print', categoryId: 'cat-merch', price: 220, pricing: 'fixed', consumes: [], stockQty: 18, isActive: true },
];

export const customers: Customer[] = [
  { id: 'c-ana', code: 'C-0001', firstName: 'Ana', lastName: 'Lim', phone: '0917 555 0101', email: 'ana.lim@mail.com', tier: 'gold', loyaltyPoints: 1840, lifetimeSpend: 42300, isSeniorCitizen: false, isPwd: false },
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
    type: 'bxgy', buyQty: 10, getQty: 2, productId: 'p-rush4r',
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
  receiptFooter: 'Thank you! This does not serve as an invoice',
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
  { userId: 'u-admin', position: 'Owner', status: 'active', hiredAt: '2019-06-01', salaryType: 'monthly', rate: 60000, allowances: 0, deductions: 0 },
  { userId: 'u-maria', position: 'Branch Manager', status: 'active', hiredAt: '2020-02-10', salaryType: 'monthly', rate: 32000, allowances: 1500, deductions: 800, overtimeRate: 1.25 },
  { userId: 'u-jonas', position: 'Cashier', status: 'active', hiredAt: '2023-09-04', salaryType: 'daily', rate: 610, allowances: 300, deductions: 200, overtimeRate: 1.25 },
  { userId: 'u-pia', position: 'Production Handler', status: 'active', hiredAt: '2024-03-11', salaryType: 'hourly', rate: 85, allowances: 0, deductions: 0 },
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

export const stockMovements: StockMovement[] = [
  { id: 'mv-1', materialId: 'mat-a4', branchId: 'br-greenhills', kind: 'received', qty: 5000, reason: 'Supplier delivery — PO-1102', employeeId: 'u-maria', employeeName: 'Maria Santos', createdAt: hrs(30) },
  { id: 'mv-2', materialId: 'mat-a4', branchId: 'br-greenhills', kind: 'consumed', qty: -60, reason: 'Sale INV-2026-0837', refId: 's-5', employeeId: 'u-maria', employeeName: 'Maria Santos', createdAt: hrs(26) },
  { id: 'mv-3', materialId: 'mat-pvc', branchId: 'br-caloocan', kind: 'waste', qty: -5, reason: 'Misprinted cards — damaged', employeeId: 'u-jonas', employeeName: 'Jonas Cruz', createdAt: hrs(20) },
];

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

export const demoCredentials = { email: 'admin@ashletrato.com', password: 'letrato123' };
