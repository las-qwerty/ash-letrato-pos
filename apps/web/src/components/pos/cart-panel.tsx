'use client';

import { memo, useMemo, useState } from 'react';
import {
  cartFees,
  missingHandlers,
  paperSheets,
  peso,
  pointsToPeso,
  resolvePromo,
  totals,
  type CartLine,
} from '@simmy/core';
import { useCart } from '@/lib/cart';
import { useStore } from '@/lib/store';
import { IconMinus, IconPlus, IconReceipt, IconTrash } from '../icons';
import { CustomerChip } from './customer-picker';
import { PaymentModal } from './payment-modal';
import clsx from 'clsx';

const LineItem = memo(function LineItem({ line }: { line: CartLine }) {
  const setQty = useCart((s) => s.setQty);
  const removeLine = useCart((s) => s.removeLine);
  const setHandler = useCart((s) => s.setHandler);
  const users = useStore((s) => s.users);
  const handlers = useMemo(() => users.filter((u) => u.role !== 'super_admin'), [users]);

  const lineTotal = line.unitPrice * line.qty * (1 - (line.discountPct ?? 0) / 100);

  return (
    <li className="group py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{line.name}</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {line.area
              ? `${line.area.width}×${line.area.height} ${line.area.unit} @ ${peso(line.area.rate)}`
              : line.paper
                ? `${line.qty} × ${peso(line.unitPrice)} · ${paperSheets(line.paper.pages, line.paper.copies, line.paper.sides)} sheets`
                : peso(line.unitPrice)}
            {line.discountPct ? ` · −${line.discountPct}%` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <p className="mr-1 font-display font-medium">{peso(lineTotal)}</p>
          <button
            onClick={() => removeLine(line.id)}
            aria-label={`Remove ${line.name}`}
            className="rounded p-1.5 text-stone-300 opacity-50 transition hover:bg-clay/10 hover:text-clay group-hover:opacity-100"
          >
            <IconTrash width={14} height={14} />
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {!line.area && !line.paper && (
          <div className="flex items-center rounded-lg border border-stone-200">
            <button
              className="px-2.5 py-2 text-stone-500 hover:text-ink disabled:opacity-30"
              onClick={() => setQty(line.id, line.qty - 1)}
              aria-label="Decrease quantity"
            >
              <IconMinus width={14} height={14} />
            </button>
            <span className="w-8 text-center text-sm tabular-nums">{line.qty}</span>
            <button
              className="px-2.5 py-2 text-stone-500 hover:text-ink"
              onClick={() => setQty(line.id, line.qty + 1)}
              aria-label="Increase quantity"
            >
              <IconPlus width={14} height={14} />
            </button>
          </div>
        )}
        <select
          className={clsx(
            'input !w-auto flex-1 !py-1 text-xs',
            line.handlerId
              ? '!border-stone-200 text-stone-500'
              : '!border-clay !bg-clay/5 font-medium text-clay',
          )}
          value={line.handlerId ?? ''}
          onChange={(e) => setHandler(line.id, e.target.value)}
          aria-label="Assign handler"
          required
        >
          <option value="">Assign handler *</option>
          {handlers.map((h) => (
            <option key={h.id} value={h.id}>
              {h.firstName} {h.lastName}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
});

export function CartPanel() {
  const cart = useCart();
  const settings = useStore((s) => s.settings);
  const promotions = useStore((s) => s.promotions);
  const products = useStore((s) => s.products);
  const [payOpen, setPayOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);

  const applyPromo = () => {
    const res = resolvePromo(promoCode, cart.lines, promotions);
    if (res.ok) {
      cart.setDiscount(res.discount);
      setPromoError(null);
      setPromoCode('');
    } else {
      setPromoError(res.error);
    }
  };

  const fees = useMemo(() => cartFees(cart.lines, products, settings), [cart.lines, products, settings]);
  const feesTotal = fees.reduce((a, f) => a + f.amount, 0);
  const t = totals(cart.lines, cart.discount, settings, feesTotal);
  const pointsValue = pointsToPeso(cart.redeemPoints, settings);
  const grandTotal = Math.max(0, t.total - pointsValue);

  const cust = cart.customer;
  const canStatutory = cust && (cust.isSeniorCitizen || cust.isPwd);
  const statutoryOn = cart.discount.kind === 'senior' || cart.discount.kind === 'pwd';
  const unhandled = missingHandlers(cart.lines).length;

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-l border-stone-200 bg-white md:w-[330px] xl:w-[380px]">
      <div className="border-b border-stone-200 p-4">
        <CustomerChip />
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {cart.lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <IconReceipt width={36} height={36} className="mb-3 text-stone-200" />
            <p className="text-sm font-medium text-stone-400">Order is empty</p>
            <p className="mt-1 text-xs text-stone-400">
              Tap a product or service to add it
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {cart.lines.map((l) => (
              <LineItem key={l.id} line={l} />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-stone-200 p-4">
        {/* Promo code */}
        <div className="mb-2">
          <div className="flex gap-2">
            <input
              className="input flex-1 !py-1.5 font-mono text-xs uppercase"
              placeholder="Promo code"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                setPromoError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
              aria-label="Promo code"
            />
            <button
              className="btn-secondary !px-3 !py-1.5 text-xs"
              onClick={applyPromo}
              disabled={!promoCode.trim()}
            >
              Apply
            </button>
          </div>
          {promoError && <p className="mt-1 text-xs text-clay">{promoError}</p>}
          {cart.discount.kind === 'promo' && (
            <div className="mt-1.5 flex items-center justify-between rounded-lg bg-pine-50 px-2.5 py-1.5 text-xs">
              <span className="font-medium text-pine-800">{cart.discount.label}</span>
              <button
                className="text-stone-400 hover:text-clay"
                onClick={() => cart.setDiscount({ kind: 'none' })}
                aria-label="Remove promo"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Discount controls */}
        <div className="mb-3 flex gap-2">
          <button
            disabled={!canStatutory}
            onClick={() =>
              cart.setDiscount(
                statutoryOn
                  ? { kind: 'none' }
                  : { kind: cust!.isSeniorCitizen ? 'senior' : 'pwd' },
              )
            }
            className={clsx(
              'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition',
              statutoryOn
                ? 'border-clay bg-clay/10 text-clay'
                : 'border-stone-200 text-stone-500 hover:border-stone-300',
              !canStatutory && 'opacity-40',
            )}
            title={canStatutory ? 'Apply statutory discount' : 'Requires a senior/PWD customer'}
          >
            SC / PWD −{settings.seniorPwdDiscountPct}%
          </button>
          <button
            onClick={() =>
              cart.setDiscount(
                cart.discount.kind === 'manual'
                  ? { kind: 'none' }
                  : { kind: 'manual', pct: 10, label: 'Manual 10%' },
              )
            }
            className={clsx(
              'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition',
              cart.discount.kind === 'manual'
                ? 'border-pine-600 bg-pine-50 text-pine-800'
                : 'border-stone-200 text-stone-500 hover:border-stone-300',
            )}
          >
            Manual −10%
          </button>
          <button
            disabled={!cust || cust.loyaltyPoints === 0}
            onClick={() =>
              cart.setRedeemPoints(cart.redeemPoints > 0 ? 0 : Math.min(cust!.loyaltyPoints, 500))
            }
            className={clsx(
              'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition',
              cart.redeemPoints > 0
                ? 'border-brass-500 bg-brass-100 text-brass-700'
                : 'border-stone-200 text-stone-500 hover:border-stone-300',
              (!cust || cust.loyaltyPoints === 0) && 'opacity-40',
            )}
          >
            Use points
          </button>
        </div>

        {/* Totals */}
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-stone-500">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{peso(t.subtotal)}</dd>
          </div>
          {t.lineDiscounts + t.saleDiscount > 0 && (
            <div className="flex justify-between text-clay">
              <dt>Discounts</dt>
              <dd className="tabular-nums">−{peso(t.lineDiscounts + t.saleDiscount)}</dd>
            </div>
          )}
          {t.vatExemptAmount > 0 && (
            <div className="flex justify-between text-stone-500">
              <dt>VAT exempt</dt>
              <dd className="tabular-nums">−{peso(t.vatExemptAmount)}</dd>
            </div>
          )}
          {pointsValue > 0 && (
            <div className="flex justify-between text-brass-600">
              <dt>Points ({cart.redeemPoints})</dt>
              <dd className="tabular-nums">−{peso(pointsValue)}</dd>
            </div>
          )}
          {fees.map((f) => (
            <div key={f.label} className="flex justify-between text-stone-500">
              <dt>{f.label}</dt>
              <dd className="tabular-nums">+{peso(f.amount)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t border-stone-200 pt-2">
            <dt className="text-sm font-medium">Total</dt>
            <dd className="font-display text-2xl font-medium tabular-nums">
              {peso(grandTotal)}
            </dd>
          </div>
        </dl>

        {unhandled > 0 && (
          <p role="alert" className="mt-2 text-center text-xs font-medium text-clay">
            Assign a handler to {unhandled} item{unhandled === 1 ? '' : 's'} before charging
          </p>
        )}
        <button
          className="btn-primary mt-3 w-full !py-3 !text-base"
          disabled={cart.lines.length === 0 || unhandled > 0}
          onClick={() => setPayOpen(true)}
        >
          Charge {peso(grandTotal)}
        </button>
      </div>

      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} total={grandTotal} />
    </aside>
  );
}
