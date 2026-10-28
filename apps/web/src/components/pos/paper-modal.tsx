'use client';

import { useMemo, useState } from 'react';
import { formatSheets, makePaperLine, paperSheets, peso, stockAt, type Product } from '@simmy/core';
import { useCart } from '@/lib/cart';
import { activeBranchId, useStore } from '@/lib/store';
import { Field, Modal } from '../ui';
import clsx from 'clsx';

export function PaperModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const materials = useStore((s) => s.materials);
  const branches = useStore((s) => s.branches);
  const currentUser = useStore((s) => s.currentUser);
  const branchId = useStore((s) => activeBranchId(s));
  const addLine = useCart((s) => s.addLine);
  const [paperId, setPaperId] = useState('');
  const [pages, setPages] = useState('1');
  const [copies, setCopies] = useState('1');

  const papers = useMemo(
    () => (product?.paperMaterialIds ?? []).flatMap((id) => materials.filter((m) => m.id === id)),
    [product, materials],
  );
  const selected = papers.find((m) => m.id === paperId) ?? papers[0];
  const mainId = branches[0]?.id ?? '';
  const perPage = !!product?.pagesPerUnit;
  const pageCount = Math.max(1, Math.floor(Number(pages) || 1));
  const copyCount = Math.max(1, Math.floor(Number(copies) || 1));
  const sheets = !product
    ? 0
    : perPage
      ? paperSheets(pageCount, copyCount, product.printSides ?? 'single')
      : (product.sheetsPerUnit ?? 1) * copyCount;
  const unitPrice = product ? (perPage ? product.price / (product.pagesPerUnit ?? 1) : product.price) : 0;
  const billed = perPage ? pageCount * copyCount : copyCount;
  const total = Math.round(unitPrice * billed * 100) / 100;
  const stock = selected ? stockAt(selected, branchId || mainId, mainId) : 0;
  const short = !!selected && sheets > stock;

  const add = () => {
    if (!product || !selected) return;
    const detail = perPage ? `${pageCount} pp × ${copyCount}` : `${copyCount} set${copyCount === 1 ? '' : 's'}`;
    addLine(
      makePaperLine(
        product,
        {
          materialId: selected.id,
          pages: perPage ? pageCount : (product.sheetsPerUnit ?? 1),
          copies: copyCount,
          label: `${product.name} · ${selected.name} · ${detail}`,
        },
        { handlerId: currentUser?.id },
      ),
    );
    onClose();
  };

  return (
    <Modal open={!!product} onClose={onClose} title={product?.name ?? ''}>
      {product && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="space-y-4"
        >
          <div>
            <p className="label">Paper size</p>
            <div className="grid gap-2" role="radiogroup" aria-label="Paper size">
              {papers.map((m) => {
                const onHand = stockAt(m, branchId || mainId, mainId);
                const active = selected?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPaperId(m.id)}
                    className={clsx(
                      'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition',
                      active ? 'border-pine-600 bg-pine-50 text-pine-800' : 'border-stone-200 text-stone-600 hover:border-stone-300',
                    )}
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className={clsx('text-xs tabular-nums', onHand <= 0 ? 'text-clay' : 'text-stone-500')}>
                      {formatSheets(onHand, m.unitsPerPack, m.packUnit)} left
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {perPage ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pages per copy">
                <input
                  className="input"
                  aria-label="Pages per copy"
                  inputMode="numeric"
                  value={pages}
                  onChange={(e) => setPages(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </Field>
              <Field label="Copies">
                <input
                  className="input"
                  aria-label="Copies"
                  inputMode="numeric"
                  value={copies}
                  onChange={(e) => setCopies(e.target.value.replace(/\D/g, '').slice(0, 3))}
                />
              </Field>
            </div>
          ) : (
            <Field label="Sets">
              <input
                className="input w-32"
                inputMode="numeric"
                value={copies}
                onChange={(e) => setCopies(e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            </Field>
          )}

          <p className="text-xs text-stone-500">
            {perPage
              ? product.printSides === 'duplex'
                ? 'Back to back: two pages per sheet'
                : 'Single-sided: one page per sheet'
              : `${product.sheetsPerUnit ?? 1} sheets per set`}
          </p>

          <div className={clsx('rounded-lg px-4 py-3 text-sm', short ? 'bg-clay/10 text-clay' : 'bg-paper')}>
            <p>
              Uses <strong>{sheets}</strong> sheet{sheets === 1 ? '' : 's'} · {formatSheets(stock)} left at this branch
            </p>
            {short && (
              <p className="mt-1 text-xs">
                Not enough on hand. The sale will leave this size over-drawn until stock is counted.
              </p>
            )}
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-sm text-stone-500">Line total</span>
            <span className="font-display text-xl tabular-nums">{peso(total)}</span>
          </div>
          <button type="submit" className="btn-primary w-full !py-3" disabled={!selected || billed < 1}>
            Add to order
          </button>
        </form>
      )}
    </Modal>
  );
}
