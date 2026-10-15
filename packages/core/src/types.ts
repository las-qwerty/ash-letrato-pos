/** Domain types shared across web, desktop, and mobile. */

export type Role = 'super_admin' | 'manager' | 'cashier' | 'handler';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  branchId: string;
  canAuthorizeVoids: boolean;
  /** Quick-switch PIN — seed/form value only; persisted users carry pinHash. */
  pin: string;
  /** Salted hash of `pin`, set once the PIN has been verified or changed. */
  pinHash?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export type PricingKind = 'fixed' | 'area';
export type ProductKind = 'product' | 'service';

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  /** Longer description for catalog/detail views. */
  description?: string;
  /** Uploaded image as a data URL — persisted with the product. */
  imageUrl?: string;
  categoryId: string;
  /** 'service' = billed work (print jobs, copying); 'product' = sellable goods (merch). */
  kind: ProductKind;
  /** Unit price for fixed items, or rate per areaUnit for area-priced services. */
  price: number;
  pricing: PricingKind;
  /** For area-priced items: the unit label, e.g. "sq ft". */
  areaUnit?: string;
  /** Materials consumed per unit sold — deducted from inventory on checkout. */
  consumes: { materialId: string; qty: number }[];
  stockQty?: number;
  /** Output counted on production equipment (punching machine etc.) — reconciled vs machine counters. */
  machineTracked?: boolean;
  /** Charges the configured notary fee per unit sold. */
  notaryFee?: boolean;
  isActive: boolean;
}

export type StockUnit = 'piece' | 'carton' | 'bundle' | 'roll' | 'liter' | 'pack' | 'sheet';

export interface Material {
  id: string;
  code: string;
  name: string;
  unit: StockUnit;
  /** Total on hand across branches — kept equal to sum(stockByBranch). */
  stockQty: number;
  /** Per-branch breakdown. Absent on legacy data = all stock at the main branch. */
  stockByBranch?: Record<string, number>;
  minStockLevel: number;
  costPerUnit: number;
  /** Unit conversion: how many `unit` make one `packUnit` (e.g. 500 sheets → 1 ream). */
  unitsPerPack?: number;
  packUnit?: string;
}

export type MembershipTier = 'none' | 'silver' | 'gold' | 'platinum';

export interface Customer {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  tier: MembershipTier;
  loyaltyPoints: number;
  lifetimeSpend: number;
  isSeniorCitizen: boolean;
  isPwd: boolean;
  discountId?: string;
}

export type LineKind = 'product' | 'service';

export interface CartLine {
  id: string;
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  /** For area-priced lines. */
  area?: { width: number; height: number; unit: string; rate: number };
  /** Staff member who produces/serves the line. */
  handlerId?: string;
  discountPct?: number;
}

export type DiscountKind = 'none' | 'senior' | 'pwd' | 'promo' | 'manual';

export interface CartDiscount {
  kind: DiscountKind;
  /** Percent off for manual/promo discounts (0–100). */
  pct?: number;
  /** Flat peso amount off (promo vouchers, BXGY free-item value). */
  amountOff?: number;
  label?: string;
  /** Promo that produced this discount, for usage tracking. */
  promoId?: string;
}

export type PromotionType = 'percent' | 'amount' | 'bxgy';

export interface Promotion {
  id: string;
  code: string;
  name: string;
  type: PromotionType;
  /** percent → % off sale; amount → pesos off; bxgy → see buy/get. */
  pct?: number;
  amount?: number;
  /** bxgy: buy `buyQty` of `productId`, get `getQty` free. */
  buyQty?: number;
  getQty?: number;
  productId?: string;
  minSpend?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
}

export type PaymentMethod = 'cash' | 'card' | 'gcash' | 'maya';

export type SaleStatus = 'completed' | 'voided' | 'refunded';

export interface Sale {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  cashierName: string;
  /** Staff id of the cashier, when signed in via staff account/PIN. */
  cashierId?: string;
  branchId: string;
  branchName: string;
  customerName?: string;
  lines: {
    productId?: string;
    name: string;
    qty: number;
    unitPrice: number;
    total: number;
    handlerId?: string;
    handlerName?: string;
  }[];
  subtotal: number;
  discountTotal: number;
  vatExempt: boolean;
  taxTotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  change: number;
  pointsEarned: number;
  /** Surcharges added to the sale (e.g. ₱1 notary fee). */
  fees?: { label: string; amount: number }[];
  status: SaleStatus;
  voidReason?: string;
  authorizedBy?: string;
}

