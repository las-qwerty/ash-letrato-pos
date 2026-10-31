import { describe, expect, it } from 'vitest';
import { catalogCategories, catalogMaterials, catalogProducts } from './catalog';
import {
  catalogSet2Categories,
  catalogSet2Materials,
  catalogSet2Products,
  mergeCatalogSet2,
} from './catalog-set-2';
import { makeLine } from './cart';
import { consumptionFor } from './consumption';
import * as seed from './seed';
import type { Product } from './types';

const firstList = { categories: catalogCategories, materials: catalogMaterials, products: catalogProducts };
const merged = mergeCatalogSet2(firstList);
const byName = (name: string) => {
  const p = merged.products.find((x) => x.name === name);
  if (!p) throw new Error(`missing ${name}`);
  return p;
};

describe('second price list', () => {
  it('adds 7 categories, 12 materials and 88 services', () => {
    expect(catalogSet2Categories).toHaveLength(7);
    expect(catalogSet2Materials).toHaveLength(12);
    expect(catalogSet2Products).toHaveLength(88);
    expect(merged.categories).toHaveLength(catalogCategories.length + 7);
    expect(merged.materials).toHaveLength(catalogMaterials.length + 12);
    expect(merged.products).toHaveLength(catalogProducts.length + 88);
  });

  it('has unique ids, skus and material codes across the whole catalog', () => {
    const unique = (xs: string[]) => new Set(xs).size === xs.length;
    expect(unique(merged.products.map((p) => p.id))).toBe(true);
    expect(unique(merged.products.map((p) => p.sku))).toBe(true);
    expect(unique(merged.materials.map((m) => m.id))).toBe(true);
    expect(unique(merged.materials.map((m) => m.code))).toBe(true);
    expect(unique(merged.categories.map((c) => c.id))).toBe(true);
  });

  it('points every product at a real category and real materials', () => {
    const cats = new Set(merged.categories.map((c) => c.id));
    const mats = new Set(merged.materials.map((m) => m.id));
    for (const p of merged.products) {
      expect(cats.has(p.categoryId), p.name).toBe(true);
      for (const c of p.consumes) expect(mats.has(c.materialId), `${p.name} → ${c.materialId}`).toBe(true);
    }
  });

  it('fills the calling-card recipes from the sheet and keeps their prices', () => {
    expect(byName('Calling card — Matte (250 GSM) (per 10 sheets)')).toMatchObject({
      price: 350,
      consumes: [{ materialId: 'mat-quaff-matte-250-gsm', qty: 10 }],
    });
    expect(byName('Calling card — Gloss (300 GSM) (per 10 sheets)')).toMatchObject({
      price: 650,
      consumes: [{ materialId: 'mat-double-sided-300-gsm', qty: 10 }],
    });
  });

  it('merging again changes nothing', () => {
    const again = mergeCatalogSet2({ categories: merged.categories, materials: merged.materials, products: merged.products });
    expect(again.products).toEqual(merged.products);
    expect(again.materials).toEqual(merged.materials);
    expect(again.categories).toEqual(merged.categories);
  });

  it('keeps owner edits to existing items and never overwrites a recipe', () => {
    const edited = catalogProducts.map((p) =>
      p.id === 'p-106' ? { ...p, price: 360 } : p.id === 'p-108' ? { ...p, consumes: [{ materialId: 'mat-copy-paper-a4', qty: 3 }] } : p,
    );
    const out = mergeCatalogSet2({ categories: catalogCategories, materials: catalogMaterials, products: edited });
    expect(out.products.find((p) => p.id === 'p-106')).toMatchObject({ price: 360, consumes: [{ materialId: 'mat-quaff-matte-250-gsm', qty: 10 }] });
    expect(out.products.find((p) => p.id === 'p-108')?.consumes).toEqual([{ materialId: 'mat-copy-paper-a4', qty: 3 }]);
  });

  it('renames a second-list sku that an owner item already uses', () => {
    const [first] = catalogProducts;
    if (!first) throw new Error('empty catalog');
    const owner: Product = { ...first, id: 'p-owner', sku: 'SRV-120' };
    const out = mergeCatalogSet2({ categories: catalogCategories, materials: catalogMaterials, products: [...catalogProducts, owner] });
    const skus = out.products.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
    expect(out.products.find((p) => p.id === 'p-120')?.sku).toBe('SRV-120-2');
    expect(out.products.find((p) => p.id === 'p-owner')?.sku).toBe('SRV-120');
  });

  it('seeds fresh installs with the same catalog', () => {
    expect(seed.products).toHaveLength(merged.products.length);
    expect(seed.materials).toHaveLength(merged.materials.length);
    expect(seed.categories).toHaveLength(merged.categories.length);
  });

  it('prices the BIR booklets from the sheet', () => {
    const bir = merged.products.filter((p) => p.categoryId === 'cat-bir');
    expect(bir).toHaveLength(36);
    expect(byName('BIR Ordinary — 1/4 Long (x2, min 10 booklets)').price).toBe(1300);
    expect(byName('BIR Carbonless — 1/3 Size (11 x 21.5 cm) (x4, min 10 booklets)').price).toBe(3000);
    expect(byName('BIR Ordinary — 1 Whole Long (x4, min 10 booklets)').price).toBe(6000);
  });

  it('gives tarpaulin and stickers a minimum charge', () => {
    expect(byName('Tarpaulin')).toMatchObject({ pricing: 'area', areaUnit: 'sq ft', price: 25, minCharge: 150 });
    expect(byName('Sticker on Sintra Board')).toMatchObject({ pricing: 'area', areaUnit: 'sq in', price: 1.5, minCharge: 150 });
    expect(byName('Roll-up Banner (2.5ft x 5.0ft)')).toMatchObject({ pricing: 'fixed', price: 1800 });
  });
});

