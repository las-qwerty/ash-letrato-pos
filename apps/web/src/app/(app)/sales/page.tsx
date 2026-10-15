'use client';

import { useMemo, useState } from 'react';
import { fmtDate, fmtTime, peso, type Sale } from '@simmy/core';
import { Badge, EmptyState, Field, Modal, PageHeader } from '@/components/ui';
import { IconReceipt, IconSearch } from '@/components/icons';
import { Pagination } from '@/components/pagination';
import { usePager } from '@/lib/use-pager';
import { Receipt } from '@/components/pos/receipt';
import { useStore } from '@/lib/store';
import clsx from 'clsx';

type Action = { kind: 'void' | 'refund'; sale: Sale } | null;

const statusTone = { completed: 'pine', voided: 'clay', refunded: 'brass' } as const;

export default function SalesPage() {
  const sales = useStore((s) => s.sales);
  const settings = useStore((s) => s.settings);
  const users = useStore((s) => s.users);
  const voidSale = useStore((s) => s.voidSale);
  const refundSale = useStore((s) => s.refundSale);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [viewing, setViewing] = useState<Sale | null>(null);
  const [action, setAction] = useState<Action>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sales
      .filter((s) => status === 'all' || s.status === status)
      .filter(
        (s) =>
          !needle ||
          s.invoiceNumber.toLowerCase().includes(needle) ||
          (s.customerName ?? '').toLowerCase().includes(needle) ||
          s.cashierName.toLowerCase().includes(needle),
      );
  }, [sales, q, status]);

  const pager = usePager(filtered, 10, [q, status]);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Transactions" sub="Every sale, void, and refund — with audit trail" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <IconSearch
            width={15}
            height={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            className="input !pl-9"
            placeholder="Invoice, customer, or cashier…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {['all', 'completed', 'voided', 'refunded'].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={clsx(
                'rounded-full px-3 py-1.5 text-xs font-medium capitalize transition',
                status === s
                  ? 'bg-pine-800 text-white'
                  : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-stone-200 bg-paper/60">
            <tr>
              <th className="th">Invoice</th>
              <th className="th">When</th>
              <th className="th">Customer</th>
              <th className="th">Cashier</th>
              <th className="th">Payment</th>
              <th className="th">Status</th>
              <th className="th text-right">Total</th>
              <th className="th"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.map((s) => (
              <tr key={s.id} className="border-b border-stone-100 last:border-0 hover:bg-paper/50">
                <td className="td font-medium">{s.invoiceNumber}</td>
                <td className="td text-stone-500">
                  {fmtDate(s.createdAt)} · {fmtTime(s.createdAt)}
                </td>
                <td className="td">{s.customerName ?? <span className="text-stone-400">Walk-in</span>}</td>
                <td className="td text-stone-500">{s.cashierName}</td>
                <td className="td uppercase text-stone-500">{s.paymentMethod}</td>
                <td className="td">
                  <Badge tone={statusTone[s.status]}>{s.status}</Badge>
                </td>
                <td className="td text-right font-medium tabular-nums">{peso(s.total)}</td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setViewing(s)}>
                      Receipt
                    </button>
                    {s.status === 'completed' && (
                      <>
                        <button
                          className="btn-ghost !px-2 !py-1 text-xs text-clay hover:!bg-clay/10"
                          onClick={() => setAction({ kind: 'void', sale: s })}
                        >
                          Void
                        </button>
                        <button
                          className="btn-ghost !px-2 !py-1 text-xs text-brass-700 hover:!bg-brass-100"
                          onClick={() => setAction({ kind: 'refund', sale: s })}
                        >
                          Refund
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState
            icon={<IconReceipt width={36} height={36} />}
            title="No transactions found"
            hint="Adjust your filters or make a sale at the register"
          />
        )}
        <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} />
      </div>

      {/* Receipt view */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Receipt">
        {viewing && (
          <>
            {viewing.status !== 'completed' && (
              <div className="mb-3 rounded-lg bg-clay/10 px-3 py-2 text-xs text-clay">
                {viewing.status === 'voided' ? 'Voided' : 'Refunded'} by {viewing.authorizedBy}
                {viewing.voidReason ? ` — ${viewing.voidReason}` : ''}
              </div>
            )}
            <Receipt sale={viewing} settings={settings} />
            <button className="btn-secondary mt-4 w-full" onClick={() => window.print()}>
              Print
            </button>
          </>
        )}
      </Modal>

      <AuthorizeModal
        action={action}
        onClose={() => setAction(null)}
        supervisors={users.filter((u) => u.canAuthorizeVoids)}
        onConfirm={(kind, sale, reason, by) => {
          if (kind === 'void') voidSale(sale.id, reason, by);
          else refundSale(sale.id, reason, by);
          setAction(null);
        }}
      />
    </div>
  );
}

function AuthorizeModal({
  action,
  onClose,
  onConfirm,
  supervisors,
}: {
  action: NonNullable<Action> | null;
  onClose: () => void;
  onConfirm: (
    kind: 'void' | 'refund',
    sale: Sale,
    reason: string,
    authorizedBy: string,
  ) => void;
  supervisors: { id: string; firstName: string; lastName: string }[];
}) {
  const [supervisorId, setSupervisorId] = useState('');
  const [pinIn, setPinIn] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSupervisorId('');
    setPinIn('');
    setReason('');
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;
    const sup = supervisors.find((s) => s.id === supervisorId);
    if (!sup) {
      setError('Choose the authorizing supervisor.');
      return;
    }
    void useStore.getState().verifyPin(sup.id, pinIn).then((ok) => {
      if (!ok) {
        setError('Incorrect PIN for that supervisor.');
        return;
      }
      onConfirm(action.kind, action.sale, reason, `${sup.firstName} ${sup.lastName}`);
      reset();
    });
  };

  return (
    <Modal
      open={!!action}
      onClose={() => {
        onClose();
        reset();
      }}
      title={action?.kind === 'void' ? 'Void transaction' : 'Process refund'}
    >
      {action && (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-lg bg-paper px-4 py-3 text-sm">
            <p className="font-medium">{action.sale.invoiceNumber}</p>
            <p className="text-stone-500">{peso(action.sale.total)}</p>
          </div>

          <Field label="Authorizing supervisor">
            <select
              className="input"
              required
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
            >
              <option value="">Select supervisor…</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Supervisor PIN">
            <input
              className="input text-center tracking-[0.4em]"
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="••••"
              value={pinIn}
              onChange={(e) => setPinIn(e.target.value.replace(/\D/g, ''))}
            />
          </Field>

          <Field label="Reason">
            <textarea
              className="input min-h-[4.5rem] resize-none"
              required
              placeholder={
                action.kind === 'void'
                  ? 'e.g. Wrong item rung up'
                  : 'e.g. Print defect, customer returned'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          {error && (
            <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={action.kind === 'void' ? 'btn-danger flex-1' : 'btn-primary flex-1'}
            >
              {action.kind === 'void' ? 'Void sale' : 'Refund ' + peso(action.sale.total)}
            </button>
          </div>
          <p className="text-center text-[11px] text-stone-400">
            Enter the selected supervisor’s register PIN (demo: Simone 2468, Maria 1357)
          </p>
        </form>
      )}
    </Modal>
  );
}
