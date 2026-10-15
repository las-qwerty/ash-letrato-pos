'use client';

import { useMemo, useState } from 'react';
import { encodeCode128 } from '@simmy/core';
import { Modal, Field } from '@/components/ui';

/** Render a Code 128-B barcode as inline SVG. */
export function Barcode({
  value,
  height = 48,
  showText = true,
  className,
}: {
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
}) {
  const enc = encodeCode128(value);
  if (!enc) {
    return <span className={className}>{value}</span>;
  }
  const rects: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < enc.widths.length; i += 2) {
    const bar = enc.widths[i] ?? 0;
    rects.push({ x, w: bar });
    x += bar + (enc.widths[i + 1] ?? 0);
  }
  const textH = showText ? 14 : 0;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${enc.modules} ${height + textH}`}
      role="img"
      aria-label={`Barcode ${value}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={0} width={r.w} height={height} fill="currentColor" />
      ))}
      {showText && (
        <text
          x={enc.modules / 2}
          y={height + 11}
          textAnchor="middle"
          fontSize="10"
          fontFamily="monospace"
          fill="currentColor"
        >
          {value}
        </text>
      )}
    </svg>
  );
}

/** Modal that previews a barcode label and prints N copies via window.print(). */
export function BarcodePrintModal({
  code,
  title,
  sub,
  open,
  onClose,
}: {
  code: string;
  title: string;
  sub?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [copies, setCopies] = useState(1);
  const valid = useMemo(() => !!encodeCode128(code), [code]);

  return (
    <Modal open={open} onClose={onClose} title="Print barcode label">
      <div className="space-y-4">
        {valid ? (
          <div className="print-sheet mx-auto flex w-72 flex-col items-center rounded-lg border border-dashed border-stone-300 bg-white p-4">
            <p className="mb-1 text-center text-xs font-medium">{title}</p>
            {sub && <p className="mb-2 text-center text-[10px] text-stone-500">{sub}</p>}
            <Barcode value={code} height={52} className="w-full text-ink" />
          </div>
        ) : (
          <p className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
            “{code}” contains characters Code 128-B can’t encode — use letters, digits, and common symbols.
          </p>
        )}
        {valid && (
          <Field label="Copies">
            <input
              className="input text-center"
              type="number"
              min={1}
              max={99}
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </Field>
        )}
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-primary flex-1"
            disabled={!valid}
            onClick={() => window.print()}
          >
            Print label{copies > 1 ? `s (${copies})` : ''}
          </button>
        </div>
      </div>
    </Modal>
  );
}
