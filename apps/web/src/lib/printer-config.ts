export type DrawerMode = 'cash' | 'all' | 'off';

export type PrinterConfig = {
  btAddress?: string;
  btName?: string;
  host?: string;
  port: number;
  drawer: DrawerMode;
};

const KEY = 'ash-printer';
const DEFAULTS: PrinterConfig = { port: 9100, drawer: 'cash' };

export function loadPrinter(): PrinterConfig {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<PrinterConfig>) };
  } catch {
    return DEFAULTS;
  }
}

export function savePrinter(cfg: PrinterConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function drawerFor(cfg: PrinterConfig, paymentMethod: string, requested: boolean): boolean {
  return requested && (cfg.drawer === 'all' || (cfg.drawer === 'cash' && paymentMethod === 'cash'));
}
