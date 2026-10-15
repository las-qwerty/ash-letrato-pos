'use client';

import clsx from 'clsx';

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function Pagination({
  page,
  perPage,
  total,
  pageCount,
  onPage,
  onPerPage,
}: {
  page: number;
  perPage: number;
  total: number;
  pageCount: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  // windowed page numbers: first, last, and 2 around current
  const nums: number[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) nums.push(i);
  }
  const withEllipsis: (number | '…')[] = [];
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) withEllipsis.push('…');
    withEllipsis.push(n);
    prev = n;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-5 py-3">
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span>
          {from}–{to} of {total}
        </span>
        <span aria-hidden>·</span>
        <label className="flex items-center gap-1.5">
          Rows
          <select
            className="input !w-auto !px-1.5 !py-1 text-xs"
            value={perPage}
            onChange={(e) => onPerPage(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="btn-ghost !px-2 !py-1 text-xs"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          ‹ Prev
        </button>
        {withEllipsis.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="px-1 text-xs text-stone-400">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n)}
              className={clsx(
                'min-w-7 rounded-md px-2 py-1 text-xs font-medium tabular-nums transition',
                n === page
                  ? 'bg-pine-800 text-white'
                  : 'text-stone-500 hover:bg-stone-100',
              )}
              aria-current={n === page ? 'page' : undefined}
            >
              {n}
            </button>
          ),
        )}
        <button
          className="btn-ghost !px-2 !py-1 text-xs"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next ›
        </button>
      </div>
    </div>
  );
}
