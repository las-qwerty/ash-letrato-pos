import type { CartLine, Product } from './types';
import { paperSheets } from './paper';

export interface MaterialUse {
  materialId: string;
  qty: number;
}

/**
 * What a cart line draws from stock. Area jobs scale recipes by square feet
 * (not by the line quantity, which is 1 for area lines); print/copy lines
 * draw sheets from the chosen paper size instead of a fixed recipe entry.
 */
export function consumptionFor(
  line: Pick<CartLine, 'qty' | 'area' | 'paper'>,
  product: Pick<Product, 'consumes' | 'paperMaterialIds'> | undefined,
): MaterialUse[] {
  const totals = new Map<string, number>();
  const add = (materialId: string, qty: number) => totals.set(materialId, (totals.get(materialId) ?? 0) + qty);
  const paperIds = new Set(product?.paperMaterialIds ?? []);
  const units = line.area ? line.area.width * line.area.height : line.qty;
  for (const c of product?.consumes ?? []) {
    if (!paperIds.has(c.materialId)) add(c.materialId, c.qty * units);
  }
  if (line.paper) {
    add(line.paper.materialId, paperSheets(line.paper.pages, line.paper.copies, line.paper.sides));
  }
  return [...totals]
    .map(([materialId, qty]) => ({ materialId, qty: Math.round(qty * 10_000) / 10_000 }))
    .filter((u) => u.qty > 0);
}
