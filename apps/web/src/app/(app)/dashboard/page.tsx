'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { fmtTime, peso, type Sale } from '@simmy/core';
import { Badge, PageHeader, Stat } from '@/components/ui';
import { IconAlert } from '@/components/icons';
import { useStore } from '@/lib/store';

function last7Days(sales: Sale[]) {
  const days: { label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    days.push({
      label: d.toLocaleDateString('en-PH', { weekday: 'short' }),
      total: sales
        .filter((s) => s.status !== 'voided' && new Date(s.createdAt).toDateString() === key)
        .reduce((a, s) => a + s.total, 0),
    });
  }
  return days;
}

function SalesChart({ data }: { data: { label: string; total: number }[] }) {
  // displayed values tween toward the latest data so the line animates on new sales
  const [shown, setShown] = useState(data);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = shown;
    const to = data;
    if (from.every((d, i) => d.total === to[i]?.total && d.label === to[i]?.label)) return;
    const t0 = performance.now();
    const dur = 600;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
      setShown(
        to.map((d, i) => ({
          label: d.label,
          total: (from[i]?.total ?? 0) + (d.total - (from[i]?.total ?? 0)) * e,
        })),
      );
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const max = Math.max(...shown.map((d) => d.total), 1);
  const W = 560;
  const H = 180;
  const padX = 34; // keep edge dots + day labels inside the viewBox
  const padTop = 10; // headroom so peaks never touch the top edge
  const innerW = W - padX * 2;
  const step = shown.length > 1 ? innerW / (shown.length - 1) : 0;
  const pts = shown.map((d, i) => [
    padX + i * step,
    H - (d.total / max) * (H - padTop),
  ] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const x0 = pts[0]?.[0] ?? padX;
  const xN = pts[pts.length - 1]?.[0] ?? W - padX;
  const area = `${line} L${xN},${H} L${x0},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label="Sales for the last 7 days">
      <defs>
        <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DC2626" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#salesFill)" />
      <path d={line} fill="none" stroke="#DC2626" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={i === pts.length - 1 ? 4 : 3} fill="#DC2626" />
          <text x={x} y={H + 16} textAnchor="middle" className="fill-stone-400 text-[10px]">
            {data[i]?.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function DashboardPage() {
  const sales = useStore((s) => s.sales);
  const materials = useStore((s) => s.materials);
  const customers = useStore((s) => s.customers);
  const currentUser = useStore((s) => s.currentUser);

  // re-derive time-based aggregates periodically so the chart stays live
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const { todaySales, revenue, lowStock, recent } = useMemo(() => {
    const today = new Date().toDateString();
    const todaySales = sales.filter(
      (s) => new Date(s.createdAt).toDateString() === today && s.status !== 'voided',
    );
    return {
      todaySales,
      revenue: todaySales.reduce((a, s) => a + s.total, 0),
      lowStock: materials.filter((m) => m.stockQty <= m.minStockLevel),
      recent: sales.slice(0, 6),
    };
  }, [sales, materials]);

  const trend = useMemo(() => last7Days(sales), [sales, tick]);

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
              Sales — last 7 days
              <span className="flex items-center gap-1.5 rounded-full bg-clay/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-clay">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-clay" />
                </span>
                Live
              </span>
            </h2>
            <Link href="/reports" className="text-xs font-medium text-pine-700 hover:underline">
              Full report →
            </Link>
          </div>
          <SalesChart data={trend} />
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
