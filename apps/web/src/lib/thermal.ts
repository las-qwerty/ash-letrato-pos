import { Capacitor, registerPlugin } from '@capacitor/core';

export type PairedDevice = { name: string; address: string };

export interface ThermalPrinterPlugin {
  ping(): Promise<{ ok: boolean }>;
  listPaired(): Promise<{ devices: PairedDevice[] }>;
  printData(opts: { data: string; address?: string; host?: string; port?: number }): Promise<void>;
}

export const ThermalPrinter = registerPlugin<ThermalPrinterPlugin>('ThermalPrinter');

let ready: Promise<boolean> | undefined;

export function nativePrinterReady(): Promise<boolean> {
  if (!ready) {
    ready = Capacitor.isNativePlatform()
      ? ThermalPrinter.ping().then(() => true, () => false)
      : Promise.resolve(false);
  }
  return ready;
}
