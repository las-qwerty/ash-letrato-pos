import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hashPin,
  moveStock,
  seed,
  tierForSpend,
  type Customer,
  type Material,
  type Product,
  type Sale,
  type User,
} from '@simmy/core';

/**
 * Local data store for the mobile register — mirrors apps/web/src/lib/store.ts.
 * Swap for @simmy/api-client when the backend goes live.
 */
interface MobileState {
  users: User[];
  products: Product[];
  materials: Material[];
  customers: Customer[];
  sales: Sale[];

  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  unlock: (userId: string, pin: string) => Promise<boolean>;
  verifyPin: (userId: string, pin: string) => Promise<boolean>;
  recordSale: (sale: Sale, promoId?: string) => void;
}

export const useStore = create<MobileState>()(
  persist(
    (set, get) => ({
      users: seed.users,
      products: seed.products,
      materials: seed.materials,
      customers: seed.customers,
      sales: seed.sales,

      currentUser: null,
      login: async (email, password) => {
        const e = email.trim().toLowerCase();
        if (e === seed.demoCredentials.email && password === seed.demoCredentials.password) {
          set({ currentUser: get().users[0] ?? null });
          return true;
        }
        // Staff sign in with their own email + register PIN.
        const user = get().users.find((u) => u.email.toLowerCase() === e);
        if (user && (await get().verifyPin(user.id, password))) {
          set({ currentUser: user });
          return true;
        }
        return false;
      },
      logout: () => set({ currentUser: null }),

      unlock: async (userId, pin) => {
        const ok = await get().verifyPin(userId, pin);
        if (ok) {
          set({ currentUser: get().users.find((u) => u.id === userId) ?? null });
        }
        return ok;
      },
      verifyPin: async (userId, pin) => {
        const user = get().users.find((u) => u.id === userId);
        if (!user) return false;
        if (user.pinHash) return (await hashPin(pin)) === user.pinHash;
        if (user.pin === pin) {
          const pinHash = await hashPin(pin);
          set((s) => ({
            users: s.users.map((u) =>
              u.id === userId ? { ...u, pinHash, pin: '' } : u,
            ),
          }));
          return true;
        }
        return false;
      },

      recordSale: (sale, promoId) =>
        set((s) => ({
          sales: [sale, ...s.sales],
          materials: s.materials.map((m) => {
            const used = sale.lines.reduce((acc, line) => {
              const product = line.productId
                ? s.products.find((p) => p.id === line.productId)
                : undefined;
              const recipe = product?.consumes.find((c) => c.materialId === m.id);
              return acc + (recipe ? recipe.qty * line.qty : 0);
            }, 0);
            const main = seed.branches[0]?.id ?? '';
            return used ? moveStock(m, sale.branchId || main, -used, main) : m;
          }),
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
        })),
    }),
    {
      name: 'simmy-pos-mobile',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      // v1 → v2: rebrand + product/service split (same migration as web).
      // v2 → v3: branch-attributed sales.
      migrate: (persisted, version) => {
        const s = persisted as Partial<MobileState>;
        if (version < 2 && s) {
          if (Array.isArray(s.users)) {
            s.users = s.users.map((u) => ({
              ...u,
              email: u.email.replace(/@simmy\.co$/i, '@ashletrato.com'),
            }));
          }
          if (Array.isArray(s.products)) {
            s.products = s.products.map((p) => ({
              ...p,
              kind: p.kind ?? (p.sku.startsWith('SRV-') ? 'service' : 'product'),
            }));
          }
        }
        if (version < 3 && s && Array.isArray(s.sales)) {
          const mainBranch = seed.branches[0]?.id ?? '';
          s.sales = s.sales.map((sale) => ({
            ...sale,
            branchId:
              sale.branchId ??
              seed.branches.find((b) => b.name === sale.branchName)?.id ??
              mainBranch,
          }));
        }
        return s;
      },
    },
  ),
);
