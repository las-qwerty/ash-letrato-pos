'use client';

import { useCallback, useMemo, useState } from 'react';
import { makeLine, type Product } from '@simmy/core';
import { CartPanel } from '@/components/pos/cart-panel';
import { ProductCard } from '@/components/pos/product-card';
import { AreaModal } from '@/components/pos/area-modal';
import { CameraScan } from '@/components/camera-scan';
import { IconBarcode, IconSearch } from '@/components/icons';
import { useCart } from '@/lib/cart';
import { useStore } from '@/lib/store';
import clsx from 'clsx';

export default function PosPage() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const currentUser = useStore((s) => s.currentUser);
  const addLine = useCart((s) => s.addLine);

  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [areaProduct, setAreaProduct] = useState<Product | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products
      .filter((p) => p.isActive)
      .filter((p) => cat === 'all' || p.categoryId === cat)
      .filter(
        (p) =>
          !needle ||
          p.name.toLowerCase().includes(needle) ||
          p.sku.toLowerCase().includes(needle) ||
          p.barcode?.includes(needle),
      );
  }, [products, q, cat]);

  const add = useCallback(
    (p: Product) => {
      if (p.pricing === 'area') setAreaProduct(p);
      else addLine(makeLine(p, { handlerId: currentUser?.id }));
    },
    [addLine, currentUser],
  );

  const findByCode = useCallback(
    (code: string) => {
      const needle = code.trim().toLowerCase();
      return products.find(
        (p) => p.isActive && (p.sku.toLowerCase() === needle || p.barcode === needle),
      );
    },
    [products],
  );

  // Barcode flow: Enter on an exact SKU/barcode match (or a single result) adds it.
  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const target = findByCode(q) ?? (visible.length === 1 ? visible[0] : undefined);
    if (target) {
      add(target);
      setQ('');
    }
  };

  // Camera scan: repeated scans of the same product increment its cart qty.
  const onScanned = useCallback(
    (code: string) => {
      const p = findByCode(code);
      if (p) {
        add(p);
        setScanMsg(`Added ${p.name}`);
        setQ('');
      } else {
        setScanMsg(`Unknown barcode: ${code}`);
      }
    },
    [add, findByCode],
  );

  return (
    <div className="flex h-full">
      {/* Catalog */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-stone-200 bg-paper px-4 pb-4 pt-5 lg:px-6">
          <div className="flex max-w-md gap-2">
            <div className="relative flex-1">
              <IconSearch
                width={16}
                height={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                className="input !pl-9"
                placeholder="Search or scan barcode…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onSearchKey}
                aria-label="Search products"
              />
            </div>
            <button
              className="btn-secondary shrink-0 !px-3"
              onClick={() => setScanOpen(true)}
              aria-label="Scan with camera"
              title="Scan with camera"
            >
              <IconBarcode width={18} height={18} />
            </button>
          </div>
          {scanMsg && (
            <p className="mt-2 max-w-md rounded-lg bg-pine-50 px-3 py-1.5 text-xs text-pine-800">
              {scanMsg}
            </p>
          )}
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
            {[{ id: 'all', name: 'All' }, ...categories].map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={clsx(
                  'whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition',
                  cat === c.id
                    ? 'bg-pine-800 text-white'
                    : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:p-6 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={add} />
          ))}
          {visible.length === 0 && (
            <p className="col-span-full py-16 text-center text-sm text-stone-400">
              No products match “{q}”
            </p>
          )}
        </div>
      </div>

      <CartPanel />
      <AreaModal product={areaProduct} onClose={() => setAreaProduct(null)} />
      <CameraScan open={scanOpen} onClose={() => setScanOpen(false)} onScan={onScanned} />
    </div>
  );
}
