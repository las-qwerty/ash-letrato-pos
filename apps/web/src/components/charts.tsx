'use client';

import { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { peso } from '@simmy/core';

export type TrendPoint = { label: string; date: string; total: number; count: number; note: string };
export type BucketPoint = { label: string; total: number; count: number };

const C = {
  pine: '#DC2626',
  brass: '#A97B2F',
  grid: '#E7E5E4',
  muted: '#78716C',
  slices: ['#DC2626', '#A97B2F', '#C4552B', '#57534E', '#F87171', '#8F6524'],
};
const AXIS = { fill: C.muted, fontSize: 11 };

const axisPeso = (n: number) =>
  n >= 1_000_000
    ? `₱${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `₱${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
      : `₱${Math.round(n)}`;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const txns = (n: number) => `${n} transaction${n === 1 ? '' : 's'}`;

function TipCard({ title, value, lines }: { title: string; value: string; lines: string[] }) {
  return (
    <div className="min-w-[10rem] rounded-xl border border-stone-200 bg-white/95 px-3.5 py-2.5 shadow-lift backdrop-blur-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">{title}</p>
      <p className="mt-0.5 font-display text-lg font-medium tabular-nums text-ink">{value}</p>
      {lines.filter(Boolean).map((l) => (
        <p key={l} className="text-xs text-stone-500">{l}</p>
      ))}
    </div>
  );
}

function TrendTip({ active, payload }: { active?: boolean; payload?: { payload: TrendPoint }[] }) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return <TipCard title={`${d.label} · ${d.date}`} value={peso(d.total)} lines={[txns(d.count), d.note]} />;
}

export function SalesTrendChart({ data }: { data: TrendPoint[] }) {
  const gid = `trend${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const avg = data.reduce((a, d) => a + d.total, 0) / Math.max(data.length, 1);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.pine} stopOpacity={0.32} />
            <stop offset="100%" stopColor={C.pine} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="3 4" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} dy={8} tick={AXIS} />
        <YAxis width={58} axisLine={false} tickLine={false} tickFormatter={axisPeso} tick={AXIS} />
        <Tooltip cursor={{ stroke: C.pine, strokeOpacity: 0.3, strokeDasharray: '4 4' }} content={<TrendTip />} />
        {avg > 0 && (
          <ReferenceLine
            y={avg}
            stroke={C.brass}
            strokeDasharray="5 5"
            label={{ value: `avg ${axisPeso(avg)}`, position: 'insideTopRight', fill: C.brass, fontSize: 11 }}
          />
        )}
        <Area
          type="monotone"
          dataKey="total"
          stroke={C.pine}
          strokeWidth={2.5}
          fill={`url(#${gid})`}
          dot={{ r: 3.5, fill: '#FFFFFF', stroke: C.pine, strokeWidth: 2 }}
          activeDot={{ r: 6, fill: C.pine, stroke: '#FFFFFF', strokeWidth: 2 }}
          animationDuration={700}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PeriodTip({ active, payload, sum = 0 }: { active?: boolean; payload?: { payload: BucketPoint }[]; sum?: number }) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return (
    <TipCard
      title={d.label}
      value={peso(d.total)}
      lines={[txns(d.count), sum > 0 ? `${pct(d.total, sum)}% of this period` : '']}
    />
  );
}

export function PeriodBarChart({ data, unit }: { data: BucketPoint[]; unit: string }) {
  const sum = data.reduce((a, d) => a + d.total, 0);
  const avg = sum / Math.max(data.length, 1);
  const peak = data.reduce((best, d, i) => (d.total > (data[best]?.total ?? 0) ? i : best), 0);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="3 4" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} dy={8} tick={AXIS} />
        <YAxis width={58} axisLine={false} tickLine={false} tickFormatter={axisPeso} tick={AXIS} />
        <Tooltip cursor={{ fill: C.pine, fillOpacity: 0.06 }} content={<PeriodTip sum={sum} />} />
        {avg > 0 && (
          <ReferenceLine
            y={avg}
            stroke={C.brass}
            strokeDasharray="5 5"
            label={{ value: `avg ${axisPeso(avg)} / ${unit}`, position: 'insideTopLeft', fill: C.brass, fontSize: 11 }}
          />
        )}
        <Bar dataKey="total" maxBarSize={40} radius={[6, 6, 0, 0]} animationDuration={600}>
          {data.map((d, i) => (
            <Cell key={i} fill={i === peak && d.total > 0 ? C.brass : C.pine} fillOpacity={d.total > 0 ? 0.9 : 0.15} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PaymentDonut({
  data,
  active,
  onPick,
}: {
  data: { name: string; value: number }[];
  active: string;
  onPick: (name: string) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const root = rootRef.current;
      const list = listRef.current;
      const t = e.target as Element;
      if (!root || !root.contains(t)) {
        setHover(null);
        return;
      }
      if (list?.contains(t)) {
        if (!t.closest('button')) setHover(null);
        return;
      }
      const sector = t.closest('.recharts-pie-sector');
      const idx = sector ? [...root.querySelectorAll('.recharts-pie-sector')].indexOf(sector) : -1;
      setHover(idx >= 0 ? idx : null);
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);
  const total = data.reduce((a, d) => a + d.value, 0);
  const cur = hover == null ? null : data[hover];
  const color = (i: number) => C.slices[i % C.slices.length];
  return (
    <div ref={rootRef}>
      <div className="relative mx-auto h-48 w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="96%"
              paddingAngle={2}
              stroke="none"
              animationDuration={700}
              onClick={(_, i) => {
                const m = data[i];
                if (m) onPick(m.name);
              }}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={color(i)} opacity={hover == null || hover === i ? 1 : 0.35} className="cursor-pointer transition-opacity" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-500">{cur ? cur.name : 'Total'}</p>
          <p className="font-display text-xl font-medium tabular-nums">{peso(cur ? cur.value : total)}</p>
          <p className="text-xs text-stone-500">
            {cur ? `${pct(cur.value, total)}% of sales` : `${data.length} method${data.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>
      <ul ref={listRef} className="mt-4 space-y-1">
        {data.map((d, i) => (
          <li key={d.name}>
            <button
              type="button"
              onClick={() => onPick(d.name)}
              onMouseMove={() => setHover(i)}
              className={clsx(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition',
                active === d.name ? 'bg-pine-50 ring-1 ring-pine-200' : hover === i ? 'bg-stone-50' : 'hover:bg-stone-50',
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color(i) }} />
              <span className="flex-1 font-medium uppercase">{d.name}</span>
              <span className="tabular-nums text-stone-500">{pct(d.value, total)}%</span>
              <span className="w-24 text-right font-medium tabular-nums">{peso(d.value)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-[11px] text-stone-400">
        {active === 'all' ? 'Click a method to filter the report' : 'Click again to clear the filter'}
      </p>
    </div>
  );
}

function BranchTip({ active, payload, sum = 0 }: { active?: boolean; payload?: { payload: { name: string; total: number } }[]; sum?: number }) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return <TipCard title={d.name} value={peso(d.total)} lines={[sum > 0 ? `${pct(d.total, sum)}% of branch sales` : '']} />;
}

export function BranchBarChart({ data }: { data: { name: string; total: number }[] }) {
  const sum = data.reduce((a, d) => a + d.total, 0);
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length, 1) * 52 + 24}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          axisLine={false}
          tickLine={false}
          tickFormatter={(n: string) => (n.length > 18 ? `${n.slice(0, 17)}…` : n)}
          tick={{ fill: '#44403C', fontSize: 12 }}
        />
        <Tooltip cursor={{ fill: C.brass, fillOpacity: 0.08 }} content={<BranchTip sum={sum} />} />
        <Bar dataKey="total" fill={C.brass} radius={[0, 8, 8, 0]} barSize={22} animationDuration={600}>
          <LabelList dataKey="total" position="right" formatter={(v: unknown) => axisPeso(Number(v))} style={{ fill: '#57534E', fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
