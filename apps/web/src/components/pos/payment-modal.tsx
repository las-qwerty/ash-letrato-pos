'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  cartFees,
  consumptionFor,
  lineTotal,
  missingHandlers,
  paperSheets,
  peso,
  pointsEarned,
  pointsToPeso,
  round2,
  totals,
  type AppliedDiscount,
  type PaymentMethod,
  type PrintEntry,
  type Sale,
} from '@simmy/core';
import { useCart } from '@/lib/cart';
import { printReceipt } from '@/lib/print';
import { activeBranchId, useStore } from '@/lib/store';
import { IconCard, IconCash, IconPhone } from '../icons';
import { Modal } from '../ui';
import { Receipt } from './receipt';
import clsx from 'clsx';

const methods: { id: PaymentMethod; label: string; icon: typeof IconCash }[] = [
  { id: 'cash', label: 'Cash', icon: IconCash },
  { id: 'gcash', label: 'GCash', icon: IconPhone },
  { id: 'maya', label: 'Maya', icon: IconPhone },
  { id: 'card', label: 'Card', icon: IconCard },
];

const quickCash = [100, 200, 500, 1000];

export function PaymentModal({
  open,
  onClose,
  total,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
}) {
  const cart = useCart();
  const settings = useStore((s) => s.settings);
  const branches = useStore((s) => s.branches);
  const currentUser = useStore((s) => s.currentUser);
  const users = useStore((s) => s.users);
  const recordSale = useStore((s) => s.recordSale);
  const recordPrint = useStore((s) => s.recordPrint);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tenderedStr, setTenderedStr] = useState('');
  const [done, setDone] = useState<Sale | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMethod('cash');
      setTenderedStr('');
      setDone(null);
      setPayError(null);
    }
  }, [open]);

  // Auto-print the receipt the moment the sale completes — the delay gives
  // the receipt a frame to paint before the print dialog takes over. On
  // Android this fires the RawBT intent instead, printing silently.
  const doneBranch = done ? branches.find((b) => b.id === done.branchId) : undefined;

  // Every printed copy is logged with the staff member who printed it, and the
  // receipt shows that name. Reprints from the Transactions page use the same path.
  const printCopy = (sale: Sale, drawer = false) => {
    const entry: PrintEntry = {
      byId: currentUser?.id,
      byName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '—',
      at: new Date().toISOString(),
    };
    const updated: Sale = { ...sale, printLog: [...(sale.printLog ?? []), entry] };
    recordPrint(sale.id, entry);
    setDone(updated);
    void printReceipt(updated, settings, branches.find((b) => b.id === updated.branchId), { drawer });
  };

  const tendered =
    method === 'cash' ? Math.min(parseFloat(tenderedStr) || 0, 999_999) : total;
  const change = round2(tendered - total);
  const canComplete = total > 0 && tendered >= total;

  const products = useStore((s) => s.products);
  const fees = useMemo(
    () => cartFees(cart.lines, products, settings),
    [cart.lines, products, settings],
  );
  const t = useMemo(
    () => totals(cart.lines, cart.discount, settings, fees.reduce((a, f) => a + f.amount, 0)),
    [cart.lines, cart.discount, settings, fees],
  );

  const complete = () => {
    const missing = missingHandlers(cart.lines);
    if (missing.length) {
      setPayError(`Assign a handler to ${missing.length} item${missing.length === 1 ? '' : 's'} first.`);
      return;
    }
    try {
      const state = useStore.getState();
      const { branches, sales } = state;
      // Staff sell under their home branch; the owner sells under whatever
      // branch they're currently viewing (or their own when viewing 'all').
      const branch =
        branches.find((b) => b.id === activeBranchId(state)) ?? branches[0];
      // Next free invoice number — survives restores/resets better than
      // counting rows (which collides after importing a smaller backup).
      const maxSuffix = sales.reduce((m, s) => {
        const n = parseInt(s.invoiceNumber.split('-').pop() ?? '', 10);
        return Number.isFinite(n) ? Math.max(m, n) : m;
      }, 841);
      const handlerName = (id?: string) => {
        const u = users.find((x) => x.id === id);
        return u ? `${u.firstName} ${u.lastName}` : undefined;
      };
      const d = cart.discount;
      const discount: AppliedDiscount | undefined =
        d.kind === 'none'
          ? undefined
          : d.kind === 'senior' || d.kind === 'pwd'
            ? {
                kind: d.kind,
                label: `${d.kind === 'senior' ? 'Senior citizen' : 'PWD'} −${settings.seniorPwdDiscountPct}% (VAT-exempt)`,
                pct: settings.seniorPwdDiscountPct,
                amount: t.saleDiscount,
                idNo: cart.customer?.discountId,
              }
            : {
                kind: d.kind,
                label: d.label ?? (d.kind === 'promo' ? 'Promo' : 'Manual discount'),
                pct: d.pct,
                amount: t.saleDiscount,
              };
      const sale: Sale = {
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        invoiceNumber: `INV-2026-${String(maxSuffix + 1).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
        cashierName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '—',
        cashierId: currentUser?.id,
        branchId: branch?.id ?? '',
        branchName: branch?.name ?? 'Main',
        customerName: cart.customer
          ? `${cart.customer.firstName} ${cart.customer.lastName}`
          : undefined,
        customerId: cart.customer?.id,
        lines: cart.lines.map((l) => ({
          productId: l.productId,
          name: l.area
            ? `${l.name} — ${l.area.width}×${l.area.height} ${l.area.unit}`
            : l.name,
          qty: l.qty,
          unitPrice: l.unitPrice,
          total: lineTotal(l),
          handlerId: l.handlerId,
          handlerName: handlerName(l.handlerId),
          paper: l.paper && { ...l.paper, sheets: paperSheets(l.paper.pages, l.paper.copies, l.paper.sides) },
          consumed: consumptionFor(l, products.find((p) => p.id === l.productId)),
        })),
        discount,
        subtotal: t.subtotal,
        discountTotal: t.lineDiscounts + t.saleDiscount + pointsToPeso(cart.redeemPoints, settings),
        fees,
        vatExempt: t.vatExemptAmount > 0,
        taxTotal: t.taxTotal,
        total,
        paymentMethod: method,
        amountTendered: tendered,
        change: Math.max(0, change),
        pointsEarned: cart.customer ? pointsEarned(total, settings) : 0,
        pointsRedeemed: cart.redeemPoints || undefined,
        status: 'completed',
      };
      recordSale(sale, cart.discount.promoId);
      setDone(sale);
      setTimeout(() => printCopy(sale, true), 250);
    } catch {
      setPayError('Could not save the sale — please try again.');
    }
  };

  const finish = () => {
    cart.clear();
    setDone(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={done ? finish : onClose} title={done ? 'Sale complete' : 'Payment'} wide>
      {done ? (
        <div>
          <Receipt sale={done} settings={settings} branch={doneBranch} />
          <p className="mt-2 text-center text-xs text-stone-400">
            Prints on {settings.receiptWidthMm ?? 80} mm paper — change in Settings → Receipt
          </p>
          <div className="mt-3 flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => printCopy(done)}>
              Print receipt
            </button>
            <button className="btn-primary flex-1" onClick={finish}>
              New sale
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-center">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Amount due
            </span>
            <span className="block font-display text-4xl font-medium tracking-tight text-pine-800">
              {peso(total)}
            </span>
          </p>

          <div className="mt-5 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Payment method">
            {methods.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="radio"
                aria-checked={method === id}
                onClick={() => setMethod(id)}
                className={clsx(
                  'flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition',
                  method === id
                    ? 'border-pine-600 bg-pine-50 text-pine-800'
                    : 'border-stone-200 text-stone-500 hover:border-stone-300',
                )}
              >
                <Icon width={18} height={18} />
                {label}
              </button>
            ))}
          </div>

          {method === 'cash' && (
            <div className="mt-5">
              <label htmlFor="tendered" className="label">
                Cash tendered
              </label>
              <input
                id="tendered"
                className="input text-center font-display text-2xl"
                inputMode="decimal"
                placeholder="0.00"
                value={tenderedStr}
                onChange={(e) => setTenderedStr(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <div className="mt-2 flex gap-2">
                {quickCash.map((v) => (
                  <button
                    key={v}
                    className="btn-secondary flex-1 !py-2.5 text-sm"
                    onClick={() => setTenderedStr(String(v))}
                  >
                    ₱{v}
                  </button>
                ))}
                <button
                  className="btn-secondary flex-1 !py-2.5 text-sm"
                  onClick={() => setTenderedStr(total.toFixed(2))}
                >
                  Exact
                </button>
              </div>
            </div>
          )}

          {method === 'cash' && tendered > 0 && (
            <div
              className={clsx(
                'mt-4 flex items-baseline justify-between rounded-lg px-4 py-3',
                change >= 0 ? 'bg-pine-50' : 'bg-clay/10',
              )}
            >
              <span className="text-sm text-stone-600">Change</span>
              <span
                className={clsx(
                  'font-display text-2xl font-medium tabular-nums',
                  change >= 0 ? 'text-pine-800' : 'text-clay',
                )}
              >
                {peso(Math.max(0, change))}
              </span>
            </div>
          )}

          {payError && (
            <p role="alert" className="mt-3 rounded-lg bg-clay/10 px-3 py-2 text-center text-xs font-medium text-clay">
              {payError}
            </p>
          )}
          <button
            className="btn-primary mt-3 w-full !py-3 !text-base"
            disabled={!canComplete}
            onClick={complete}
          >
            Complete sale
          </button>
          {method === 'cash' && tendered > 0 && change < 0 && (
            <p className="mt-2 text-center text-xs text-clay">
              Amount tendered is less than the total
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
