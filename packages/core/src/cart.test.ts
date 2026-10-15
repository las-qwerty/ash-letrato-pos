import { describe, expect, it } from 'vitest';
import {
  cartFees,
  lineTotal,
  makeLine,
  pointsEarned,
  pointsToPeso,
  resolvePromo,
  round2,
  tierForSpend,
  totals,
  type CartLine,
  type Product,
  type Promotion,
} from './index';

const settings = { vatRate: 12, seniorPwdDiscountPct: 20, notaryFee: 1, loyaltyEarnRate: 0.02, loyaltyRedeemValue: 0.01 };

const prod = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  kind: 'product',
  sku: 'SKU-1',
  name: 'Item',
  categoryId: 'c1',
  price: 100,
  pricing: 'fixed',
  consumes: [],
  stockQty: 50,
  isActive: true,
  ...over,
});

const line = (over: Partial<CartLine> = {}): CartLine => ({
  id: 'l1',
  productId: 'p1',
  name: 'Item',
  unitPrice: 100,
  qty: 1,
  ...over,
});

describe('makeLine', () => {
  it('fixed-price line uses product price and qty', () => {
    const l = makeLine(prod(), { qty: 3 });
    expect(l.unitPrice).toBe(100);
    expect(l.qty).toBe(3);
    expect(l.area).toBeUndefined();
  });

  it('area-priced line prices by width × height', () => {
    const l = makeLine(prod({ pricing: 'area', areaUnit: 'sq ft', price: 250 }), { width: 2, height: 3 });
    expect(l.area).toEqual({ width: 2, height: 3, unit: 'sq ft', rate: 250 });
    expect(l.unitPrice).toBe(1500); // 6 sq ft × ₱250
    expect(l.qty).toBe(1);
  });
});

describe('lineTotal / totals', () => {
  it('applies a line % discount', () => {
    expect(lineTotal(line({ qty: 2, discountPct: 10 }))).toBe(180);
  });

  it('no discount: total = subtotal, VAT backed out of inclusive price', () => {
    const t = totals([line({ qty: 2 })], { kind: 'none' }, settings);
    expect(t.subtotal).toBe(200);
    expect(t.total).toBe(200);
    expect(t.taxTotal).toBeCloseTo(21.43, 2); // 200 − 200/1.12
  });

  it('manual 10% discount reduces total and tax', () => {
    const t = totals([line({ qty: 2 })], { kind: 'manual', pct: 10 }, settings);
    expect(t.saleDiscount).toBe(20);
    expect(t.total).toBe(180);
    expect(t.taxTotal).toBeCloseTo(19.29, 2);
  });

  it('senior sale: VAT removed then 20% statutory discount', () => {
    const t = totals([line({ qty: 1 })], { kind: 'senior' }, settings);
    expect(t.vatExemptAmount).toBeCloseTo(10.71, 2); // VAT portion removed
    expect(t.saleDiscount).toBeCloseTo(17.86, 2); // 20% of VAT-free base
    expect(t.total).toBeCloseTo(71.43, 2);
    expect(t.taxTotal).toBe(0);
  });

  it('never goes below zero on stacked discounts', () => {
    const t = totals([line()], { kind: 'manual', pct: 95, amountOff: 100 }, settings);
    expect(t.total).toBe(0);
  });

  it('fees are added after discounts and not VAT-bearing', () => {
    const t = totals([line()], { kind: 'manual', pct: 50 }, settings, 3);
    expect(t.feesTotal).toBe(3);
    expect(t.total).toBe(53); // 50 discounted + 3 fee
    expect(t.taxTotal).toBeCloseTo(5.36, 2); // tax only on the 50
  });
});

describe('cartFees', () => {
  it('charges notary fee per unit of flagged products only', () => {
    const products = [prod({ id: 'a', notaryFee: true }), prod({ id: 'b' })];
    const lines = [line({ productId: 'a', qty: 3 }), line({ productId: 'b', qty: 5 })];
    expect(cartFees(lines, products, settings)).toEqual([{ label: 'Notary fee ×3', amount: 3 }]);
  });

  it('empty when nothing flagged', () => {
    expect(cartFees([line()], [prod()], settings)).toEqual([]);
  });
});

describe('resolvePromo', () => {
  const promo = (over: Partial<Promotion> = {}): Promotion => ({
    id: 'pr1',
    code: 'SAVE10',
    name: 'Save 10%',
    type: 'percent',
    pct: 10,
    usageCount: 0,
    isActive: true,
    ...over,
  });

  it('percent promo resolves to a promo discount', () => {
    const r = resolvePromo('save10', [line()], [promo()]);
    expect(r).toEqual({
      ok: true,
      discount: { kind: 'promo', pct: 10, label: 'SAVE10 −10%', promoId: 'pr1' },
    });
  });

  it('rejects unknown, inactive, expired, and min-spend failures', () => {
    expect(resolvePromo('NOPE', [line()], [promo()])).toEqual({ ok: false, error: 'Unknown promo code' });
    expect(resolvePromo('SAVE10', [line()], [promo({ isActive: false })]).ok).toBe(false);
    expect(resolvePromo('SAVE10', [line()], [promo({ endsAt: '2020-01-01' })]).ok).toBe(false);
    const underMin = resolvePromo('SAVE10', [line({ unitPrice: 5 })], [promo({ minSpend: 100 })]);
    expect(underMin.ok).toBe(false);
    if (!underMin.ok) expect(underMin.error).toContain('minimum spend');
  });

  it('usage limit blocks further use', () => {
    const r = resolvePromo('SAVE10', [line()], [promo({ usageLimit: 5, usageCount: 5 })]);
    expect(r.ok).toBe(false);
  });

  it('bxgy grants free units of the target product', () => {
    const r = resolvePromo('SAVE10', [line({ qty: 4 })], [promo({ type: 'bxgy', buyQty: 3, getQty: 1, productId: 'p1' })]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.discount.amountOff).toBe(100); // 1 free × ₱100
  });
});

describe('loyalty helpers', () => {
  it('points and redeem value', () => {
    expect(pointsEarned(500, settings)).toBe(10);
    expect(pointsToPeso(10, settings)).toBeCloseTo(0.1, 5);
  });

  it('tier thresholds', () => {
    expect(tierForSpend(0)).toBe('none');
    expect(tierForSpend(10_000)).toBe('silver');
    expect(tierForSpend(40_000)).toBe('gold');
    expect(tierForSpend(80_001)).toBe('platinum');
  });

  it('round2 avoids float noise', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});
