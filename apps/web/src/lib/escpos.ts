import { peso, type Branch, type Sale, type StoreSettings } from '@simmy/core';

// ESC/POS commands
const INIT = [0x1b, 0x40];
const ALIGN_LEFT = [0x1b, 0x61, 0x00];
const ALIGN_CENTER = [0x1b, 0x61, 0x01];
const BOLD_ON = [0x1b, 0x45, 0x01];
const BOLD_OFF = [0x1b, 0x45, 0x00];
const DOUBLE = [0x1d, 0x21, 0x11]; // 2x width + height
const NORMAL_SIZE = [0x1d, 0x21, 0x00];
const FEED_CUT = [0x1b, 0x64, 0x04, 0x1d, 0x56, 0x42, 0x00]; // feed 4, partial cut

/** Printable columns (Font A) per paper width. */
function colsFor(mm: number): number {
  if (mm >= 80) return 42;
  if (mm >= 72) return 38;
  return 32;
}

/** Strip characters ESC/POS basic charset can't print. */
function ascii(s: string): string {
  return s
    .replace(/₱/g, 'P')
    .replace(/[×✕]/g, 'x')
    .replace(/[–—]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[•·]/g, '*')
    .replace(/[^\x20-\x7e]/g, '');
}

function money(n: number): string {
  return ascii(peso(n));
}

/** Pad/truncate a left/right pair to exactly `w` columns. */
function row(left: string, right: string, w: number): string {
  left = left.length > w - right.length - 1 ? left.slice(0, w - right.length - 1) : left;
  return left + ' '.repeat(Math.max(1, w - left.length - right.length)) + right;
}

/**
 * Build the raw ESC/POS byte stream for a sale receipt. Sent to the printer
 * via RawBT (rawbt:base64 intent) — native text printing, so it is sharp,
 * instant, and prints the full length regardless of viewport.
 */
export function buildReceiptEscPos(
  sale: Sale,
  settings: StoreSettings,
  branch?: Branch,
): Uint8Array {
  const mm = settings.receiptWidthMm ?? 80;
  const w = colsFor(mm);
  // Printable dot-width per paper size (≈203dpi, kept inside the margins).
  const barBytes = mm >= 80 ? 64 : mm >= 72 ? 56 : 48;
  const out: number[] = [];

  const text = (s: string) => {
    for (const ch of ascii(s)) out.push(ch.charCodeAt(0));
  };
  const cmd = (...bytes: number[]) => out.push(...bytes);
  const line = (s = '') => {
    text(s);
    out.push(0x0a);
  };
  // Separators print as a raw raster bar (GS v 0) — solid burned pixels
  // across the full width, not glyph strokes, so it can't wash out.
  const dividerLine = () => {
    cmd(0x1d, 0x76, 0x30, 0x00, barBytes, 0x00, 0x08, 0x00);
    for (let i = 0; i < barBytes * 8; i++) out.push(0xff);
    out.push(0x0a);
  };

  cmd(...INIT);

  // Header — centered, store name double-size
  cmd(...ALIGN_CENTER);
  cmd(...BOLD_ON, ...DOUBLE);
  line(settings.storeName);
  cmd(...NORMAL_SIZE, ...BOLD_OFF);
  if (branch) line(branch.name);
  line(branch?.address ?? settings.addressLine1);
  line(settings.addressLine2);
  line(`TIN ${settings.tin} - ${settings.phone}`);
  dividerLine();

  // Invoice meta — left aligned
  cmd(...ALIGN_LEFT);
  line(row(sale.invoiceNumber, '', w));
  line(row(new Date(sale.createdAt).toLocaleDateString('en-PH'), new Date(sale.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }), w));
  line(`Cashier: ${sale.cashierName}`);
  if (sale.customerName) line(`Customer: ${sale.customerName}`);
  dividerLine();

  // Line items — product name, then qty x price …… total
  for (const l of sale.lines) {
    cmd(...BOLD_ON);
    line(l.name);
    cmd(...BOLD_OFF);
    line(row(`   ${l.qty} x ${money(l.unitPrice)}`, money(l.total), w));
  }
  dividerLine();

  // Totals
  line(row('Subtotal', money(sale.subtotal), w));
  if (sale.discountTotal > 0) line(row('Less: Discounts', `-${money(sale.discountTotal)}`, w));
  if (sale.vatExempt) line(row('VAT-Exempt Sale', '-', w));
  for (const f of sale.fees ?? []) line(row(f.label, `+${money(f.amount)}`, w));
  if (!sale.vatExempt) line(row('VAT (incl.)', money(sale.taxTotal), w));

  cmd(...BOLD_ON, ...DOUBLE);
  line(row('TOTAL', money(sale.total), w / 2));
  cmd(...NORMAL_SIZE);
  line(row(sale.paymentMethod.toUpperCase(), money(sale.amountTendered), w));
  line(row('Change', money(sale.change), w));
  cmd(...BOLD_OFF);

  if (sale.pointsEarned > 0) {
    dividerLine();
    line(`Loyalty points earned: ${sale.pointsEarned}`);
  }

  // Footer — one physical line per \n in the configured text
  dividerLine();
  cmd(...ALIGN_CENTER, ...BOLD_ON);
  for (const l of settings.receiptFooter.split('\n')) line(l);
  cmd(...BOLD_OFF);
  out.push(0x0a, 0x0a);

  cmd(...FEED_CUT);
  return new Uint8Array(out);
}
