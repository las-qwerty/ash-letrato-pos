import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import type { Branch, Sale, StoreSettings } from '@simmy/core';
import { buildReceiptEscPos } from './escpos';
import { toast } from './toast';

const CLONE_CLS = 'print-clone';
const PAGE_CLS = 'print-page';
const SOURCE_SEL = '.receipt-print, .print-sheet';
const PX_PER_MM = 96 / 25.4;

/**
 * Prints via a clone appended to <body>. The real receipt lives inside a
 * fixed-position, overflow-clipped modal — in print, that truncates anything
 * taller than the viewport, so multi-item sales lost their tail items.
 * A top-level clone sits in normal document flow and paginates fully.
 * Installed once at boot (components/ota-updater.tsx); cleanup on afterprint.
 */
export function installPrintClone() {
  const onBefore = () => {
    document.querySelectorAll(`.${CLONE_CLS}, .${PAGE_CLS}`).forEach((n) => n.remove());
    const src = document.querySelector(SOURCE_SEL);
    if (!src) return;
    const clone = src.cloneNode(true) as HTMLElement;
    clone.classList.add(CLONE_CLS);
    document.body.appendChild(clone);
    if (clone.classList.contains('receipt-print')) {
      clone.style.display = 'block';
      const { width, height } = clone.getBoundingClientRect();
      const page = document.createElement('style');
      page.className = PAGE_CLS;
      page.textContent = `@page receipt { size: ${(width / PX_PER_MM).toFixed(2)}mm ${Math.ceil(height / PX_PER_MM) + 1}mm; margin: 0; }`;
      document.body.appendChild(page);
    }
  };
  const onAfter = () => {
    document.querySelectorAll(`.${CLONE_CLS}, .${PAGE_CLS}`).forEach((n) => n.remove());
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
 * thermal printer prints it silently, no browser print dialog. Detects a
 * missing RawBT install and warns instead of failing silently. Falls back
 * to window.print() everywhere else (web, iOS).
 */
export async function printReceipt(
  sale: Sale,
  settings: StoreSettings,
  branch?: Branch,
): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    const url = `rawbt:base64,${toBase64(buildReceiptEscPos(sale, settings, branch))}`;
    try {
      const { value } = await AppLauncher.canOpenUrl({ url });
      if (value) {
        await AppLauncher.openUrl({ url });
      } else {
        toast('Receipt printing needs the free “RawBT” app from Play Store — install it, then print again.');
      }
      return;
    } catch {
      // AppLauncher native side missing in this build — the WebView still
      // forwards the rawbt: scheme as an ACTION_VIEW intent.
      window.location.href = url;
      return;
    }
  }
  window.print();
}
