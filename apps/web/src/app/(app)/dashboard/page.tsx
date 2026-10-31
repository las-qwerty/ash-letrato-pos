'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fmtTime, peso, stockAt, type Sale } from '@simmy/core';
import { Badge, PageHeader, Stat } from '@/components/ui';
import { IconAlert } from '@/components/icons';
import { SalesTrendChart, type TrendPoint } from '@/components/charts';
import { useBranchScope, useStore } from '@/lib/store';

function last7Days(sales: Sale[]): TrendPoint[] {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    const day = sales.filter((s) => s.status === 'completed' && new Date(s.createdAt).toDateString() === key);
    return {
      label: d.toLocaleDateString('en-PH', { weekday: 'short' }),
      date: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      total: day.reduce((a, s) => a + s.total, 0),
      count: day.length,
    };
  });
  return days.map((d, i) => {
    const prev = days[i - 1]?.total ?? 0;
    const note =
      i === 0 || prev === 0 ? '' : `${d.total >= prev ? '+' : ''}${Math.round(((d.total - prev) / prev) * 100)}% vs previous day`;
    return { ...d, note };
  });
}

export default function DashboardPage() {
  const allSales = useStore((s) => s.sales);
  const materials = useStore((s) => s.materials);
  const customers = useStore((s) => s.customers);
  const currentUser = useStore((s) => s.currentUser);
  const branches = useStore((s) => s.branches);
  const scope = useBranchScope();
  const mainBranch = branches[0]?.id ?? '';
  // Staff see their own branch's numbers; the owner sees everything or the
  // branch they've picked in the sidebar.
  const sales = useMemo(
    () => (scope === 'all' ? allSales : allSales.filter((s) => s.branchId === scope)),
    [allSales, scope],
  );

  // re-derive time-based aggregates periodically so the chart stays live
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const { todaySales, revenue, lowStock, recent } = useMemo(() => {
    const today = new Date().toDateString();
    const todaySales = sales.filter(
      (s) => new Date(s.createdAt).toDateString() === today && s.status === 'completed',
    );
    return {
      todaySales,
      revenue: todaySales.reduce((a, s) => a + s.total, 0),
      lowStock: materials.filter(
        (m) => (scope === 'all' ? m.stockQty : stockAt(m, scope, mainBranch)) <= m.minStockLevel,
      ),
      recent: sales.slice(0, 6),
    };
  }, [sales, materials, scope, mainBranch]);

  const dayKey = new Date().toDateString();
  const trend = useMemo(() => last7Days(sales), [sales, dayKey]);
  const best = trend.reduce((b, d) => (d.total > b.total ? d : b));

  const productCounts = useMemo(() => {
    const m = new Map<string, { qty: number; revenue: number }>();
    for (const s of sales.filter((x) => x.status === 'completed')) {
      for (const l of s.lines) {
        const cur = m.get(l.name) ?? { qty: 0, revenue: 0 };
        m.set(l.name, { qty: cur.qty + l.qty, revenue: cur.revenue + l.total });
      }
    }
    return [...m.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
  }, [sales]);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${currentUser?.firstName ?? ''}`}
        sub={new Date().toLocaleDateString('en-PH', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Today's sales" value={peso(revenue)} />
        <Stat label="Transactions" value={todaySales.length} hint={`${sales.length} all time`} />
        <Stat label="Customers" value={customers.length} hint="registered members" />
        <Stat
          label="Low stock"
          value={lowStock.length}
          hint={lowStock.length ? 'materials need restock' : 'all stocked'}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-medium">
              Weekly sales
              <span className="flex items-center gap-1.5 rounded-full bg-clay/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-clay">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-clay" />
                </span>
                Live
              </span>
            </h2>
            <div className="flex items-center gap-4">
              {best.total > 0 && (
                <span className="hidden text-xs text-stone-500 sm:inline">
                  Best day <span className="font-medium text-ink">{best.label}</span> · {peso(best.total)}
                </span>
              )}
              <Link href="/reports" className="text-xs font-medium text-pine-700 hover:underline">
                Full report →
              </Link>
            </div>
          </div>
          <SalesTrendChart data={trend} />
          {trend.every((d) => d.total === 0) && (
            <p className="mt-2 text-center text-xs text-stone-400">No completed sales in the last 7 days yet.</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-display text-lg font-medium">Top products</h2>
          <ol className="space-y-2.5">
            {productCounts.map(([name, v], i) => (
              <li key={name} className="flex items-center gap-3 text-sm">
                <span className="w-4 font-display text-stone-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <span className="text-xs tabular-nums text-stone-500">{v.qty}×</span>
                <span className="w-20 text-right font-medium tabular-nums">
                  {peso(v.revenue)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="border-b border-stone-100 px-5 py-3.5 font-display text-lg font-medium">
            Recent transactions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="border-b border-stone-100 last:border-0">
                    <td className="td font-medium">{s.invoiceNumber}</td>
                    <td className="td text-stone-500">{s.customerName ?? 'Walk-in'}</td>
                    <td className="td text-stone-500">{fmtTime(s.createdAt)}</td>
                    <td className="td">
                      <Badge
                        tone={
                          s.status === 'completed' ? 'pine' : s.status === 'voided' ? 'clay' : 'brass'
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="td text-right font-medium tabular-nums">{peso(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-medium">
            <IconAlert width={16} height={16} className="text-brass-500" />
            Low stock
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-stone-400">All materials above minimum levels.</p>
          ) : (
            <ul className="space-y-2.5">
              {lowStock.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span className="min-w-0 truncate">{m.name}</span>
                  <span className="ml-2 shrink-0 font-medium tabular-nums text-clay">
                    {m.stockQty} / {m.minStockLevel} {m.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
