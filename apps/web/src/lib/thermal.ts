import { Capacitor, registerPlugin } from '@capacitor/core';

export type PairedDevice = { name: string; address: string };

export interface ThermalPrinterPlugin {
  ping(): Promise<{ ok: boolean }>;
  listPaired(): Promise<{ devices: PairedDevice[] }>;
  printData(opts: { data: string; address?: string; host?: string; port?: number }): Promise<void>;
}

export const ThermalPrinter = registerPlugin<ThermalPrinterPlugin>('ThermalPrinter');

let native: boolean | undefined;

export async function nativePrinterReady(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (native !== undefined) return native;
  const probe = ThermalPrinter.ping().then(() => true, () => false);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
  const answer = await Promise.race([probe, timeout]);
  if (answer !== null) native = answer;
  return answer ?? false;
}
