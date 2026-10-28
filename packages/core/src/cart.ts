import type {
  CartDiscount,
  CartLine,
  MembershipTier,
  Product,
  Promotion,
  StoreSettings,
} from './types';

let lineSeq = 0;
const nextLineId = () => `line-${++lineSeq}-${Date.now().toString(36)}`;

/** Create a cart line from a product. Area-priced products need width×height. */
export function makeLine(
  product: Product,
  opts: { qty?: number; width?: number; height?: number; handlerId?: string } = {},
): CartLine {
  if (product.pricing === 'area') {
    const w = opts.width ?? 0;
    const h = opts.height ?? 0;
    const area = Math.max(0, w * h);
    return {
      id: nextLineId(),
      productId: product.id,
      name: product.name,
      unitPrice: area * product.price,
      qty: 1,
      area: { width: w, height: h, unit: product.areaUnit ?? 'sq', rate: product.price },
      handlerId: opts.handlerId,
    };
  }
  return {
    id: nextLineId(),
    productId: product.id,
    name: product.name,
    unitPrice: product.price,
    qty: opts.qty ?? 1,
    handlerId: opts.handlerId,
  };
}

/**
 * A print/copy or fixed-format document line with its paper choice. Per-page
 * services bill printed pages (a back-to-back sheet is two pages at half the
 * sheet price). Fixed-format documents bill per set and use sheetsPerUnit sheets.
 */
export function makePaperLine(
  product: Product,
  paper: { materialId: string; pages: number; copies: number; label: string },
  opts: { handlerId?: string } = {},
): CartLine {
  const copies = Math.max(1, Math.floor(paper.copies));
  if (product.pagesPerUnit) {
    const pages = Math.max(1, Math.floor(paper.pages));
    return {
      id: nextLineId(),
      productId: product.id,
      name: paper.label,
      unitPrice: product.price / product.pagesPerUnit,
      qty: pages * copies,
      handlerId: opts.handlerId,
      paper: { materialId: paper.materialId, sides: product.printSides ?? 'single', pages, copies },
    };
  }
  return {
    id: nextLineId(),
    productId: product.id,
    name: paper.label,
    unitPrice: product.price,
    qty: copies,
    handlerId: opts.handlerId,
    paper: { materialId: paper.materialId, sides: 'single', pages: product.sheetsPerUnit ?? 1, copies },
  };
}

export function lineTotal(line: CartLine): number {
  const base = line.unitPrice * line.qty;
  const pct = line.discountPct ?? 0;
  return round2(base * (1 - pct / 100));
}

export interface CartTotals {
  subtotal: number;
  lineDiscounts: number;
  saleDiscount: number;
  vatExemptAmount: number;
  taxTotal: number;
  /** Surcharges added after discounts (e.g. notary fee) — not VAT-bearing. */
  feesTotal: number;
  total: number;
}

/**
 * Compute totals. Prices are VAT-inclusive.
 * Senior/PWD sales: VAT-exempt AND get the statutory % discount.
 * Manual/promo discounts apply a flat % to the whole sale.
 */
export function totals(
  lines: CartLine[],
  discount: CartDiscount,
  settings: Pick<StoreSettings, 'vatRate' | 'seniorPwdDiscountPct'>,
  feesTotal = 0,
): CartTotals {
  const gross = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const afterLines = lines.reduce((s, l) => s + lineTotal(l), 0);
  const lineDiscounts = round2(gross - afterLines);

  const isStatutory = discount.kind === 'senior' || discount.kind === 'pwd';
  const vatDivisor = 1 + settings.vatRate / 100;

  let saleDiscount = 0;
  let vatExemptAmount = 0;
  let taxTotal = 0;
  let total: number;

  if (isStatutory) {
    // Remove VAT first, then apply statutory discount on the VAT-free base.
    const vatFree = afterLines / vatDivisor;
    vatExemptAmount = round2(afterLines - vatFree);
    saleDiscount = round2(vatFree * (settings.seniorPwdDiscountPct / 100));
    total = round2(vatFree - saleDiscount);
  } else {
    const pct = discount.kind === 'none' ? 0 : (discount.pct ?? 0);
    saleDiscount = round2(
      afterLines * (pct / 100) + (discount.amountOff ?? 0),
    );
    saleDiscount = Math.min(saleDiscount, round2(afterLines));
    total = round2(afterLines - saleDiscount);
    // Back out the VAT portion included in the final total.
    taxTotal = round2(total - total / vatDivisor);
  }

  return {
    subtotal: round2(gross),
    lineDiscounts,
    saleDiscount,
    vatExemptAmount,
    taxTotal,
    feesTotal: round2(feesTotal),
    total: Math.max(0, total) + round2(feesTotal),
  };
}

