'use client';

import { create } from 'zustand';
import { clampQty, type CartDiscount, type CartLine, type Customer } from '@simmy/core';

interface CartState {
  lines: CartLine[];
  customer: Customer | null;
  discount: CartDiscount;
  redeemPoints: number;

  addLine: (line: CartLine) => void;
  setQty: (lineId: string, qty: number) => void;
  setLineDiscount: (lineId: string, pct: number) => void;
  setHandler: (lineId: string, handlerId: string) => void;
  removeLine: (lineId: string) => void;
  setCustomer: (c: Customer | null) => void;
  setDiscount: (d: CartDiscount) => void;
  setRedeemPoints: (pts: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>((set) => ({
  lines: [],
  customer: null,
  discount: { kind: 'none' },
  redeemPoints: 0,

  addLine: (line) =>
    set((s) => {
      // merge fixed-price lines for the same product
      if (!line.area) {
        const existing = s.lines.find(
          (l) => l.productId === line.productId && !l.area && !l.discountPct && !l.paper && !line.paper,
        );
        if (existing) {
          return {
            lines: s.lines.map((l) =>
              l.id === existing.id ? { ...l, qty: l.qty + line.qty } : l,
            ),
          };
        }
      }
      return { lines: [...s.lines, line] };
    }),

  setQty: (lineId, qty) =>
    set((s) => ({
      lines:
        qty <= 0
          ? s.lines.filter((l) => l.id !== lineId)
          : s.lines.map((l) => (l.id === lineId ? { ...l, qty: clampQty(qty) } : l)),
    })),

  setLineDiscount: (lineId, pct) =>
    set((s) => ({
      lines: s.lines.map((l) =>
        l.id === lineId ? { ...l, discountPct: pct > 0 ? Math.min(pct, 100) : undefined } : l,
      ),
    })),

  setHandler: (lineId, handlerId) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.id === lineId ? { ...l, handlerId } : l)),
    })),

  removeLine: (lineId) => set((s) => ({ lines: s.lines.filter((l) => l.id !== lineId) })),
  setCustomer: (customer) => set({ customer }),
  setDiscount: (discount) => set({ discount }),
  setRedeemPoints: (redeemPoints) => set({ redeemPoints }),
  clear: () =>
    set({ lines: [], customer: null, discount: { kind: 'none' }, redeemPoints: 0 }),
}));
