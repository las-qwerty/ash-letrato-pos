'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { buildDrawerEscPos, buildTestEscPos } from '@/lib/escpos';
import { loadPrinter, savePrinter, type DrawerMode, type PrinterConfig } from '@/lib/printer-config';
import { sendToPrinter } from '@/lib/print';
import { nativePrinterReady, ThermalPrinter, type PairedDevice } from '@/lib/thermal';
import { Field } from './ui';

const DRAWER_LABEL: Record<DrawerMode, string> = {
  cash: 'Open for cash sales',
  all: 'Open for every sale',
  off: 'Never open',
};

export function PrinterPanel() {
  const [cfg, setCfg] = useState<PrinterConfig>(() => loadPrinter());
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [native, setNative] = useState(false);
  useEffect(() => {
    void nativePrinterReady().then(setNative);
  }, []);
  const isIos = Capacitor.getPlatform() === 'ios';

  const update = (next: Partial<PrinterConfig>) => {
    const merged = { ...cfg, ...next };
    setCfg(merged);
    savePrinter(merged);
  };

  const run = async (done: string, fn: () => Promise<void>) => {
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: done });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong.' });
    }
  };

  const findPaired = () =>
    run('Paired printers loaded.', async () => {
      const { devices } = await ThermalPrinter.listPaired();
      setDevices(devices);
      if (!devices.length) throw new Error('No paired Bluetooth printers. Pair the BT-80UB in Android Settings first.');
    });

  const setHost = (value: string) => {
    const host = value.trim();
    update(host ? { host, btAddress: undefined, btName: undefined } : { host: undefined });
  };

  return (
    <div className="card space-y-5 p-5">
      <p className={`text-sm ${native ? 'text-pine-800' : 'text-stone-500'}`}>
        {native
          ? 'Direct printing is on. Receipts go straight to your printer, with no RawBT app needed.'
          : 'Direct printing works in the ASH LETRATO Android and iPad apps. In a browser, receipts use the system print dialog.'}
      </p>

      {!isIos && (
        <Field label="Bluetooth printer (Android tablet)">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary !py-1.5 text-xs" disabled={!native} onClick={findPaired}>
              Find paired printers
            </button>
            {cfg.btName && (
              <span className="text-sm">
                {cfg.btName} <span className="text-xs text-stone-400">{cfg.btAddress}</span>
              </span>
            )}
          </div>
          {devices.length > 0 && (
            <ul className="mt-2 space-y-1">
              {devices.map((d) => (
                <li key={d.address}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ring-1 ring-stone-200 hover:bg-stone-50"
                    onClick={() => update({ btAddress: d.address, btName: d.name, host: undefined })}
                  >
                    <span className="font-medium">{d.name}</span>
                    <span className="text-xs text-stone-400">{d.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
      )}

      <Field label="Network printer (Wi-Fi or Ethernet, works on iPad too)">
        <div className="flex items-center gap-2">
          <input
            className="input w-48"
            placeholder="192.168.0.50"
            value={cfg.host ?? ''}
            onChange={(e) => setHost(e.target.value)}
          />
          <input
            className="input w-24"
            type="number"
            min={1}
            max={65535}
            aria-label="Port"
            value={cfg.port}
            onChange={(e) => update({ port: parseInt(e.target.value) || 9100 })}
          />
        </div>
      </Field>

      <Field label="Cash drawer">
        <select className="input" value={cfg.drawer} onChange={(e) => update({ drawer: e.target.value as DrawerMode })}>
          {(Object.keys(DRAWER_LABEL) as DrawerMode[]).map((m) => (
            <option key={m} value={m}>
              {DRAWER_LABEL[m]}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-xs leading-relaxed text-stone-500">
        The drawer cable plugs into the printer&apos;s drawer port. Reprints from Transactions never open the drawer.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          disabled={!native}
          onClick={() => run('Test page sent.', () => sendToPrinter(buildTestEscPos(false)))}
        >
          Test print
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={!native}
          onClick={() => run('Drawer opened.', () => sendToPrinter(buildDrawerEscPos()))}
        >
          Open drawer
        </button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? 'text-pine-800' : 'text-clay'}`}>{msg.text}</p>}
    </div>
  );
}
