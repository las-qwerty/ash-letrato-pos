'use client';

import { useState } from 'react';
import { isDimension, makeLine, peso, type Product } from '@simmy/core';
import { Field, Modal } from '../ui';
import { useCart } from '@/lib/cart';
import { useStore } from '@/lib/store';

export function AreaModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const addLine = useCart((s) => s.addLine);
  const currentUser = useStore((s) => s.currentUser);
  const [w, setW] = useState('');
  const [h, setH] = useState('');

  const width = parseFloat(w) || 0;
  const height = parseFloat(h) || 0;
  const dimsValid = isDimension(width) && isDimension(height);
  const area = dimsValid ? width * height : 0;
  const price = product ? area * product.price : 0;

  return (
    <Modal open={!!product} onClose={onClose} title={product?.name ?? ''}>
      <p className="-mt-1 mb-4 text-sm text-stone-500">
        {product && `${peso(product.price)} per ${product.areaUnit}`}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Width (ft)">
          <input
            className="input text-center text-lg"
            inputMode="decimal"
            placeholder="0"
            value={w}
            onChange={(e) => setW(e.target.value)}
          />
        </Field>
        <Field label="Height (ft)">
          <input
            className="input text-center text-lg"
            inputMode="decimal"
            placeholder="0"
            value={h}
            onChange={(e) => setH(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4 flex items-baseline justify-between rounded-lg bg-paper px-4 py-3">
        <span className="text-sm text-stone-500">
          {(width > 0 || height > 0) && !dimsValid
            ? 'Dimensions must be 0.1–500 ft'
            : area > 0
              ? `${area.toFixed(1)} ${product?.areaUnit}`
              : 'Enter dimensions'}
        </span>
        <span className="font-display text-2xl font-medium text-pine-800">
          {peso(price)}
        </span>
      </div>

      <button
        className="btn-primary mt-4 w-full !py-2.5"
        disabled={!product || area <= 0}
        onClick={() => {
          if (!product) return;
          addLine(makeLine(product, { width, height, handlerId: currentUser?.id }));
          onClose();
        }}
      >
        Add to order
      </button>
    </Modal>
  );
}
