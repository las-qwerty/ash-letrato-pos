import type { Material } from './types';

/** Stock of a material at one branch — legacy rows (no map) live at the main branch. */
export function stockAt(m: Material, branchId: string, mainBranchId: string): number {
  if (m.stockByBranch) return m.stockByBranch[branchId] ?? 0;
  return branchId === mainBranchId ? m.stockQty : 0;
}

/** Ensure a material has a per-branch map, parking legacy totals at the main branch. */
export function materializeStock(m: Material, mainBranchId: string): Material {
  if (m.stockByBranch) return m;
  return { ...m, stockByBranch: { [mainBranchId]: m.stockQty } };
}

/**
 * Apply a signed qty change at one branch, keeping stockQty = sum of branches.
 * Balances floor at zero unless `allowNegative` — sales use that so an
 * over-drawn sheet count shows up as a negative balance, not a silent zero.
 */
export function moveStock(
  m: Material,
  branchId: string,
  qty: number,
  mainBranchId: string,
  opts: { allowNegative?: boolean } = {},
): Material {
  const mm = materializeStock(m, mainBranchId);
  const raw = (mm.stockByBranch![branchId] ?? 0) + qty;
  const next = opts.allowNegative ? raw : Math.max(0, raw);
  const stockByBranch = { ...mm.stockByBranch, [branchId]: next };
  const stockQty = Object.values(stockByBranch).reduce((a, n) => a + n, 0);
  return { ...mm, stockByBranch, stockQty };
}
