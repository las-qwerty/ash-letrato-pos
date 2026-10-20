import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
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

function printToast(msg: string) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText =
    'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;' +
    'background:#1d232d;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;' +
    'box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:90vw;text-align:center;';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

/**
 * On Android builds, hand the receipt to RawBT as raw ESC/POS — the paired
 * thermal printer prints it silently, no browser print dialog. Detects a
 * missing RawBT install and warns instead of failing silently. Falls back
 * to window.print() everywhere else (web, iOS).
 */
export async function printReceipt(sale: Sale, settings: StoreSettings): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    const url = `rawbt:base64,${toBase64(buildReceiptEscPos(sale, settings))}`;
    try {
      const { value } = await AppLauncher.canOpenUrl({ url });
      if (value) {
        await AppLauncher.openUrl({ url });
      } else {
        printToast('Receipt printing needs the free “RawBT” app from Play Store — install it, then print again.');
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
