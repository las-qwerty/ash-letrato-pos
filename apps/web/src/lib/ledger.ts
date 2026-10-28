import {
  catalogCategories,
  catalogMaterials,
  catalogProducts,
  type Category,
  type Customer,
  type EmployeeProfile,
  type Material,
  type Product,
  type Sale,
  type SaleLine,
  type User,
} from '@simmy/core';

/** A sale belongs to a customer by record id; name matching only covers pre-v5 sales. */
export const isBuyer = (
  c: Pick<Customer, 'id' | 'firstName' | 'lastName'>,
  sale: Pick<Sale, 'customerId' | 'customerName'>,
) => (sale.customerId ? c.id === sale.customerId : sale.customerName === `${c.firstName} ${c.lastName}`);

export interface Usage {
  materialId: string;
  qty: number;
}

/** Exact deductions for one line. Lines saved before v5 only carry the recipe. */
export function lineUsage(line: SaleLine, product: Product | undefined): Usage[] {
  if (line.consumed) return line.consumed;
  if (!product) return [];
  return product.consumes.map((c) => ({ materialId: c.materialId, qty: c.qty * line.qty }));
}

/** Total stock a sale drew, per material. Reversals use the same numbers. */
export function saleUsage(sale: Sale, products: Product[]): Usage[] {
  const totals = new Map<string, number>();
  for (const line of sale.lines) {
    const product = line.productId ? products.find((p) => p.id === line.productId) : undefined;
    for (const u of lineUsage(line, product)) totals.set(u.materialId, (totals.get(u.materialId) ?? 0) + u.qty);
  }
  return [...totals].map(([materialId, qty]) => ({ materialId, qty })).filter((u) => u.qty > 0);
}

/** Ids from the original demo catalog. Any of them present means the saved catalog is still the demo set. */
const DEMO_PRODUCT_IDS = new Set([
  'p-tarp', 'p-sintra', 'p-vinyl-cut', 'p-photocopy', 'p-scan', 'p-laminate', 'p-blue-bw', 'p-blue-cl',
  'p-rush4r', 'p-idphoto', 'p-8r-frame', 'p-pvc', 'p-pvc-land', 'p-layout', 'p-bizcards', 'p-receipt',
  'p-atp', 'p-notary', 'p-govdoc', 'p-punch', 'p-mug', 'p-shirt', 'p-tote',
]);
const DEMO_MATERIAL_IDS = new Set([
  'mat-tarp', 'mat-vinyl', 'mat-ink-c', 'mat-ink-m', 'mat-ink-y', 'mat-ink-k', 'mat-photo', 'mat-board',
  'mat-pvc', 'mat-ncr', 'mat-card', 'mat-lam', 'mat-frame', 'mat-a4', 'mat-short', 'mat-long',
]);

const DEMO_CATEGORY_IDS = new Set([
  'cat-print', 'cat-doc', 'cat-photo', 'cat-card', 'cat-sticker', 'cat-biz', 'cat-notary', 'cat-merch',
]);

const jobRoleFor = (role: User['role']): NonNullable<EmployeeProfile['jobRole']> =>
  role === 'cashier' ? 'cashier' : role === 'handler' ? 'graphic_artist' : 'other';

/**
 * Bring saved collections up to the current shape. Safe to run repeatedly.
 * A saved demo catalog is replaced by the owner's price list; anything the owner
 * added in the app is kept. Sales history is never touched.
 */
export function upgradeCollections(input: {
  users: User[];
  materials: Material[];
  products: Product[];
  employeeProfiles: EmployeeProfile[];
  categories: Category[];
}) {
  const employeeProfiles = input.employeeProfiles.map((p) => {
    if (p.jobRole) return p;
    const user = input.users.find((u) => u.id === p.userId);
    return user ? { ...p, jobRole: jobRoleFor(user.role) } : p;
  });
  if (!input.products.some((p) => DEMO_PRODUCT_IDS.has(p.id))) {
    return { categories: null, materials: input.materials, products: input.products, employeeProfiles };
  }
  return {
    categories: [...catalogCategories, ...input.categories.filter((c) => !DEMO_CATEGORY_IDS.has(c.id))],
    materials: [...catalogMaterials, ...input.materials.filter((m) => !DEMO_MATERIAL_IDS.has(m.id))],
    products: [...catalogProducts, ...input.products.filter((p) => !DEMO_PRODUCT_IDS.has(p.id))],
    employeeProfiles,
  };
}