export interface StoreSettings {
  storeName: string;
  tin: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  receiptFooter: string;
  vatRate: number;
  seniorPwdDiscountPct: number;
  loyaltyEarnRate: number; // points per peso
  loyaltyRedeemValue: number; // peso per point
  supervisorPin: string;
  /** Idle minutes before the register locks itself (0 = never). */
  autoLockMinutes: number;
  /** Default notary fee charged on notarized documents (₱). */
  notaryFee: number;
}

// ─── Inventory movement ledger ────────────────────────────────────────────────

export type MovementKind =
  | 'opening'
  | 'received'
  | 'consumed'
  | 'transfer_out'
  | 'transfer_in'
  | 'adjustment'
  | 'waste'
  | 'count_correction'
  | 'void_reversal';

/** One row per stock event — the audit spine for inventory. */
export interface StockMovement {
  id: string;
  materialId: string;
  branchId: string;
  kind: MovementKind;
  /** Signed quantity — positive in, negative out. */
  qty: number;
  reason: string;
  /** Sale id / transfer id / stock-count id this movement belongs to. */
  refId?: string;
  employeeId: string;
  employeeName: string;
  createdAt: string;
}

// ─── Punching & production accountability ─────────────────────────────────────

export type PunchStatus = 'open' | 'completed' | 'flagged';

/** A job run through a punching machine or other production equipment. */
export interface PunchRecord {
  id: string;
  /** Unique job-ticket code — scannable, prevents double counting. */
  ticketCode: string;
  branchId: string;
  employeeId: string;
  employeeName: string;
  serviceType: string;
  productId?: string;
  saleId?: string;
  qty: number;
  damagedQty: number;
  reprocessedQty: number;
  status: PunchStatus;
  createdAt: string;
  completedAt?: string;
  /** Corrections need a documented reason + supervisor. */
  correction?: { reason: string; approvedBy: string; at: string };
}

/** Opening/closing reading of a machine's physical counter, per shift. */
export interface CounterReading {
  id: string;
  branchId: string;
  machine: string;
  kind: 'open' | 'close';
  reading: number;
  employeeId: string;
  employeeName: string;
  shiftDate: string; // YYYY-MM-DD
  createdAt: string;
}

// ─── HR, attendance & payroll ─────────────────────────────────────────────────

export type EmploymentStatus = 'active' | 'on_leave' | 'resigned';
export type SalaryType = 'monthly' | 'daily' | 'hourly';

/** Payroll/HR details attached to a User — not a duplicate account. */
export interface EmployeeProfile {
  userId: string;
  position: string;
  status: EmploymentStatus;
  hiredAt: string; // ISO date
  salaryType: SalaryType;
  /** monthly → ₱/month, daily → ₱/day, hourly → ₱/hour. */
  rate: number;
  allowances: number;
  deductions: number;
  /** Multiplier for overtime hours. */
  overtimeRate?: number;
}

export type LeaveType = 'vacation' | 'sick' | 'paid' | 'unpaid';

export interface AttendanceRecord {
  id: string;
  userId: string;
  branchId: string;
  /** YYYY-MM-DD. */
  date: string;
  clockIn?: string; // ISO datetime
  clockOut?: string;
  leaveType?: LeaveType;
  leaveApprovedBy?: string;
  notes?: string;
}

export type PayrollStatus = 'draft' | 'reviewed' | 'approved' | 'paid';

export interface Payslip {
  userId: string;
  employeeName: string;
  daysWorked: number;
  hoursWorked: number;
  overtimeHrs: number;
  paidLeaveDays: number;
  gross: number;
  overtimePay: number;
  allowances: number;
  deductions: number;
  net: number;
}

export interface PayrollRun {
  id: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  status: PayrollStatus;
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  approvedBy?: string;
  paidAt?: string;
  slips: Payslip[];
}

// ─── Audit trail ──────────────────────────────────────────────────────────────

/** Append-only record of sensitive actions. */
export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId?: string;
  detail?: string;
  branchId?: string;
}
