'use client';

import { fmtTime, fmtDate, peso, type Branch, type Sale, type StoreSettings } from '@simmy/core';

export function Receipt({
  sale,
  settings,
  branch,
}: {
  sale: Sale;
  settings: StoreSettings;
  branch?: Branch;
}) {
  const mm = settings.receiptWidthMm ?? 80;
  return (
    <div
      className="receipt-print mx-auto rounded-lg border border-dashed border-stone-300 bg-[#FDFCF9] p-5 font-mono text-[11px] leading-relaxed text-stone-700 print:border-0"
      style={{ width: `${mm}mm` }}
    >
      {/* Paper width follows Settings → Receipt — cloned into the print
          stylesheet by lib/print.ts, so @page comes along for the ride. */}
      <style>{`@page receipt { size: ${mm}mm auto; margin: 0; }`}</style>
      <div className="text-center">
        <p className="font-display text-base font-semibold tracking-wide text-ink">
          {settings.storeName}
        </p>
        {branch && <p>{branch.name}</p>}
        <p>{branch?.address ?? settings.addressLine1}</p>
        <p>{settings.addressLine2}</p>
        <p>TIN {settings.tin} · {settings.phone}</p>
      </div>

      <div className="my-3 border-t border-dashed border-stone-300" />

      <div className="flex justify-between">
        <span>{sale.invoiceNumber}</span>
        <span>{fmtDate(sale.createdAt)} {fmtTime(sale.createdAt)}</span>
      </div>
      <p>Cashier: {sale.cashierName}</p>
      {sale.customerName && <p>Customer: {sale.customerName}</p>}

      <div className="my-3 border-t border-dashed border-stone-300" />

      {sale.lines.map((l, i) => (
        <div key={i} className="mb-1">
          <p>{l.name}</p>
          <div className="flex justify-between pl-3">
            <span>{l.qty} × {peso(l.unitPrice)}</span>
            <span>{peso(l.total)}</span>
          </div>
        </div>
      ))}

      <div className="my-3 border-t border-dashed border-stone-300" />

      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span><span>{peso(sale.subtotal)}</span>
        </div>
        {sale.discountTotal > 0 && (
          <div className="flex justify-between">
            <span>Less: Discounts</span><span>−{peso(sale.discountTotal)}</span>
          </div>
        )}
        {sale.vatExempt && (
          <div className="flex justify-between">
            <span>VAT-Exempt Sale</span><span>—</span>
          </div>
        )}
        {sale.fees?.map((f) => (
          <div key={f.label} className="flex justify-between">
            <span>{f.label}</span><span>+{peso(f.amount)}</span>
          </div>
        ))}
        {!sale.vatExempt && (
          <div className="flex justify-between text-stone-500">
            <span>VAT (incl.)</span><span>{peso(sale.taxTotal)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 text-sm font-bold text-ink">
          <span>TOTAL</span><span>{peso(sale.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="uppercase">{sale.paymentMethod}</span><span>{peso(sale.amountTendered)}</span>
        </div>
        <div className="flex justify-between">
          <span>Change</span><span>{peso(sale.change)}</span>
        </div>
      </div>

      {sale.pointsEarned > 0 && (
        <>
          <div className="my-3 border-t border-dashed border-stone-300" />
          <p>Loyalty points earned: {sale.pointsEarned}</p>
        </>
      )}

      <div className="my-3 border-t border-dashed border-stone-300" />
      {settings.receiptFooter.split(/\n|<br\s*\/?>/i).map((l, i) => (
        <p key={i} className="text-center font-bold">
          {l}
        </p>
      ))}
      <div className="mt-3 border-t border-dashed border-stone-300" />
    </div>
  );
}
