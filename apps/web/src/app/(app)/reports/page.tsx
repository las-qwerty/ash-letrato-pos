'use client';

import { useMemo, useState } from 'react';
import { fmtDate, fmtTime, peso, type Sale } from '@simmy/core';
import { Badge, EmptyState, PageHeader, Stat } from '@/components/ui';
import { IconChart, IconDownload, IconSearch, IconShield } from '@/components/icons';
import { Pagination } from '@/components/pagination';
import { downloadXlsx } from '@/lib/excel';
import { usePager } from '@/lib/use-pager';
import { useBranchScope, useStore } from '@/lib/store';
import clsx from 'clsx';

type Range = 'today' | '7d' | '30d' | 'custom';

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const rangeStart = (r: Range, custom: string) => {
  const d = new Date();
  if (r === 'today') d.setHours(0, 0, 0, 0);
  else if (r === '7d') d.setDate(d.getDate() - 6);
  else if (r === '30d') d.setDate(d.getDate() - 29);
  else return new Date(`${custom}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function ReportsPage() {
  const sales = useStore((s) => s.sales);
  const branches = useStore((s) => s.branches);
  const scope = useBranchScope();
  const [range, setRange] = useState<Range>('7d');
  const [customStart, setCustomStart] = useState(isoDay(new Date(Date.now() - 7 * 86400000)));
  const [customEnd, setCustomEnd] = useState(isoDay(new Date()));
  const [branchPick, setBranchPick] = useState<'all' | string>('all');
  // Non-owner roles are pinned to their own branch — the picker is hidden and
  // the effective filter is forced to their scope.
  const branchId = scope === 'all' ? branchPick : scope;
  const [payFilter, setPayFilter] = useState<'all' | string>('all');

  const from = useMemo(() => rangeStart(range, customStart), [range, customStart]);
  const to = useMemo(
    () => (range === 'custom' ? new Date(`${customEnd}T23:59:59`) : new Date()),
    [range, customEnd],
  );

  const scoped = useMemo(
    () =>
      sales.filter(
        (s) =>
          new Date(s.createdAt) >= from &&
          new Date(s.createdAt) <= to &&
          (branchId === 'all' || s.branchId === branchId) &&
          (payFilter === 'all' || s.paymentMethod === payFilter),
      ),
    [sales, from, to, branchId, payFilter],
  );

  const completed = scoped.filter((s) => s.status === 'completed');
  const gross = completed.reduce((a, s) => a + s.total + s.discountTotal, 0);
  const revenue = completed.reduce((a, s) => a + s.total, 0);
  const discounts = completed.reduce((a, s) => a + s.discountTotal, 0);
  const refunds = scoped.filter((s) => s.status === 'refunded');
  const refundAmt = refunds.reduce((a, s) => a + s.total, 0);
  const voids = scoped.filter((s) => s.status === 'voided');
  const avgTicket = completed.length ? revenue / completed.length : 0;

  // Previous-period comparison (same length, immediately before).
  const prevRevenue = useMemo(() => {
    const span = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - span - 1);
    const prevTo = new Date(from.getTime() - 1);
    return sales
      .filter(
        (s) =>
          s.status === 'completed' &&
          new Date(s.createdAt) >= prevFrom &&
          new Date(s.createdAt) <= prevTo &&
          (branchId === 'all' || s.branchId === branchId),
      )
      .reduce((a, s) => a + s.total, 0);
  }, [sales, from, to, branchId]);
  const delta = prevRevenue > 0 ? (revenue - prevRevenue) / prevRevenue : null;

  // Sales buckets: daily (≤ 62 days) or monthly — keyed on local dates.
  const buckets = useMemo(() => {
    const localDay = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    const out: { label: string; key: string; total: number }[] = [];
    if (days <= 62) {
      for (let i = 0; i < days; i++) {
        const d = new Date(from.getTime() + i * 86400000);
        const key = localDay(d);
        out.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, key, total: 0 });
      }
      const map = new Map(out.map((b) => [b.key, b]));
      for (const s of completed) {
        const b = map.get(localDay(new Date(s.createdAt)));
        if (b) b.total += s.total;
      }
    } else {
      const seen = new Map<string, { label: string; key: string; total: number }>();
      for (const s of completed) {
        const d = new Date(s.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!seen.has(key)) {
          seen.set(key, {
            key,
            label: d.toLocaleString('en', { month: 'short', year: '2-digit' }),
            total: 0,
          });
        }
        seen.get(key)!.total += s.total;
      }
      out.push(...[...seen.values()].sort((a, b) => a.key.localeCompare(b.key)));
    }
    return out;
  }, [completed, from, to]);

  const byPayment = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of completed) m.set(s.paymentMethod, (m.get(s.paymentMethod) ?? 0) + s.total);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [completed]);
  const maxPay = Math.max(...byPayment.map(([, v]) => v), 1);

  const byBranch = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of completed) m.set(s.branchId, (m.get(s.branchId) ?? 0) + s.total);
    return branches
      .map((b) => ({ name: b.name, total: m.get(b.id) ?? 0 }))
      .filter((b) => b.total > 0 || branchId === 'all')
      .sort((a, b) => b.total - a.total);
  }, [completed, branches, branchId]);
  const maxBranch = Math.max(...byBranch.map((b) => b.total), 1);

  const topItems = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; total: number }>();
    for (const s of completed)
      for (const l of s.lines) {
        const e = m.get(l.name) ?? { name: l.name, qty: 0, total: 0 };
        e.qty += l.qty;
        e.total += l.total;
        m.set(l.name, e);
      }
    return [...m.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  }, [completed]);

  const voidsRefunds = scoped.filter((s) => s.status !== 'completed');

  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const exportReport = () => {
    if (scoped.length === 0) {
      setExportMsg('Nothing to export in this range.');
      return;
    }
    const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;
    const ok = downloadXlsx(`ash-letrato-report-${isoDay(from)}_to_${isoDay(to)}`, [
      {
        name: 'Transactions',
        rows: [
          ['Date', 'Invoice', 'Branch', 'Cashier', 'Customer', 'Items', 'Qty', 'Payment', 'Gross', 'Discount', 'Net', 'Status', 'Authorized by', 'Reason'],
          ...scoped.map((s: Sale) => [
            `${fmtDate(s.createdAt)} ${fmtTime(s.createdAt)}`,
            s.invoiceNumber,
            branchName(s.branchId),
            s.cashierName,
            s.customerName ?? 'Walk-in',
            s.lines.map((l) => l.name).join('; '),
            s.lines.reduce((a, l) => a + l.qty, 0),
            s.paymentMethod.toUpperCase(),
            s.total + s.discountTotal,
            s.discountTotal,
            s.total,
            s.status,
            s.authorizedBy ?? '',
            s.voidReason ?? '',
          ]),
          [],
          ['TOTALS', '', '', '', '', '', '', '', gross, discounts, revenue],
        ],
      },
      {
        name: 'Summary',
        rows: [
          ['ASH LETRATO POS — sales report'],
          [`Period: ${isoDay(from)} to ${isoDay(to)}`],
          [`Branch: ${branchId === 'all' ? 'All branches' : branchName(branchId)}`],
          [],
          ['Gross sales', gross],
          ['Discounts', discounts],
          ['Net sales', revenue],
          ['Refunded', refundAmt],
          ['Transactions', completed.length],
          ['Avg transaction', Math.round(avgTicket * 100) / 100],
          ['Voided', voids.length],
        ],
      },
      {
        name: 'By branch',
        rows: [
          ['Branch', 'Net sales'],
          ...byBranch.map((b) => [b.name, b.total]),
        ],
      },
    ]);
    setExportMsg(ok ? 'Workbook downloaded.' : 'Export failed — try again.');
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Reports"
        sub="Sales performance, branch comparison, and audit trail"
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            {(['today', '7d', '30d', 'custom'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={clsx(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
                  range === r
                    ? 'bg-pine-800 text-white'
                    : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300',
                )}
              >
                {r === '7d' ? '7 days' : r === '30d' ? '30 days' : r === 'custom' ? 'Custom' : 'Today'}
              </button>
            ))}
            {range === 'custom' && (
              <>
                <input type="date" className="input !w-auto !py-1.5 text-xs" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                <span className="text-xs text-stone-400">→</span>
                <input type="date" className="input !w-auto !py-1.5 text-xs" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </>
            )}
            <button className="btn-secondary !py-1.5 text-xs" onClick={exportReport}>
              <IconDownload width={13} height={13} /> Export
            </button>
          </div>
        }
      />
      {exportMsg && (
        <p className="mb-4 rounded-lg bg-paper px-4 py-2 text-xs text-stone-600 ring-1 ring-stone-200">{exportMsg}</p>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        {scope === 'all' ? (
          <select className="input !w-44 !py-1.5 text-xs" value={branchId} onChange={(e) => setBranchPick(e.target.value)} aria-label="Branch">
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        ) : (
          <span className="rounded-full bg-pine-50 px-3 py-1.5 text-xs font-medium text-pine-800 ring-1 ring-pine-200">
            {branches.find((b) => b.id === scope)?.name ?? 'My branch'}
          </span>
        )}
        <select className="input !w-40 !py-1.5 text-xs" value={payFilter} onChange={(e) => setPayFilter(e.target.value)} aria-label="Payment method">
          <option value="all">All payments</option>
          {['cash', 'gcash', 'maya', 'card'].map((m) => (
            <option key={m} value={m}>{m.toUpperCase()}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Stat label="Gross sales" value={peso(gross)} />
        <Stat
          label="Net sales"
          value={peso(revenue)}
          hint={delta != null ? `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(0)}% vs prior period` : undefined}
        />
        <Stat label="Transactions" value={completed.length} hint={`avg ${peso(avgTicket)}`} />
        <Stat label="Discounts" value={peso(discounts)} />
        <Stat label={`Refunds (${refunds.length})`} value={peso(refundAmt)} hint={`${voids.length} voided`} />
      </div>

      {/* Sales over period */}
      <div className="card mt-4 p-5">
        <h2 className="mb-4 font-display text-lg font-medium">Sales over period</h2>
        {buckets.length > 0 ? (
          <PeriodChart buckets={buckets} />
        ) : (
          <EmptyState icon={<IconChart width={36} height={36} />} title="No sales in range" hint="Widen the date range or clear filters." />
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="mb-4 font-display text-lg font-medium">By payment method</h2>
          <div className="space-y-3">
            {byPayment.map(([method, total]) => (
              <div key={method}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium uppercase">{method}</span>
                  <span className="tabular-nums text-stone-500">{peso(total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-pine-600" style={{ width: `${(total / maxPay) * 100}%` }} />
                </div>
              </div>
            ))}
            {byPayment.length === 0 && <p className="text-sm text-stone-400">No sales in range.</p>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-display text-lg font-medium">By branch</h2>
          <div className="space-y-3">
            {byBranch.map((b) => (
              <div key={b.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{b.name}</span>
                  <span className="tabular-nums text-stone-500">{peso(b.total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-brass-500" style={{ width: `${(b.total / maxBranch) * 100}%` }} />
                </div>
              </div>
            ))}
            {byBranch.length === 0 && <p className="text-sm text-stone-400">No branch sales in range.</p>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-display text-lg font-medium">Top items</h2>
          <ol className="space-y-2.5">
            {topItems.map((t, i) => (
              <li key={t.name} className="flex items-baseline gap-3 text-sm">
                <span className="w-4 text-xs text-stone-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                <span className="text-xs text-stone-400">×{t.qty}</span>
                <span className="tabular-nums text-stone-500">{peso(t.total)}</span>
              </li>
            ))}
            {topItems.length === 0 && <p className="text-sm text-stone-400">No items sold in range.</p>}
          </ol>
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <h2 className="border-b border-stone-100 px-5 py-3.5 font-display text-lg font-medium">
          Void &amp; refund audit
        </h2>
        <table className="w-full">
          <thead className="border-b border-stone-200 bg-paper/60">
            <tr>
              <th className="th">Invoice</th>
              <th className="th">When</th>
              <th className="th">Type</th>
              <th className="th">Reason</th>
              <th className="th">Authorized by</th>
              <th className="th text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {voidsRefunds.map((s) => (
              <tr key={s.id} className="border-b border-stone-100 last:border-0">
                <td className="td font-medium">{s.invoiceNumber}</td>
                <td className="td text-stone-500">{fmtDate(s.createdAt)} {fmtTime(s.createdAt)}</td>
                <td className="td">
                  <Badge tone={s.status === 'voided' ? 'clay' : 'brass'}>{s.status}</Badge>
                </td>
                <td className="td max-w-xs truncate text-stone-500">{s.voidReason}</td>
                <td className="td">{s.authorizedBy}</td>
                <td className="td text-right tabular-nums">{peso(s.total)}</td>
              </tr>
            ))}
            {voidsRefunds.length === 0 && (
              <tr><td colSpan={6} className="td py-10 text-center text-stone-400">Clean period — no voids or refunds</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AuditTrail />
    </div>
  );
}

/** Append-only log of sensitive actions — voids, refunds, transfers, corrections, payroll steps. */
function AuditTrail() {
  const auditLog = useStore((s) => s.auditLog);
  const branches = useStore((s) => s.branches);
  const scope = useBranchScope();
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return auditLog
      .filter((e) => scope === 'all' || !e.branchId || e.branchId === scope)
      .filter(
        (e) =>
          !needle ||
          e.action.toLowerCase().includes(needle) ||
          e.actorName.toLowerCase().includes(needle) ||
          (e.detail ?? '').toLowerCase().includes(needle),
      );
  }, [auditLog, q, scope]);
  const pager = usePager(filtered, 25, [q, scope]);
  const branchName = (id?: string) => (id ? branches.find((b) => b.id === id)?.name ?? id : '—');

  return (
    <div className="card mt-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
        <h2 className="font-display text-lg font-medium">Audit trail</h2>
        <div className="relative w-64">
          <IconSearch width={14} height={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className="input !py-1.5 !pl-9 text-xs"
            placeholder="Search action, person, detail…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <table className="w-full">
        <thead className="border-b border-stone-200 bg-paper/60">
          <tr>
            <th className="th">When</th>
            <th className="th">Action</th>
            <th className="th">By</th>
            <th className="th">On</th>
            <th className="th">Branch</th>
            <th className="th">Detail</th>
          </tr>
        </thead>
        <tbody>
          {pager.pageItems.map((e) => (
            <tr key={e.id} className="border-b border-stone-100 last:border-0">
              <td className="td whitespace-nowrap text-stone-500">{fmtDate(e.at)} {fmtTime(e.at)}</td>
              <td className="td"><Badge tone="stone">{e.action.replace(/_/g, ' ')}</Badge></td>
              <td className="td font-medium">{e.actorName}</td>
              <td className="td text-stone-500">{e.entity}{e.entityId ? ` · ${e.entityId.slice(-8)}` : ''}</td>
              <td className="td text-stone-500">{branchName(e.branchId)}</td>
              <td className="td max-w-xs truncate text-stone-500" title={e.detail}>{e.detail ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <EmptyState icon={<IconShield width={36} height={36} />} title="No audit entries" hint="Sensitive actions are logged here automatically." />
      )}
      <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} />
    </div>
  );
}

/** Bar chart of per-bucket sales with native tooltips. */
function PeriodChart({ buckets }: { buckets: { label: string; total: number }[] }) {
  const max = Math.max(...buckets.map((b) => b.total), 1);
  const dense = buckets.length > 24;
  return (
    <div>
      <div className="flex h-44 items-end gap-[3px]">
        {buckets.map((b) => (
          <div key={b.label + b.total} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[9px] tabular-nums text-stone-400 opacity-0 transition group-hover:opacity-100">
              {b.total > 0 ? peso(b.total) : ''}
            </span>
            <div
              className={clsx(
                'w-full rounded-t transition',
                b.total > 0 ? 'bg-pine-600/85 group-hover:bg-pine-700' : 'bg-stone-100',
              )}
              style={{ height: `${Math.max(b.total > 0 ? 4 : 2, (b.total / max) * 100)}%` }}
              title={`${b.label}: ${peso(b.total)}`}
            />
            {!dense && <span className="text-[9px] text-stone-400">{b.label}</span>}
          </div>
        ))}
      </div>
      {dense && (
        <div className="mt-1 flex justify-between text-[9px] text-stone-400">
          <span>{buckets[0]?.label}</span>
          <span>{buckets[buckets.length - 1]?.label}</span>
        </div>
      )}
    </div>
  );
}
