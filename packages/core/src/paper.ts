import type { PrintSides } from './types';

export const DEFAULT_SHEETS_PER_PACK = 500;

/**
 * Physical sheets a print or copy job uses. Back-to-back printing puts two
 * pages on each sheet, so an odd page count rounds up per copy.
 */
export function paperSheets(pages: number, copies: number, sides: PrintSides): number {
  const perCopy = Math.max(0, Math.floor(pages));
  const count = Math.max(1, Math.floor(copies));
  return (sides === 'duplex' ? Math.ceil(perCopy / 2) : perCopy) * count;
}

/** Pages billed: pages per copy × copies. Sides don't change the price. */
export const printedPages = (pages: number, copies: number) =>
  Math.max(0, Math.floor(pages)) * Math.max(1, Math.floor(copies));

/** "3 reams + 120 sheets" — paper is counted in reams, recorded in sheets. */
export function formatSheets(sheets: number, perPack = DEFAULT_SHEETS_PER_PACK, packUnit = 'ream'): string {
  const whole = Math.round(sheets);
  if (whole < 0) return `${whole} sheets (over-drawn)`;
  const packs = Math.floor(whole / perPack);
  const rest = whole - packs * perPack;
  const packLabel = `${packs} ${packUnit}${packs === 1 ? '' : 's'}`;
  if (packs === 0) return `${rest} sheets`;
  return rest === 0 ? packLabel : `${packLabel} + ${rest} sheets`;
}
