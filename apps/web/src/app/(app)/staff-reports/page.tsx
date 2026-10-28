'use client';

import { useMemo, useState } from 'react';
import { hasPermission, peso, staffMonthReport, todayISO, type StaffReward } from '@simmy/core';
import { Badge, EmptyState, Field, Modal, PageHeader } from '@/components/ui';
import { IconDownload, IconPlus } from '@/components/icons';
import { downloadXlsx } from '@/lib/excel';
import { useBranchScope, useStore } from '@/lib/store';

const basisLabel = { transactions: 'Sales rung up', handled_items: 'Items produced', none: 'No commission' } as const;
const jobLabel = { cashier: 'Cashier', graphic_artist: 'Graphic artist', other: 'Other' } as const;

export default function StaffReportsPage() {
  const sales = useStore((s) => s.sales);
  const users = useStore((s) => s.users);
  const profiles = useStore((s) => s.employeeProfiles);
  const rewards = useStore((s) => s.staffRewards);
  const upsertStaffReward = useStore((s) => s.upsertStaffReward);
  const currentUser = useStore((s) => s.currentUser);
  const scope = useBranchScope();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [rewardOpen, setRewardOpen] = useState(false);
  const canRewards = hasPermission(currentUser, 'rewards');

  const rows = useMemo(
    () => staffMonthReport({ sales, users, profiles, month, branchId: scope }),
    [sales, users, profiles, month, scope],
  );
  const monthRewards = rewards.filter((r) => r.month === month);
  const nameOf = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  };
  const totals = rows.reduce(
    (a, r) => ({
      tx: a.tx + r.transactions,
      sales: a.sales + r.transactionsTotal,
      items: a.items + r.handledItems,
      comm: a.comm + r.commission,
    }),
    { tx: 0, sales: 0, items: 0, comm: 0 },
  );

  const exportXlsx = () =>
    downloadXlsx(`staff-report-${month}`, [
      {
        name: 'Staff report',
        rows: [
          ['Staff', 'Job role', 'Transactions', 'Sales rung up (PHP)', 'Items produced', 'Items produced (PHP)', 'Commission basis', 'Credited (PHP)', 'Commission %', 'Commission (PHP)', 'Target (PHP)', 'Target reached %', 'Reward eligible'],
          ...rows.map((r) => [
            r.name,
            r.jobRole ? jobLabel[r.jobRole] : '',
            r.transactions,
            r.transactionsTotal,
            r.handledItems,
            r.handledItemsTotal,
            basisLabel[r.basis],
            r.credit,
            r.commissionPct,
            r.commission,
            r.monthlyTarget ?? '',
            r.targetPct ?? '',
            r.targetReached ? 'yes' : 'no',
          ]),
        ],
      },
      {
        name: 'Rewards',
        rows: [
          ['Staff', 'Month', 'Reward', 'Status', 'Notes'],
          ...monthRewards.map((r) => [nameOf(r.userId), r.month, r.title, r.status, r.notes ?? '']),
        ],
      },
    ]);

  const grant = (r: StaffReward) =>
    upsertStaffReward({ ...r, status: 'granted', grantedAt: new Date().toISOString(), grantedBy: currentUser?.id ?? '' });

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Staff sales & commission"
        sub="Monthly sales handled per employee. Rewards are tracked separately and never change sales or commission."
        actions={
          <div className="flex gap-2">
            <input
              type="month"
              className="input !w-auto"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label="Report month"
            />
            <button className="btn-secondary" onClick={exportXlsx}>
              <IconDownload width={15} height={15} /> Export
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Transactions" value={String(totals.tx)} />
        <Stat label="Sales rung up" value={peso(totals.sales)} />
        <Stat label="Items produced" value={String(totals.items)} />
        <Stat label="Commission due" value={peso(totals.comm)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-stone-200 bg-paper/60">
            <tr>
              <th className="th">Staff</th>
              <th className="th">Job role</th>
              <th className="th text-right">Transactions</th>
              <th className="th text-right">Sales rung up</th>
              <th className="th text-right">Items produced</th>
              <th className="th">Commission on</th>
              <th className="th text-right">Commission</th>
              <th className="th">Monthly target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-b border-stone-100 last:border-0">
                <td className="td font-medium">{r.name}</td>
                <td className="td text-stone-500">{r.jobRole ? jobLabel[r.jobRole] : '—'}</td>
                <td className="td text-right tabular-nums">{r.transactions}</td>
                <td className="td text-right tabular-nums">{peso(r.transactionsTotal)}</td>
                <td className="td text-right tabular-nums">
                  {r.handledItems} <span className="text-stone-400">· {peso(r.handledItemsTotal)}</span>
                </td>
                <td className="td text-stone-500">
                  {basisLabel[r.basis]}
                  {r.basis !== 'none' && <span className="block text-xs text-stone-400">{r.commissionPct}% of {peso(r.credit)}</span>}
                </td>
                <td className="td text-right font-medium tabular-nums">{peso(r.commission)}</td>
                <td className="td">
                  {r.monthlyTarget ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-pine-600" style={{ width: `${Math.min(100, r.targetPct ?? 0)}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-stone-500">{r.targetPct ?? 0}%</span>
                      {r.targetReached && <Badge tone="pine">reward eligible</Badge>}
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400">No target</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState title="No staff in this view" />}
      </div>

      <div className="card mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-medium">Rewards for {month}</p>
            <p className="text-xs text-stone-500">Recorded separately. A reward never changes sales totals or commission.</p>
          </div>
          {canRewards && (
            <button className="btn-secondary" onClick={() => setRewardOpen(true)}>
              <IconPlus width={15} height={15} /> Record reward
            </button>
          )}
        </div>
        {monthRewards.length === 0 ? (
          <p className="text-sm text-stone-400">No rewards recorded for this month.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {monthRewards.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{nameOf(r.userId)}</span> · {r.title}
                  {r.notes && <span className="block text-xs text-stone-500">{r.notes}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={r.status === 'granted' ? 'pine' : r.status === 'cancelled' ? 'stone' : 'brass'}>{r.status}</Badge>
                  {canRewards && r.status === 'pending' && (
                    <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => grant(r)}>
                      Mark granted
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RewardModal
        open={rewardOpen}
        month={month}
        staff={rows.map((r) => ({ id: r.userId, name: r.name, reached: r.targetReached }))}
        onClose={() => setRewardOpen(false)}
        onSave={(userId, title, notes) => {
          upsertStaffReward({
            id: `rw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            userId,
            month,
            title,
            notes: notes || undefined,
            status: 'pending',
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.id ?? '',
          });
          setRewardOpen(false);
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}

function RewardModal({
  open,
  month,
  staff,
  onClose,
  onSave,
}: {
  open: boolean;
  month: string;
  staff: { id: string; name: string; reached: boolean }[];
  onClose: () => void;
  onSave: (userId: string, title: string, notes: string) => void;
}) {
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !title.trim()) return;
    onSave(userId, title.trim(), notes.trim());
    setUserId('');
    setTitle('');
    setNotes('');
  };
  return (
    <Modal open={open} onClose={onClose} title={`Record a reward — ${month}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Staff member">
          <select className="input" required value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Choose…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.reached ? ' — target reached' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reward">
          <input className="input" required placeholder="e.g. ₱500 gift certificate" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Notes (optional)">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1">Record reward</button>
        </div>
      </form>
    </Modal>
  );
}
