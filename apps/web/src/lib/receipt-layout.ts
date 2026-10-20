import { peso, type Branch, type Sale, type StoreSettings } from '@simmy/core';

/** Printable columns (Font A) per paper width. */
export function colsFor(mm: number): number {
  if (mm >= 80) return 42;
  if (mm >= 72) return 38;
  return 32;
}

/** Strip characters ESC/POS basic charset can't print. */
function ascii(s: string): string {
  return s
    .replace(/\u20b1/g, 'P')
    .replace(/[\u00d7\u2715]/g, 'x')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2022\u00b7]/g, '*')
    .replace(/[^\x20-\x7e]/g, '');
}

function money(n: number): string {
  return ascii(peso(n));
}

type Style = { center?: boolean; bold?: boolean; big?: boolean };

export type Block =
  | ({ k: 'text'; s: string } & Style)
  | ({ k: 'row'; l: string; r: string } & Style)
  | { k: 'bar' };

const text = (s = '', o: Style = {}): Block => ({ k: 'text', s: ascii(s), ...o });
const row = (l: string, r: string, o: Style = {}): Block => ({ k: 'row', l: ascii(l), r: ascii(r), ...o });
const bar: Block = { k: 'bar' };

export function receiptBlocks(sale: Sale, settings: StoreSettings, branch?: Branch): Block[] {
  const at = new Date(sale.createdAt);
  // Header — centered, store name double-size
  const header = [
    text(settings.storeName, { center: true, bold: true, big: true }),
    text(branch?.address ?? settings.addressLine1, { center: true }),
    text(settings.addressLine2, { center: true }),
    text(`TIN ${settings.tin} - ${settings.phone}`, { center: true }),
  ];
  // Invoice meta — left aligned
  const meta = [
    text(sale.invoiceNumber),
    row(at.toLocaleDateString('en-PH'), at.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })),
    text(`Cashier: ${sale.cashierName}`),
    ...(sale.customerName ? [text(`Customer: ${sale.customerName}`)] : []),
  ];
  // Line items — product name, then qty x price …… total
  const items = sale.lines.flatMap((l) => [
    text(l.name, { bold: true }),
    row(`   ${l.qty} x ${money(l.unitPrice)}`, money(l.total)),
  ]);
  // Totals
  const totals = [
    row('Subtotal', money(sale.subtotal)),
    ...(sale.discountTotal > 0 ? [row('Less: Discounts', `-${money(sale.discountTotal)}`)] : []),
    ...(sale.vatExempt ? [row('VAT-Exempt Sale', '-')] : []),
    ...(sale.fees ?? []).map((f) => row(f.label, `+${money(f.amount)}`)),
    ...(sale.vatExempt ? [] : [row('VAT (incl.)', money(sale.taxTotal))]),
    row('TOTAL', money(sale.total), { bold: true, big: true }),
    row(sale.paymentMethod.toUpperCase(), money(sale.amountTendered), { bold: true }),
    row('Change', money(sale.change), { bold: true }),
  ];
  const loyalty = sale.pointsEarned > 0 ? [bar, text(`Loyalty points earned: ${sale.pointsEarned}`)] : [];
  // Footer — one physical line per \n or <br> in the configured text
  const footer = settings.receiptFooter.split(/\n|<br\s*\/?>/i).map((l) => text(l, { center: true, bold: true }));
  return [...header, bar, ...meta, bar, ...items, bar, ...totals, ...loyalty, bar, ...footer, bar];
}