describe('area minimum charge', () => {
  const tarp = byName('Tarpaulin');

  it('charges the area rate when it is above the minimum', () => {
    expect(makeLine(tarp, { width: 4, height: 6 }).unitPrice).toBe(600);
  });

  it('charges the minimum for small jobs', () => {
    expect(makeLine(tarp, { width: 2, height: 3 }).unitPrice).toBe(150);
    expect(makeLine(tarp, { width: 1, height: 2 }).unitPrice).toBe(150);
  });

  it('keeps the minimum on the cart line so it can be shown', () => {
    expect(makeLine(tarp, { width: 1, height: 2 }).area).toEqual({ width: 1, height: 2, unit: 'sq ft', rate: 25, min: 150 });
  });

  it('prices nothing for zero size', () => {
    expect(makeLine(tarp, { width: 0, height: 0 }).unitPrice).toBe(0);
  });

  it('leaves products without a minimum unchanged', () => {
    const plain = { ...tarp, minCharge: undefined };
    expect(makeLine(plain, { width: 1, height: 2 }).unitPrice).toBe(50);
    expect(makeLine(plain, { width: 1, height: 2 }).area).not.toHaveProperty('min');
  });
});

describe('stock drawn by the second list', () => {
  it('draws the photo sheet and the frame for a print-and-frame job', () => {
    expect(consumptionFor({ qty: 1 }, byName('Print & Frame — 5R with Frame'))).toEqual([
      { materialId: 'mat-kodak-250-gsm', qty: 0.362 },
      { materialId: 'mat-frame-5r-black', qty: 1 },
    ]);
  });

  it('scales a picture recipe by the quantity ordered', () => {
    expect(consumptionFor({ qty: 2 }, byName('Picture — 2x2'))).toEqual([{ materialId: 'mat-kodak-250-gsm', qty: 0.662 }]);
  });

  it('draws the sheet recipe for calling cards', () => {
    expect(consumptionFor({ qty: 3 }, byName('Calling card — Gloss (250 GSM) (per 10 sheets)'))).toEqual([
      { materialId: 'mat-double-sided-250-gsm', qty: 30 },
    ]);
  });
});