/**
 * Surcharges for a cart — currently the configured notary fee, charged per
 * unit of every line whose product flags `notaryFee`.
 */
export function cartFees(
  lines: CartLine[],
  products: Product[],
  settings: Pick<StoreSettings, 'notaryFee'>,
): { label: string; amount: number }[] {
  const units = lines.reduce(
    (a, l) =>
      a + (products.find((p) => p.id === l.productId)?.notaryFee ? l.qty : 0),
    0,
  );
  return units > 0
    ? [{ label: `Notary fee ×${units}`, amount: round2(units * settings.notaryFee) }]
    : [];
}

/**
 * Validate a promo code against the cart and resolve it to a CartDiscount.
 * Returns a discount on success, or a human-readable rejection reason.
 */
export function resolvePromo(
  code: string,
  lines: CartLine[],
  promos: Promotion[],
  now = Date.now(),
): { ok: true; discount: CartDiscount } | { ok: false; error: string } {
  const promo = promos.find(
    (p) => p.code.toLowerCase() === code.trim().toLowerCase(),
  );
  if (!promo) return { ok: false, error: 'Unknown promo code' };
  if (!promo.isActive) return { ok: false, error: `${promo.code} is not active` };
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now)
    return { ok: false, error: 'Promo hasn’t started yet' };
  if (promo.endsAt && new Date(promo.endsAt).getTime() < now)
    return { ok: false, error: 'Promo has expired' };
  if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit)
    return { ok: false, error: 'Promo usage limit reached' };

  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  if (promo.minSpend != null && subtotal < promo.minSpend)
    return {
      ok: false,
      error: `Requires a minimum spend of ${round2(promo.minSpend)}`,
    };

  if (promo.type === 'percent') {
    return {
      ok: true,
      discount: {
        kind: 'promo',
        pct: promo.pct ?? 0,
        label: `${promo.code} −${promo.pct}%`,
        promoId: promo.id,
      },
    };
  }

  if (promo.type === 'amount') {
    return {
      ok: true,
      discount: {
        kind: 'promo',
        amountOff: Math.min(promo.amount ?? 0, subtotal),
        label: `${promo.code} −${promo.amount}`,
        promoId: promo.id,
      },
    };
  }

  // bxgy: for every (buyQty + getQty) units of the target product, getQty are free
  const line = lines.find((l) => l.productId === promo.productId);
  const buy = promo.buyQty ?? 0;
  const get = promo.getQty ?? 0;
  if (!line || buy <= 0 || get <= 0) {
    return {
      ok: false,
      error: 'This promo needs the qualifying item in the cart',
    };
  }
  const freeUnits = Math.floor(line.qty / (buy + get)) * get;
  if (freeUnits <= 0) {
    return { ok: false, error: `Buy ${buy} get ${get} free — add more to qualify` };
  }
  const off = round2(freeUnits * line.unitPrice);
  return {
    ok: true,
    discount: {
      kind: 'promo',
      amountOff: off,
      label: `${promo.code} — ${freeUnits} free`,
      promoId: promo.id,
    },
  };
}

export function pointsEarned(
  total: number,
  settings: Pick<StoreSettings, 'loyaltyEarnRate'>,
): number {
  return Math.floor(total * settings.loyaltyEarnRate);
}

export function pointsToPeso(
  points: number,
  settings: Pick<StoreSettings, 'loyaltyRedeemValue'>,
): number {
  return round2(points * settings.loyaltyRedeemValue);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Membership tier from lifetime spend — matches the tiers shown on /discounts. */
export function tierForSpend(lifetimeSpend: number): MembershipTier {
  if (lifetimeSpend >= 80_000) return 'platinum';
  if (lifetimeSpend >= 40_000) return 'gold';
  if (lifetimeSpend >= 10_000) return 'silver';
  return 'none';
}
