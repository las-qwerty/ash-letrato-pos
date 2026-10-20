'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { hashPin } from './pin';
import {
  computePayslip,
  materializeStock,
  moveStock,
  seed,
  tierForSpend,
  type AttendanceRecord,
  type AuditEntry,
  type Branch,
  type Category,
  type CounterReading,
  type Customer,
  type EmployeeProfile,
  type LeaveType,
  type Material,
  type MovementKind,
  type PayrollRun,
  type Product,
  type Promotion,
  type PunchRecord,
  type Sale,
  type StockMovement,
  type StoreSettings,
  type User,
} from '@simmy/core';

/**
 * Local data store — stands in for the REST API in demo mode.
 * Swap these calls for @simmy/api-client when connecting a live backend.
 */

/** Who performed an inventory/production action — written into movements + audit. */
interface Actor {
  employeeId: string;
  employeeName: string;
  branchId: string;
}

interface DataState {
  users: User[];
  branches: Branch[];
  categories: Category[];
  products: Product[];
  materials: Material[];
  customers: Customer[];
  sales: Sale[];
  promotions: Promotion[];
  settings: StoreSettings;
  stockMovements: StockMovement[];
  punchRecords: PunchRecord[];
  counterReadings: CounterReading[];
  employeeProfiles: EmployeeProfile[];
  attendance: AttendanceRecord[];
  payrollRuns: PayrollRun[];
  auditLog: AuditEntry[];

