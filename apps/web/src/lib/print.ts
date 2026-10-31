import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import type { Branch, Sale, StoreSettings } from '@simmy/core';
import { buildReceiptEscPos } from './escpos';
import { drawerFor, loadPrinter, saveLastPrint } from './printer-config';
import { nativePrinterReady, ThermalPrinter } from './thermal';
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
 * Native printing sends ESC/POS straight to the printer (Bluetooth or network
 * on Android, network on iPad). The drawer pulse rides in the same job when
 * the sale is cash. Builds without the native printer fall back to RawBT on
 * Android, and everything else uses window.print().
 */
export async function printReceipt(
  sale: Sale,
  settings: StoreSettings,
  branch?: Branch,
  opts: { drawer?: boolean } = {},
): Promise<void> {
  const cfg = loadPrinter();
  const drawer = drawerFor(cfg, sale.paymentMethod, !!opts.drawer);
  const bytes = buildReceiptEscPos(sale, settings, branch, { drawer });
  if (await nativePrinterReady()) {
    if (cfg.btAddress || cfg.host) {
      try {
        await sendToPrinter(bytes, { drawer });
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Printing failed.');
      }
      return;
    }
    if (Capacitor.getPlatform() === 'android') {
      saveLastPrint({ at: new Date().toISOString(), path: 'unset', drawer: drawer ? 'not-sent' : 'none', ok: false, error: 'No printer chosen.' });
      toast('Choose a printer in Settings → Printer first.');
      return;
    }
  }
  if (Capacitor.getPlatform() === 'android') {
    const url = `rawbt:base64,${toBase64(bytes)}`;
    try {
      const { value } = await AppLauncher.canOpenUrl({ url });
      const at = new Date().toISOString();
      if (value) {
        await AppLauncher.openUrl({ url });
        saveLastPrint({ at, path: 'rawbt', drawer: drawer ? 'sent' : 'none', ok: true });
      } else {
        saveLastPrint({ at, path: 'rawbt', drawer: drawer ? 'not-sent' : 'none', ok: false, error: 'RawBT is not installed.' });
        toast('Receipt printing needs the free “RawBT” app from Play Store — install it, then print again.');
      }
      return;
    } catch {
      // AppLauncher native side missing in this build — the WebView still
      // forwards the rawbt: scheme as an ACTION_VIEW intent.
      saveLastPrint({ at: new Date().toISOString(), path: 'rawbt', drawer: drawer ? 'sent' : 'none', ok: true });
      window.location.href = url;
      return;
    }
  }
  saveLastPrint({ at: new Date().toISOString(), path: 'browser', drawer: drawer ? 'unsupported' : 'none', ok: true });
  window.print();
}

export async function sendToPrinter(bytes: Uint8Array, receipt?: { drawer: boolean }): Promise<void> {
  if (!(await nativePrinterReady())) throw new Error('Direct printing needs the latest ASH LETRATO app (Android or iPad).');
  const cfg = loadPrinter();
  if (!cfg.btAddress && !cfg.host) throw new Error('Choose a printer in Settings → Printer first.');
  const path = cfg.host ? 'network' : 'bluetooth';
  const at = new Date().toISOString();
  try {
    await ThermalPrinter.printData({ data: toBase64(bytes), address: cfg.btAddress, host: cfg.host, port: cfg.port });
    if (receipt) saveLastPrint({ at, path, drawer: receipt.drawer ? 'sent' : 'none', ok: true });
  } catch (e) {
    if (receipt) {
      saveLastPrint({ at, path, drawer: receipt.drawer ? 'not-sent' : 'none', ok: false, error: e instanceof Error ? e.message : 'Printing failed.' });
    }
    throw e;
  }
}
