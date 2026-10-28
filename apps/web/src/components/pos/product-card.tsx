'use client';

import { memo } from 'react';
import { peso, type Product } from '@simmy/core';
import { IconImage, IconRuler } from '../icons';
import clsx from 'clsx';

export const ProductCard = memo(function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (p: Product) => void;
}) {
  const out = product.pricing === 'fixed' && product.stockQty != null && product.stockQty <= 0;

  return (
    <button
      onClick={() => onAdd(product)}
      disabled={out}
      className={clsx(
        'card group flex flex-col items-start gap-1 p-4 text-left transition',
        'hover:-translate-y-0.5 hover:border-pine-400 hover:shadow-lift',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-pine-600',
        'disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-card',
      )}
    >
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-16 w-full rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex h-16 w-full items-center justify-center rounded-lg bg-paper text-stone-300">
          <IconImage width={22} height={22} />
        </span>
      )}
      <span className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug">
        {product.name}
      </span>
      <span className="mt-auto flex w-full items-end justify-between pt-2">
        <span className="font-display text-lg font-medium text-pine-800">
          {peso(product.price)}
          {product.pricing === 'area' && (
            <span className="ml-1 font-sans text-[11px] font-normal text-stone-400">
              / {product.areaUnit}
            </span>
          )}
        </span>
        {product.pricing === 'area' ? (
          <span className="text-stone-400 group-hover:text-pine-600">
            <IconRuler width={15} height={15} />
          </span>
        ) : (
          <span
            className={clsx(
              'text-[11px] font-medium',
              out ? 'text-clay' : 'text-stone-400',
            )}
          >
            {out ? 'Sold out' : product.stockQty != null ? `${product.stockQty} left` : ''}
          </span>
        )}
      </span>
    </button>
  );
});
