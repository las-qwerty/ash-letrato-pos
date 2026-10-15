import { describe, expect, it } from 'vitest';
import { materializeStock, moveStock, stockAt, type Material } from './index';

const mat = (over: Partial<Material> = {}): Material => ({
  id: 'm1',
  code: 'MAT-A4',
  name: 'A4 Paper',
  unit: 'sheet',
  stockQty: 500,
  minStockLevel: 100,
  costPerUnit: 0.6,
  unitsPerPack: 500,
  packUnit: 'ream',
  ...over,
});

const MAIN = 'b-main';
const OTHER = 'b-other';

describe('stockAt', () => {
  it('legacy material (no map) reports everything at main, zero elsewhere', () => {
    const m = mat();
    expect(stockAt(m, MAIN, MAIN)).toBe(500);
    expect(stockAt(m, OTHER, MAIN)).toBe(0);
  });

  it('mapped material reads the branch entry', () => {
    const m = mat({ stockByBranch: { [MAIN]: 300, [OTHER]: 200 } });
    expect(stockAt(m, OTHER, MAIN)).toBe(200);
    expect(stockAt(m, 'b-missing', MAIN)).toBe(0);
  });
});

describe('materializeStock', () => {
  it('parks legacy total at the main branch', () => {
    const mm = materializeStock(mat(), MAIN);
    expect(mm.stockByBranch).toEqual({ [MAIN]: 500 });
  });

  it('is a no-op on already-mapped stock', () => {
    const m = mat({ stockByBranch: { [OTHER]: 42 } });
    expect(materializeStock(m, MAIN).stockByBranch).toEqual({ [OTHER]: 42 });
  });
});

describe('moveStock', () => {
  it('adds and removes at the right branch, keeping total = sum', () => {
    let m = moveStock(mat(), MAIN, -100, MAIN);
    m = moveStock(m, OTHER, 50, MAIN);
    expect(stockAt(m, MAIN, MAIN)).toBe(400);
    expect(stockAt(m, OTHER, MAIN)).toBe(50);
    expect(m.stockQty).toBe(450);
  });

  it('floors at zero — consumption can’t drive a branch negative', () => {
    const m = moveStock(mat({ stockQty: 10 }), MAIN, -25, MAIN);
    expect(stockAt(m, MAIN, MAIN)).toBe(0);
    expect(m.stockQty).toBe(0);
  });

  it('a transfer out+in pair moves stock without changing total', () => {
    const m = moveStock(moveStock(mat(), MAIN, -100, MAIN), OTHER, 100, MAIN);
    expect(m.stockQty).toBe(500);
    expect(stockAt(m, OTHER, MAIN)).toBe(100);
  });
});
