import { Capacitor } from '@capacitor/core';
import type { Sale, StoreSettings } from '@simmy/core';
import { buildReceiptEscPos } from './escpos';

const CLONE_CLS = 'print-clone';
const SOURCE_SEL = '.receipt-print, .print-sheet';

/**
 * Prints via a clone appended to <body>. The real receipt lives inside a
 * fixed-position, overflow-clipped modal — in print, that truncates anything
 * taller than the viewport, so multi-item sales lost their tail items.
 * A top-level clone sits in normal document flow and paginates fully.
 * Installed once at boot (components/ota-updater.tsx); cleanup on afterprint.
 */
export function installPrintClone() {
  const onBefore = () => {
    document.querySelectorAll(`.${CLONE_CLS}`).forEach((n) => n.remove());
    const src = document.querySelector(SOURCE_SEL);
    if (!src) return;
    const clone = src.cloneNode(true) as HTMLElement;
    clone.classList.add(CLONE_CLS);
    document.body.appendChild(clone);
  };
  const onAfter = () => {
    document.querySelectorAll(`.${CLONE_CLS}`).forEach((n) => n.remove());
  };
  window.addEventListener('beforeprint', onBefore);
  window.addEventListener('afterprint', onAfter);
  return () => {
    window.removeEventListener('beforeprint', onBefore);
    window.removeEventListener('afterprint', onAfter);
  };
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * On Android builds, hand the receipt to RawBT as raw ESC/POS — the paired
 * thermal printer prints it silently, no browser print dialog. The WebView
 * intercepts the rawbt: scheme and launches it as an ACTION_VIEW intent.
 * Falls back to window.print() everywhere else (web, iOS). Requires the
 * RawBT app installed and the printer selected inside it.
 */
export function printReceipt(sale: Sale, settings: StoreSettings): void {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    window.location.href = `rawbt:base64,${toBase64(buildReceiptEscPos(sale, settings))}`;
    return;
  }
  window.print();
}
