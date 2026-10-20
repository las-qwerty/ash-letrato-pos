import type { Branch, Sale, StoreSettings } from '@simmy/core';
import { colsFor, receiptBlocks } from './receipt-layout';

// ESC/POS commands
const INIT = [0x1b, 0x40];
const ALIGN_LEFT = [0x1b, 0x61, 0x00];
const ALIGN_CENTER = [0x1b, 0x61, 0x01];
const BOLD_ON = [0x1b, 0x45, 0x01];
const BOLD_OFF = [0x1b, 0x45, 0x00];
const DOUBLE = [0x1d, 0x21, 0x11]; // 2x width + height
const NORMAL_SIZE = [0x1d, 0x21, 0x00];
const FEED_CUT = [0x1b, 0x64, 0x08, 0x1d, 0x56, 0x42, 0x00]; // feed 8, partial cut

/** Pad/truncate a left/right pair to exactly `w` columns. */
function row(left: string, right: string, w: number): string {
  left = left.length > w - right.length - 1 ? left.slice(0, w - right.length - 1) : left;
  return left + ' '.repeat(Math.max(1, w - left.length - right.length)) + right;
}

function wrap(s: string, w: number): string[] {
  if (s.length <= w) return [s];
  const lines: string[] = [];
  let cur = '';
  for (const word of s.split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length > w && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  lines.push(cur);
  return lines;
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
  const out: number[] = [...INIT];

  // Separators print as a raw raster bar (GS v 0) — solid burned pixels
  // across the full width, not glyph strokes, so it can't wash out.
  const dividerLine = () => {
    out.push(0x0a, 0x1d, 0x76, 0x30, 0x00, barBytes, 0x00, 0x08, 0x00);
    for (let i = 0; i < barBytes * 8; i++) out.push(0xff);
    out.push(0x0a, 0x0a);
  };

  for (const b of receiptBlocks(sale, settings, branch)) {
    if (b.k === 'bar') {
      dividerLine();
      continue;
    }
    out.push(...(b.center ? ALIGN_CENTER : ALIGN_LEFT), ...(b.bold ? BOLD_ON : BOLD_OFF), ...(b.big ? DOUBLE : NORMAL_SIZE));
    const cols = b.big ? w / 2 : w;
    for (const line of b.k === 'row' ? [row(b.l, b.r, cols)] : wrap(b.s, cols)) {
      for (const ch of line) out.push(ch.charCodeAt(0));
      out.push(0x0a);
    }
  }

  out.push(0x0a, 0x0a, ...FEED_CUT);
  return new Uint8Array(out);
}
