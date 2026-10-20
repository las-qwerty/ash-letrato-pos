'use client';

import type { Branch, Sale, StoreSettings } from '@simmy/core';
import { colsFor, receiptBlocks, type Block } from '@/lib/receipt-layout';

const COLUMN_MM = 1.5;

export function Receipt({
  sale,
  settings,
  branch,
}: {
  sale: Sale;
  settings: StoreSettings;
  branch?: Branch;
}) {
  const mm = settings.receiptWidthMm ?? 80;
  return (
    <div
      className="receipt-print mx-auto rounded-lg border border-dashed border-stone-300 bg-[#FDFCF9] text-stone-700 print:border-0"
      style={{ width: `${mm}mm` }}
    >
      {/* Paper width follows Settings → Receipt — cloned into the print
          stylesheet by lib/print.ts, so @page comes along for the ride. */}
      <style>{`@page receipt { size: ${mm}mm auto; margin: 0; }`}</style>
      <div className="receipt-paper" style={{ width: `${colsFor(mm) * COLUMN_MM}mm` }}>
        {receiptBlocks(sale, settings, branch).map((b, i) => (
          <BlockLine key={i} b={b} />
        ))}
      </div>
    </div>
  );
}

function BlockLine({ b }: { b: Block }) {
  if (b.k === 'bar') return <div className="receipt-bar" />;
  const cls = `${b.bold ? 'font-bold ' : ''}${b.big ? 'receipt-big' : ''}`;
  if (b.k === 'row')
    return (
      <div className={`flex justify-between gap-[2mm] whitespace-pre ${cls}`}>
        <span>{b.l}</span>
        <span>{b.r}</span>
      </div>
    );
  return (
    <div className={`whitespace-pre-wrap break-words ${b.center ? 'text-center ' : ''}${cls}`}>
      {b.s || '\u00a0'}
    </div>
  );
}