  currentUser: User | null;
  /** Register is locked — app routes bounce to /lock until a staff PIN unlocks. */
  locked: boolean;
  /** Per-user failed-PIN tracking — persisted so refresh can't reset the lockout. */
  pinFailures: Record<string, { count: number; until: number }>;
  /** Owner's branch view — 'all' shows the whole business. Staff are always
   *  pinned to their own `branchId`; this is ignored for them. */
  viewBranchId: 'all' | string;
  setViewBranch: (id: 'all' | string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  lock: () => void;
  /** Verify a staff PIN; on success that person becomes the signed-in user. */
  unlock: (userId: string, pin: string) => Promise<boolean>;
  /** Verify any staff member's PIN without signing in (supervisor prompts). */
  verifyPin: (userId: string, pin: string) => Promise<boolean>;

  recordSale: (sale: Sale, promoId?: string) => void;
  voidSale: (id: string, reason: string, authorizedBy: string) => void;
  refundSale: (id: string, reason: string, authorizedBy: string) => void;

  restockMaterial: (id: string, qty: number, actor?: Actor) => void;
  adjustMaterial: (id: string, qty: number, reason: string, actor?: Actor, kind?: 'adjustment' | 'waste') => void;
  /** Bulk-apply a physical stock count: map of materialId → counted qty. */
  applyStockCount: (counts: Record<string, number>, actor?: Actor) => void;
  /** Move stock between branches. Returns false on bad input or insufficient source stock. */
  transferMaterial: (id: string, qty: number, fromBranchId: string, toBranchId: string, reason: string, actor?: Actor) => boolean;
  /** Append to the audit trail (sensitive actions). */
  logAudit: (entry: Omit<AuditEntry, 'id' | 'at'>) => void;

  /** Open a production job ticket. Errors on duplicate ticket code. */
  addPunchRecord: (r: Omit<PunchRecord, 'id' | 'createdAt' | 'status'>) => string | null;
  /** Finish a ticket with actual counts. */
  completePunchRecord: (id: string, counts: { qty: number; damagedQty: number; reprocessedQty: number }) => void;
  /** Mark a ticket for investigation (unexplained variance). */
  flagPunchRecord: (id: string, reason: string, actor?: Actor) => void;
  /** Supervisor-approved correction with documented reason. */
  correctPunchRecord: (id: string, patch: { qty: number; damagedQty: number; reprocessedQty: number }, reason: string, approvedBy: string) => void;
  /** Log a machine counter reading (open or close of shift). */
  addCounterReading: (r: Omit<CounterReading, 'id' | 'createdAt'>) => void;

  /** Create or update an employee's HR profile (position, rate, status). */
  upsertEmployeeProfile: (p: EmployeeProfile) => void;
  /** Clock a staff member in for today. Error string on duplicate/missing profile. */
  clockIn: (userId: string, branchId: string) => string | null;
  /** Clock a staff member out of today's open record. Error if not clocked in. */
  clockOut: (userId: string) => string | null;
  /** Record a leave day — needs an approver name for paid leave. */
  recordLeave: (userId: string, branchId: string, date: string, leaveType: LeaveType, approver: string, notes?: string) => void;
  /** Build a payroll run from attendance in [periodStart, periodEnd]. Error if the range overlaps an existing run. */
  createPayrollRun: (periodStart: string, periodEnd: string, createdBy: string) => string | null;
  /** draft → reviewed → approved → paid. Approving/paying writes an audit entry. */
  advancePayroll: (id: string, to: 'reviewed' | 'approved' | 'paid', by: string) => void;

  upsertProduct: (p: Product) => void;
  upsertCustomer: (c: Customer) => void;
  upsertUser: (u: User) => void;
  upsertPromotion: (p: Promotion) => void;
  upsertCategory: (c: Category) => void;
  /** Only removes categories not referenced by any product. Returns success. */
  deleteCategory: (id: string) => boolean;
  upsertBranch: (b: Branch) => void;
  updateSettings: (patch: Partial<StoreSettings>) => void;
  /** Restore everything to seed data (demo resets). */
  resetDemo: () => void;
  /** Serialize all business data into a portable backup payload. */
  exportData: () => BackupPayload;
  /** Validate + load a backup from exportData. Returns an error message, or null on success. */
  importData: (raw: unknown) => string | null;
}

const BACKUP_KEYS = [
  'users',
  'branches',
  'categories',
  'products',
  'materials',
  'customers',
  'sales',
  'promotions',
] as const;

/** Newer collections — optional on import so pre-v3 backups still load. */
const OPTIONAL_KEYS = [
  'stockMovements',
  'punchRecords',
  'counterReadings',
  'employeeProfiles',
  'attendance',
  'payrollRuns',
  'auditLog',
] as const;

interface BackupPayload {
  app: 'ash-letrato-pos';
  version: number;
  exportedAt: string;
  data: Pick<DataState, (typeof BACKUP_KEYS)[number] | (typeof OPTIONAL_KEYS)[number] | 'settings'>;
}

export const useStore = create<DataState>()(
  persist(
    (set, get) => ({
      users: seed.users,
      branches: seed.branches,
      categories: seed.categories,
      products: seed.products,
      materials: seed.materials,
      customers: seed.customers,
      sales: seed.sales,
      promotions: seed.promotions,
      settings: seed.settings,
      stockMovements: seed.stockMovements,
      punchRecords: seed.punchRecords,
      counterReadings: seed.counterReadings,
      employeeProfiles: seed.employeeProfiles,
      attendance: seed.attendance,
      payrollRuns: seed.payrollRuns,
      auditLog: seed.auditLog,

      currentUser: null,
      locked: false,
      pinFailures: {},
      viewBranchId: 'all',
      setViewBranch: (id) => set({ viewBranchId: id }),
      login: async (email, password) => {
        const e = email.trim().toLowerCase();
        if (e === seed.demoCredentials.email && password === seed.demoCredentials.password) {
          // Recovery/demo login — always lands on an actual owner account, not
          // blindly users[0] (which an import could have reshuffled).
          const owner = get().users.find((u) => u.role === 'super_admin') ?? null;
          if (!owner) return false;
          set({ currentUser: owner, locked: false });
          return true;
        }
        // Staff sign in with their own email + register PIN.
        const user = get().users.find((u) => u.email.toLowerCase() === e);
        if (user && (await get().verifyPin(user.id, password))) {
          set({ currentUser: user, locked: false });
          return true;
        }
        return false;
      },
      logout: () => set({ currentUser: null, locked: false }),
      lock: () => set({ locked: true }),
      unlock: async (userId, pin) => {
        const ok = await get().verifyPin(userId, pin);
        if (ok) {
          const user = get().users.find((u) => u.id === userId) ?? null;
          set({ currentUser: user, locked: false });
        }
        return ok;
      },
      verifyPin: async (userId, pin) => {
        const user = get().users.find((u) => u.id === userId);
        if (!user) return false;
        // Store-level throttle — protects every PIN gate (unlock, supervisor
        // prompts for voids/refunds/payroll/corrections), survives remounts and
        // refresh because failures persist. Every 5th failure locks for an
        // escalating 30s → 60s → 120s… capped at 15 min.
        const fails = get().pinFailures[userId];
        if (fails?.until && fails.until > Date.now()) return false;
        const note = (ok: boolean) => {
          set((s) => {
            const prev = s.pinFailures[userId];
            if (ok) {
              const rest = { ...s.pinFailures };
              delete rest[userId];
              return { pinFailures: rest };
            }
            const count = (prev?.count ?? 0) + 1;
            const lockout = Math.floor(count / 5);
            const until =
              count % 5 === 0
                ? Date.now() + Math.min(30_000 * 2 ** (lockout - 1), 15 * 60_000)
                : prev?.until ?? 0;
            return { pinFailures: { ...s.pinFailures, [userId]: { count, until } } };
          });
          return ok;
        };
        if (user.pinHash) return note((await hashPin(pin)) === user.pinHash);
        // First verify of a seeded plaintext PIN: upgrade to a hash on success.
        if (user.pin === pin) {
          const pinHash = await hashPin(pin);
          set((s) => ({
            users: s.users.map((u) =>
              u.id === userId ? { ...u, pinHash, pin: '' } : u,
            ),
          }));
          return note(true);
        }
        return note(false);
      },

      recordSale: (sale, promoId) =>
        set((s) => {
          const main = s.branches[0]?.id ?? '';
          const moves: StockMovement[] = [];
          const materials = s.materials.map((m) => {
            const used = sale.lines.reduce((acc, line) => {
              const product = line.productId
                ? s.products.find((p) => p.id === line.productId)
                : undefined;
              const recipe = product?.consumes.find((c) => c.materialId === m.id);
              return acc + (recipe ? recipe.qty * line.qty : 0);
            }, 0);
            if (!used) return m;
            moves.push({
              id: `mv-${Date.now()}-${m.id}-${Math.random().toString(36).slice(2, 7)}`,
              materialId: m.id,
              branchId: sale.branchId || main,
              kind: 'consumed',
              qty: -used,
              reason: `Sale ${sale.invoiceNumber}`,
              refId: sale.id,
              employeeId: sale.cashierId ?? '',
              employeeName: sale.cashierName,
              createdAt: sale.createdAt,
            });
            return moveStock(m, sale.branchId || main, -used, main);
          });
          return {
            sales: [sale, ...s.sales],
            stockMovements: [...moves, ...s.stockMovements],
            promotions: promoId
              ? s.promotions.map((p) =>
                  p.id === promoId ? { ...p, usageCount: p.usageCount + 1 } : p,
                )
              : s.promotions,
            materials,
          products: s.products.map((p) =>
            p.pricing === 'fixed' && p.stockQty != null
              ? {
                  ...p,
                  stockQty: Math.max(
                    0,
                    p.stockQty -
                      sale.lines
                        .filter((l) => l.productId === p.id)
                        .reduce((a, l) => a + l.qty, 0),
                  ),
                }
              : p,
          ),
          customers: s.customers.map((c) =>
            sale.customerName === `${c.firstName} ${c.lastName}`
              ? {
                  ...c,
                  lifetimeSpend: c.lifetimeSpend + sale.total,
                  loyaltyPoints: c.loyaltyPoints + sale.pointsEarned,
                  tier: tierForSpend(c.lifetimeSpend + sale.total),
                }
              : c,
          ),
          };
        }),

      voidSale: (id, reason, authorizedBy) =>
        set((s) => {
          const sale = s.sales.find((x) => x.id === id);
          if (!sale || sale.status !== 'completed') return s;
          const main = s.branches[0]?.id ?? '';
          const moves: StockMovement[] = [];
          // A void never happened: restore stock, materials, spend, and points.
          const materials = s.materials.map((m) => {
            const restore = sale.lines.reduce((acc, line) => {
              const product = line.productId
                ? s.products.find((p) => p.id === line.productId)
                : undefined;
              const recipe = product?.consumes.find((c) => c.materialId === m.id);
              return acc + (recipe ? recipe.qty * line.qty : 0);
            }, 0);
            if (!restore) return m;
            moves.push({
              id: `mv-${Date.now()}-${m.id}-${Math.random().toString(36).slice(2, 7)}`,
              materialId: m.id,
              branchId: sale.branchId || main,
              kind: 'void_reversal',
              qty: restore,
              reason: `Void ${sale.invoiceNumber} — ${reason}`,
              refId: sale.id,
              employeeId: '',
              employeeName: authorizedBy,
              createdAt: new Date().toISOString(),
            });
            return moveStock(m, sale.branchId || main, restore, main);
          });
          return {
            sales: s.sales.map((x) =>
              x.id === id ? { ...x, status: 'voided', voidReason: reason, authorizedBy } : x,
            ),
            stockMovements: [...moves, ...s.stockMovements],
            auditLog: [
              {
                id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                at: new Date().toISOString(),
                actorId: '',
                actorName: authorizedBy,
                action: 'void_sale',
                entity: 'sale',
                entityId: id,
                detail: `${sale.invoiceNumber} — ${reason}`,
                branchId: sale.branchId,
              },
              ...s.auditLog,
            ],
            materials,
            products: s.products.map((p) =>
              p.pricing === 'fixed' && p.stockQty != null
                ? {
                    ...p,
                    stockQty:
                      p.stockQty +
                      sale.lines
                        .filter((l) => l.productId === p.id)
                        .reduce((a, l) => a + l.qty, 0),
                  }
                : p,
            ),
            customers: s.customers.map((c) =>
              sale.customerName === `${c.firstName} ${c.lastName}`
                ? {
                    ...c,
                    lifetimeSpend: Math.max(0, c.lifetimeSpend - sale.total),
                    loyaltyPoints: Math.max(0, c.loyaltyPoints - sale.pointsEarned),
                    tier: tierForSpend(Math.max(0, c.lifetimeSpend - sale.total)),
                  }
                : c,
            ),
          };
        }),

      refundSale: (id, reason, authorizedBy) =>
        set((s) => {
          const sale = s.sales.find((x) => x.id === id);
          if (!sale || sale.status !== 'completed') return s;
          const main = s.branches[0]?.id ?? '';
          const moves: StockMovement[] = [];
          // Returned goods come back into stock — same restoration as voidSale.
          const materials = s.materials.map((m) => {
            const restore = sale.lines.reduce((acc, line) => {
              const product = line.productId
                ? s.products.find((p) => p.id === line.productId)
                : undefined;
              const recipe = product?.consumes.find((c) => c.materialId === m.id);
              return acc + (recipe ? recipe.qty * line.qty : 0);
            }, 0);
            if (!restore) return m;
            moves.push({
              id: `mv-${Date.now()}-${m.id}-${Math.random().toString(36).slice(2, 7)}`,
              materialId: m.id,
              branchId: sale.branchId || main,
              kind: 'void_reversal',
              qty: restore,
              reason: `Refund ${sale.invoiceNumber} — ${reason}`,
              refId: sale.id,
              employeeId: '',
              employeeName: authorizedBy,
              createdAt: new Date().toISOString(),
            });
            return moveStock(m, sale.branchId || main, restore, main);
          });
          return {
            sales: s.sales.map((x) =>
              x.id === id ? { ...x, status: 'refunded', voidReason: reason, authorizedBy } : x,
            ),
            stockMovements: [...moves, ...s.stockMovements],
            auditLog: [
              {
                id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                at: new Date().toISOString(),
                actorId: '',
                actorName: authorizedBy,
                action: 'refund_sale',
                entity: 'sale',
                entityId: id,
                detail: `${sale.invoiceNumber} — ${reason}`,
                branchId: sale.branchId,
              },
              ...s.auditLog,
            ],
            materials,
            products: s.products.map((p) =>
              p.pricing === 'fixed' && p.stockQty != null
                ? {
                    ...p,
                    stockQty:
                      p.stockQty +
                      sale.lines
                        .filter((l) => l.productId === p.id)
                        .reduce((a, l) => a + l.qty, 0),
                  }
                : p,
            ),
            customers: s.customers.map((c) =>
              sale.customerName === `${c.firstName} ${c.lastName}`
                ? {
                    ...c,
                    lifetimeSpend: Math.max(0, c.lifetimeSpend - sale.total),
                    loyaltyPoints: Math.max(0, c.loyaltyPoints - sale.pointsEarned),
                    tier: tierForSpend(Math.max(0, c.lifetimeSpend - sale.total)),
                  }
                : c,
            ),
          };
        }),

      restockMaterial: (id, qty, actor) =>
        set((s) => {
          if (!Number.isFinite(qty) || qty <= 0) return s;
          const main = s.branches[0]?.id ?? '';
          const a = actor ?? { employeeId: '', employeeName: 'System', branchId: main };
          return {
            materials: s.materials.map((m) =>
              m.id === id ? moveStock(m, a.branchId, qty, main) : m,
            ),
            stockMovements: [
              {
                id: `mv-${Date.now()}-${id}-${Math.random().toString(36).slice(2, 7)}`,
                materialId: id,
                branchId: a.branchId,
                kind: 'received',
                qty,
                reason: 'Restock / supplier delivery',
                employeeId: a.employeeId,
                employeeName: a.employeeName,
                createdAt: new Date().toISOString(),
              },
              ...s.stockMovements,
            ],
          };
        }),

      adjustMaterial: (id, qty, reason, actor, kind = 'adjustment') =>
        set((s) => {
          if (!Number.isFinite(qty) || qty === 0) return s;
          const main = s.branches[0]?.id ?? '';
          const a = actor ?? { employeeId: '', employeeName: 'System', branchId: main };
          return {
            materials: s.materials.map((m) =>
              m.id === id ? moveStock(m, a.branchId, qty, main) : m,
            ),
            stockMovements: [
              {
                id: `mv-${Date.now()}-${id}-${Math.random().toString(36).slice(2, 7)}`,
                materialId: id,
                branchId: a.branchId,
                kind: kind as MovementKind,
                qty,
                reason: reason || (kind === 'waste' ? 'Damaged / waste' : 'Manual adjustment'),
                employeeId: a.employeeId,
                employeeName: a.employeeName,
                createdAt: new Date().toISOString(),
              },
              ...s.stockMovements,
            ],
            auditLog: [
              {
                id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                at: new Date().toISOString(),
                actorId: a.employeeId,
                actorName: a.employeeName,
                action: kind === 'waste' ? 'waste_material' : 'adjust_material',
                entity: 'material',
                entityId: id,
                detail: `${qty > 0 ? '+' : ''}${qty} — ${reason}`,
                branchId: a.branchId,
              },
              ...s.auditLog,
            ],
          };
        }),

      applyStockCount: (counts, actor) =>
        set((s) => {
          const main = s.branches[0]?.id ?? '';
          const a = actor ?? { employeeId: '', employeeName: 'System', branchId: main };
          const moves: StockMovement[] = [];
          const materials = s.materials.map((m) => {
            const counted = counts[m.id];
            if (counted == null) return m;
            const mm = materializeStock(m, main);
            const prevAt = mm.stockByBranch![a.branchId] ?? 0;
            const next = Math.max(0, counted);
            const diff = next - prevAt;
            if (diff === 0) return mm;
            moves.push({
              id: `mv-${Date.now()}-${m.id}-${Math.random().toString(36).slice(2, 7)}`,
              materialId: m.id,
              branchId: a.branchId,
              kind: 'count_correction',
              qty: diff,
              reason: `Physical count ${prevAt} → ${next}`,
              employeeId: a.employeeId,
              employeeName: a.employeeName,
              createdAt: new Date().toISOString(),
            });
            const stockByBranch = { ...mm.stockByBranch, [a.branchId]: next };
            return { ...mm, stockByBranch, stockQty: Object.values(stockByBranch).reduce((x, n) => x + n, 0) };
          });
          return { materials, stockMovements: [...moves, ...s.stockMovements] };
        }),

      transferMaterial: (id, qty, fromBranchId, toBranchId, reason, actor) => {
        if (!Number.isFinite(qty) || qty <= 0 || fromBranchId === toBranchId) return false;
        const s = get();
        const main = s.branches[0]?.id ?? '';
        const src = s.materials.find((m) => m.id === id);
        if (!src) return false;
        const srcAt = materializeStock(src, main).stockByBranch![fromBranchId] ?? 0;
        if (srcAt < qty) return false;
        const a = actor ?? { employeeId: '', employeeName: 'System', branchId: fromBranchId };
        const refId = `tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((st) => ({
          materials: st.materials.map((m) =>
            m.id === id ? moveStock(moveStock(m, fromBranchId, -qty, main), toBranchId, qty, main) : m,
          ),
          stockMovements: [
            { id: `mv-${refId}-out`, materialId: id, branchId: fromBranchId, kind: 'transfer_out', qty: -qty, reason, refId, employeeId: a.employeeId, employeeName: a.employeeName, createdAt: new Date().toISOString() },
            { id: `mv-${refId}-in`, materialId: id, branchId: toBranchId, kind: 'transfer_in', qty, reason, refId, employeeId: a.employeeId, employeeName: a.employeeName, createdAt: new Date().toISOString() },
            ...st.stockMovements,
          ],
          auditLog: [
            { id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), actorId: a.employeeId, actorName: a.employeeName, action: 'transfer_material', entity: 'material', entityId: id, detail: `${qty} ${src.unit} ${fromBranchId} → ${toBranchId} — ${reason}`, branchId: fromBranchId },
            ...st.auditLog,
          ],
        }));
        return true;
      },

      logAudit: (entry) =>
        set((s) => ({
          auditLog: [{ ...entry, id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString() }, ...s.auditLog],
        })),

      addPunchRecord: (r) => {
        if (get().punchRecords.some((p) => p.ticketCode === r.ticketCode)) {
          return 'That ticket code already exists — each job needs a unique code.';
        }
        set((s) => ({
          punchRecords: [
            { ...r, id: `punch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, status: 'open', createdAt: new Date().toISOString() },
            ...s.punchRecords,
          ],
        }));
        return null;
      },

      completePunchRecord: (id, counts) =>
        set((s) => ({
          punchRecords: s.punchRecords.map((p) =>
            p.id === id
              ? { ...p, ...counts, status: 'completed', completedAt: new Date().toISOString() }
              : p,
          ),
        })),

      flagPunchRecord: (id, reason, actor) =>
        set((s) => ({
          punchRecords: s.punchRecords.map((p) =>
            p.id === id ? { ...p, status: 'flagged' } : p,
          ),
          auditLog: [
            {
              id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              at: new Date().toISOString(),
              actorId: actor?.employeeId ?? '',
              actorName: actor?.employeeName ?? 'System',
              action: 'flag_punch_record',
              entity: 'punchRecord',
              entityId: id,
              detail: reason,
              branchId: actor?.branchId,
            },
            ...s.auditLog,
          ],
        })),

      correctPunchRecord: (id, patch, reason, approvedBy) =>
        set((s) => ({
          punchRecords: s.punchRecords.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  status: 'completed',
                  correction: { reason, approvedBy, at: new Date().toISOString() },
                }
              : p,
          ),
          auditLog: [
            {
              id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              at: new Date().toISOString(),
              actorId: '',
              actorName: approvedBy,
              action: 'correct_punch_record',
              entity: 'punchRecord',
              entityId: id,
              detail: reason,
            },
            ...s.auditLog,
          ],
        })),

      addCounterReading: (r) =>
        set((s) => ({
          counterReadings: [
            { ...r, id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString() },
            ...s.counterReadings,
          ],
        })),

      upsertEmployeeProfile: (p) =>
        set((s) => ({
          employeeProfiles: s.employeeProfiles.some((x) => x.userId === p.userId)
            ? s.employeeProfiles.map((x) => (x.userId === p.userId ? p : x))
            : [...s.employeeProfiles, p],
        })),

      clockIn: (userId, branchId) => {
        const today = new Date().toISOString().slice(0, 10);
        const existing = get().attendance.find((r) => r.userId === userId && r.date === today);
        if (existing?.clockIn && !existing.clockOut) return 'Already clocked in — clock out first.';
        if (existing?.clockOut) return 'Already completed a shift today.';
        set((s) => ({
          attendance: [
            {
              id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              userId,
              branchId,
              date: today,
              clockIn: new Date().toISOString(),
            },
            ...s.attendance,
          ],
        }));
        return null;
      },

      clockOut: (userId) => {
        const today = new Date().toISOString().slice(0, 10);
        const rec = get().attendance.find((r) => r.userId === userId && r.date === today);
        if (!rec?.clockIn) return 'Not clocked in today.';
        if (rec.clockOut) return 'Already clocked out.';
        set((s) => ({
          attendance: s.attendance.map((r) =>
            r.id === rec.id ? { ...r, clockOut: new Date().toISOString() } : r,
          ),
        }));
        return null;
      },

      recordLeave: (userId, branchId, date, leaveType, approver, notes) =>
        set((s) => ({
          attendance: [
            {
              id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              userId,
              branchId,
              date,
              leaveType,
              leaveApprovedBy: approver || undefined,
              notes,
            },
            ...s.attendance.filter((r) => !(r.userId === userId && r.date === date)),
          ],
        })),

      createPayrollRun: (periodStart, periodEnd, createdBy) => {
        const s = get();
        if (!periodStart || !periodEnd || periodEnd < periodStart) return 'Pick a valid period.';
        if (
          s.payrollRuns.some(
            (r) => r.status !== 'paid' && periodStart <= r.periodEnd && periodEnd >= r.periodStart,
          )
        ) {
          return 'An open payroll run already covers part of that period.';
        }
        const slips = s.employeeProfiles
          .filter((p) => p.status === 'active')
          .map((p) => ({
            ...computePayslip(p, s.attendance, periodStart, periodEnd),
            employeeName:
              s.users.find((u) => u.id === p.userId)
                ? `${s.users.find((u) => u.id === p.userId)!.firstName} ${s.users.find((u) => u.id === p.userId)!.lastName}`
                : p.userId,
          }));
        set((st) => ({
          payrollRuns: [
            {
              id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              periodStart,
              periodEnd,
              status: 'draft',
              createdBy,
              createdAt: new Date().toISOString(),
              slips,
            },
            ...st.payrollRuns,
          ],
        }));
        return null;
      },

      advancePayroll: (id, to, by) =>
        set((s) => ({
          payrollRuns: s.payrollRuns.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: to,
                  reviewedBy: to === 'reviewed' ? by : r.reviewedBy,
                  approvedBy: to === 'approved' ? by : r.approvedBy,
                  paidAt: to === 'paid' ? new Date().toISOString() : r.paidAt,
                }
              : r,
          ),
          auditLog: [
            {
              id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              at: new Date().toISOString(),
              actorId: '',
              actorName: by,
              action: `payroll_${to}`,
              entity: 'payrollRun',
              entityId: id,
            },
            ...s.auditLog,
          ],
        })),

      upsertUser: (u) => {
        // Hash a freshly-set PIN before persisting; keep existing hash otherwise.
        const hashAndStore = async () => {
          const toStore = u.pin ? { ...u, pinHash: await hashPin(u.pin), pin: '' } : u;
          set((s) => ({
            users: s.users.some((x) => x.id === toStore.id)
              ? s.users.map((x) => (x.id === toStore.id ? toStore : x))
              : [...s.users, toStore],
          }));
        };
        void hashAndStore();
      },

      upsertPromotion: (p) =>
        set((s) => ({
          promotions: s.promotions.some((x) => x.id === p.id)
            ? s.promotions.map((x) => (x.id === p.id ? p : x))
            : [...s.promotions, p],
        })),

      upsertCategory: (c) =>
        set((s) => ({
          categories: s.categories.some((x) => x.id === c.id)
            ? s.categories.map((x) => (x.id === c.id ? c : x))
            : [...s.categories, c],
        })),

      deleteCategory: (id) => {
        if (get().products.some((p) => p.categoryId === id)) return false;
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
        return true;
      },

      upsertBranch: (b) =>
        set((s) => ({
          branches: s.branches.some((x) => x.id === b.id)
            ? s.branches.map((x) => (x.id === b.id ? b : x))
            : [...s.branches, b],
        })),

      resetDemo: () =>
        set({
          users: seed.users,
          branches: seed.branches,
          categories: seed.categories,
          products: seed.products,
          materials: seed.materials,
          customers: seed.customers,
          sales: seed.sales,
          promotions: seed.promotions,
          settings: seed.settings,
          stockMovements: seed.stockMovements,
          punchRecords: seed.punchRecords,
          counterReadings: seed.counterReadings,
          employeeProfiles: seed.employeeProfiles,
          attendance: seed.attendance,
          payrollRuns: seed.payrollRuns,
          auditLog: seed.auditLog,
          pinFailures: {},
          locked: false,
        }),

      upsertProduct: (p) =>
        set((s) => ({
          products: s.products.some((x) => x.id === p.id)
            ? s.products.map((x) => (x.id === p.id ? p : x))
            : [...s.products, p],
        })),

      upsertCustomer: (c) =>
        set((s) => ({
          customers: s.customers.some((x) => x.id === c.id)
            ? s.customers.map((x) => (x.id === c.id ? c : x))
            : [...s.customers, c],
        })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      exportData: () => {
        const s = get();
        return {
          app: 'ash-letrato-pos',
          version: 2,
          exportedAt: new Date().toISOString(),
          data: {
            users: s.users,
            branches: s.branches,
            categories: s.categories,
            products: s.products,
            materials: s.materials,
            customers: s.customers,
            sales: s.sales,
            promotions: s.promotions,
            settings: s.settings,
            stockMovements: s.stockMovements,
            punchRecords: s.punchRecords,
            counterReadings: s.counterReadings,
            employeeProfiles: s.employeeProfiles,
            attendance: s.attendance,
            payrollRuns: s.payrollRuns,
            auditLog: s.auditLog,
          },
        };
      },

      importData: (raw) => {
        try {
          if (!raw || typeof raw !== 'object') return 'That file is not a valid backup.';
          const data = (raw as { data?: unknown }).data;
          if (!data || typeof data !== 'object')
            return 'Backup file is missing its data block — use a file exported from ASH LETRATO POS.';
          const d = data as Record<string, unknown>;
          for (const k of BACKUP_KEYS) {
            if (!Array.isArray(d[k])) return `Backup is incomplete — "${k}" data is missing.`;
          }
          if (!d.settings || typeof d.settings !== 'object')
            return 'Backup is incomplete — settings are missing.';
          // Optional collections: accept when present, seed defaults otherwise.
          const extra = {} as Pick<DataState, (typeof OPTIONAL_KEYS)[number]>;
          for (const k of OPTIONAL_KEYS) {
            (extra as Record<string, unknown>)[k] = Array.isArray(d[k])
              ? d[k]
              : (seed as unknown as Record<string, unknown>)[k];
          }
          // Same normalization as the v1→v2 migration so old backups stay valid.
          const users = (d.users as User[]).map((u) => ({
            ...u,
            email: String(u.email ?? '').replace(/@simmy\.co$/i, '@ashletrato.com'),
          }));
          if (!users.every((u) => u.id && u.email))
            return 'Backup is corrupted — a staff record is missing its id or email.';
          const products = (d.products as Product[]).map((p) => ({
            ...p,
            kind: p.kind ?? (p.sku?.startsWith('SRV-') ? 'service' : 'product'),
          }));
          const cur = get().currentUser;
          set({
            users,
            products,
            branches: d.branches as Branch[],
            categories: d.categories as Category[],
            materials: d.materials as Material[],
            customers: d.customers as Customer[],
            sales: d.sales as Sale[],
            promotions: d.promotions as Promotion[],
            // Merge over seed defaults so a partial/old settings object can't
            // leave required keys (notaryFee, tax rates…) undefined downstream.
            settings: { ...seed.settings, ...(d.settings as Partial<StoreSettings>) },
            ...extra,
            pinFailures: {},
            currentUser: cur && users.some((u) => u.id === cur.id) ? cur : null,
            locked: false,
          });
          return null;
        } catch {
          return 'Backup could not be read — the file looks corrupted.';
        }
      },
    }),
    {
      name: 'simmy-pos',
      version: 4,
      // v1 → v2: rebrand + product/service split. Normalize old installs so
      // stored staff emails and untyped products keep working without a reset.
      // v2 → v3: branch-attributed sales + enterprise entities (ledger, HR).
      // v3 → v4: receipt paper-width setting.
      migrate: (persisted, version) => {
        const s = persisted as Partial<DataState>;
        if (version < 2 && s) {
          if (Array.isArray(s.users)) {
            s.users = s.users.map((u) => ({
              ...u,
              email: String(u.email ?? '').replace(/@simmy\.co$/i, '@ashletrato.com'),
            }));
          }
          if (Array.isArray(s.products)) {
            s.products = s.products.map((p) => ({
              ...p,
              kind: p.kind ?? (p.sku?.startsWith('SRV-') ? 'service' : 'product'),
            }));
          }
        }
        if (version < 3 && s) {
          const mainBranch = s.branches?.[0]?.id ?? '';
          if (Array.isArray(s.sales)) {
            s.sales = s.sales.map((sale) => ({
              ...sale,
              branchId:
                sale.branchId ??
                s.branches?.find((b) => b.name === sale.branchName)?.id ??
                mainBranch,
            }));
          }
          if (s.settings && s.settings.notaryFee == null) {
            s.settings = { ...s.settings, notaryFee: 1 };
          }
        }
        if (s.settings && s.settings.receiptWidthMm == null) {
          s.settings = { ...s.settings, receiptWidthMm: 80 };
        }
        // Refresh default footers to the current wording — leave custom text alone.
        if (
          s.settings &&
          ['Thank you! This serves as your sales invoice.',
            'Thank you! This does not serve as invoice.',
            'Thank you! This does not serve as an invoice',
            'THIS DOES NOT SERVE AS AN INVOICE\nThank you!',
          ].includes(s.settings.receiptFooter)
        ) {
          s.settings = {
            ...s.settings,
            receiptFooter: 'Thank you!\nTHIS DOES NOT SERVE AS AN INVOICE',
          };
        }
        return s;
      },
    },
  ),
);

/**
 * Data-read scope: 'all' when the owner is viewing the whole business, else a
 * branch id. Staff roles are always pinned to their own branch.
 */
export function branchScope(
  s: Pick<DataState, 'currentUser' | 'viewBranchId'>,
): 'all' | string {
  const u = s.currentUser;
  if (!u) return 'all';
  return u.role === 'super_admin' ? s.viewBranchId : u.branchId;
}

/**
 * Concrete branch a record gets written under — the scope when it's a real
 * branch, else the signed-in user's home branch (with a first-branch fallback).
 */
export function activeBranchId(
  s: Pick<DataState, 'currentUser' | 'viewBranchId' | 'branches'>,
): string {
  const scope = branchScope(s);
  const scoped = scope === 'all' ? s.currentUser?.branchId : scope;
  return scoped || s.branches[0]?.id || '';
}

/** React hook for the read scope — re-renders on user/branch-view changes. */
export function useBranchScope(): 'all' | string {
  return useStore((s) => branchScope(s));
}
