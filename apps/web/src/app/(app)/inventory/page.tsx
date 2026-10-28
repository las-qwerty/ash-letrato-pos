'use client';

import { useMemo, useState } from 'react';
import { fmtTime, formatSheets, hasPermission, peso, stockAt, type Branch, type Material, type MovementKind } from '@simmy/core';
import { Badge, EmptyState, Field, Modal, PageHeader } from '@/components/ui';
import { IconAlert, IconBox, IconDownload, IconSearch } from '@/components/icons';
import { Pagination } from '@/components/pagination';
import { downloadXlsx } from '@/lib/excel';
import { usePager } from '@/lib/use-pager';
import { useBranchScope, useStore } from '@/lib/store';
import clsx from 'clsx';

type Action = { kind: 'restock' | 'adjust'; material: Material } | null;
type Tab = 'stock' | 'movements';

const kindTone: Record<MovementKind, 'pine' | 'brass' | 'clay' | 'stone'> = {
  opening: 'stone',
  received: 'pine',
  consumed: 'stone',
  transfer_out: 'brass',
  transfer_in: 'brass',
  adjustment: 'brass',
  waste: 'clay',
  damaged: 'clay',
  missing: 'clay',
  count_correction: 'brass',
  void_reversal: 'pine',
};

const kindLabel: Record<MovementKind, string> = {
  opening: 'opening',
  received: 'received',
  consumed: 'consumed',
  transfer_out: 'transfer out',
  transfer_in: 'transfer in',
  adjustment: 'adjustment',
  waste: 'waste',
  damaged: 'damaged',
  missing: 'missing',
  count_correction: 'count fix',
  void_reversal: 'void reversal',
};

const LOSS_KIND: Record<string, 'damaged' | 'waste' | 'missing'> = { damage: 'damaged', waste: 'waste', missing: 'missing' };
const REASON_LABEL: Record<string, string> = {
  damage: 'Damaged',
  waste: 'Wasted',
  missing: 'Missing',
  count: 'Stock count correction',
  other: 'Other',
};

function PaperPanel({ materials, branches, mainBranch }: { materials: Material[]; branches: Branch[]; mainBranch: string }) {
  const papers = materials.filter((m) => m.unit === 'sheet' && m.packUnit === 'ream');
  if (papers.length === 0) return null;
  return (
    <div className="card mb-4 overflow-x-auto">
      <div className="border-b border-stone-200 px-4 py-3">
        <p className="font-medium">Paper on hand</p>
        <p className="text-xs text-stone-500">
          Reams and loose sheets at each branch. A red figure means more sheets were used than were ever counted in.
        </p>
      </div>
      <table className="w-full">
        <thead className="border-b border-stone-200 bg-paper/60">
          <tr>
            <th className="th">Paper size</th>
            {branches.map((b) => (
              <th key={b.id} className="th">{b.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {papers.map((m) => (
            <tr key={m.id} className="border-b border-stone-100 last:border-0">
              <td className="td font-medium">{m.name}</td>
              {branches.map((b) => {
                const n = stockAt(m, b.id, mainBranch);
                return (
                  <td
                    key={b.id}
                    className={clsx('td tabular-nums', n < 0 ? 'font-medium text-clay' : n <= m.minStockLevel ? 'text-brass-700' : '')}
                  >
                    {formatSheets(n, m.unitsPerPack, m.packUnit)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InventoryPage() {
  const materials = useStore((s) => s.materials);
  const movements = useStore((s) => s.stockMovements);
  const branches = useStore((s) => s.branches);
  const restockMaterial = useStore((s) => s.restockMaterial);
  const adjustMaterial = useStore((s) => s.adjustMaterial);
  const applyStockCount = useStore((s) => s.applyStockCount);
  const transferMaterial = useStore((s) => s.transferMaterial);
  const currentUser = useStore((s) => s.currentUser);

  const scope = useBranchScope();
  const [tab, setTab] = useState<Tab>('stock');
  const [branchPick, setBranchPick] = useState<'all' | string>('all');
  // Non-owner roles always work their own branch's stock.
  const branchId = scope === 'all' ? branchPick : scope;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [action, setAction] = useState<Action>(null);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [countOpen, setCountOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [transferOpen, setTransferOpen] = useState<Material | null>(null);
  const [trQty, setTrQty] = useState('');
  const [trTo, setTrTo] = useState('');
  const [trReason, setTrReason] = useState('');
  const [trError, setTrError] = useState<string | null>(null);
  const [mvQ, setMvQ] = useState('');
  const [mvKind, setMvKind] = useState<'all' | MovementKind>('all');

  const mainBranch = branches[0]?.id ?? '';
  const viewBranch = branchId === 'all' ? mainBranch : branchId;
  const canAdjust = hasPermission(currentUser, 'stock_adjust');
  const actor = currentUser
    ? {
        employeeId: currentUser.id,
        employeeName: `${currentUser.firstName} ${currentUser.lastName}`,
        branchId: currentUser.branchId || viewBranch,
      }
    : undefined;

  const onHand = (m: Material) =>
    branchId === 'all' ? m.stockQty : stockAt(m, viewBranch, mainBranch);
  const isLow = (m: Material) => onHand(m) <= m.minStockLevel;

  const packLabel = (m: Material) =>
    m.unitsPerPack && m.packUnit
      ? ` ≈ ${(onHand(m) / m.unitsPerPack).toFixed(1)} ${m.packUnit}`
      : '';

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return materials
      .filter((m) => filter === 'all' || isLow(m))
      .filter((m) => !needle || m.name.toLowerCase().includes(needle) || m.code.toLowerCase().includes(needle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials, q, filter, branchId]);

  const pager = usePager(filtered, 10, [q, filter, branchId]);
  const value = materials.reduce((a, m) => a + m.stockQty * m.costPerUnit, 0);

  const mvFiltered = useMemo(() => {
    const needle = mvQ.trim().toLowerCase();
    return movements.filter((mv) => {
      if (mvKind !== 'all' && mv.kind !== mvKind) return false;
      if (branchId !== 'all' && mv.branchId !== branchId) return false;
      if (!needle) return true;
      const mat = materials.find((m) => m.id === mv.materialId);
      return (
        mat?.name.toLowerCase().includes(needle) ||
        mv.reason.toLowerCase().includes(needle) ||
        mv.employeeName.toLowerCase().includes(needle)
      );
    });
  }, [movements, materials, mvQ, mvKind, branchId]);
  const mvPager = usePager(mvFiltered, 25, [mvQ, mvKind, branchId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;
    const n = parseFloat(qty);
    if (!n) return;
    const act = actor ? { ...actor, branchId: viewBranch } : undefined;
    if (action.kind === 'restock') restockMaterial(action.material.id, Math.abs(n), act);
    else {
      const loss = LOSS_KIND[reason];
      adjustMaterial(action.material.id, loss ? -Math.abs(n) : n, REASON_LABEL[reason] ?? reason, act, loss ?? 'adjustment');
    }
    setAction(null);
    setQty('');
    setReason('');
  };

  const submitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferOpen) return;
    const n = parseFloat(trQty);
    if (!n || n <= 0 || !trTo) return;
    const ok = transferMaterial(
      transferOpen.id,
      n,
      viewBranch,
      trTo,
      trReason || 'Inter-branch transfer',
      actor ? { ...actor, branchId: viewBranch } : undefined,
    );
    if (!ok) {
      setTrError(`Not enough ${transferOpen.unit} at this branch — available: ${onHand(transferOpen)}.`);
      return;
    }
    setTransferOpen(null);
    setTrQty('');
    setTrTo('');
    setTrReason('');
    setTrError(null);
  };

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;

  const exportInventory = () => {
    const matName = (id: string) => materials.find((m) => m.id === id)?.name ?? id;
    downloadXlsx(`ash-letrato-inventory-${new Date().toISOString().slice(0, 10)}`, [
      {
        name: 'Stock on hand',
        rows: [
          ['Code', 'Material', 'Unit', ...branches.map((b) => b.name), 'Total', 'Cost/unit', 'Value', 'Min level', 'Low?'],
          ...filtered.map((m) => [
            m.code,
            m.name,
            m.unit,
            ...branches.map((b) => stockAt(m, b.id, mainBranch)),
            m.stockQty,
            m.costPerUnit,
            Math.round(m.stockQty * m.costPerUnit * 100) / 100,
            m.minStockLevel,
            isLow(m) ? 'LOW' : '',
          ]),
        ],
      },
      {
        name: 'Movements',
        rows: [
          ['Date', 'Branch', 'Material', 'Type', 'Qty', 'Reason', 'Employee', 'Ref'],
          ...mvFiltered.slice(0, 5000).map((mv) => [
            `${mv.createdAt.slice(0, 10)} ${fmtTime(mv.createdAt)}`,
            branchName(mv.branchId),
            matName(mv.materialId),
            kindLabel[mv.kind],
            mv.qty,
            mv.reason,
            mv.employeeName,
            mv.refId ?? '',
          ]),
        ],
      },
    ]);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Inventory"
        sub={`Raw materials · ${peso(value)} on hand · every movement logged`}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={exportInventory}>
              <IconDownload width={14} height={14} /> Export
            </button>
            <button
              className="btn-secondary"
              onClick={() => { setCounts({}); setCountOpen(true); }}
            >
              Stock count
            </button>
          </div>
        }
      />

      <div className="mb-5 flex gap-1 border-b border-stone-200">
        {([['stock', 'Stock'], ['movements', `Movements (${movements.length})`]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition',
              tab === id ? 'border-pine-700 text-pine-800' : 'border-transparent text-stone-500 hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-72">
          <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className="input !pl-9"
            placeholder={tab === 'stock' ? 'Search material or code…' : 'Search reason, material, employee…'}
            value={tab === 'stock' ? q : mvQ}
            onChange={(e) => (tab === 'stock' ? setQ(e.target.value) : setMvQ(e.target.value))}
          />
        </div>
        {scope === 'all' ? (
          <select
            className="input !w-48"
            value={branchId}
            onChange={(e) => setBranchPick(e.target.value as 'all' | string)}
            aria-label="Branch"
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        ) : (
          <span className="self-center rounded-full bg-pine-50 px-3 py-1.5 text-xs font-medium text-pine-800 ring-1 ring-pine-200">
            {branches.find((b) => b.id === scope)?.name ?? 'My branch'}
          </span>
        )}
        {tab === 'stock' ? (
          <div className="flex gap-1.5">
            {(['all', 'low'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition',
                  filter === f
                    ? 'bg-pine-800 text-white'
                    : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300',
                )}
              >
                {f === 'all' ? 'All materials' : 'Low stock'}
              </button>
            ))}
          </div>
        ) : (
          <select
            className="input !w-44"
            value={mvKind}
            onChange={(e) => setMvKind(e.target.value as 'all' | MovementKind)}
            aria-label="Movement kind"
          >
            <option value="all">All kinds</option>
            {(Object.keys(kindLabel) as MovementKind[]).map((k) => (
              <option key={k} value={k}>{kindLabel[k]}</option>
            ))}
          </select>
        )}
      </div>

      {tab === 'stock' && <PaperPanel materials={materials} branches={branches} mainBranch={mainBranch} />}
      {tab === 'stock' ? (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-stone-200 bg-paper/60">
              <tr>
                <th className="th">Code</th>
                <th className="th">Material</th>
                <th className="th text-right">On hand{branchId === 'all' ? ' (all)' : ''}</th>
                <th className="th text-right">Min level</th>
                <th className="th text-right">Unit cost</th>
                <th className="th">Status</th>
                <th className="th"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((m) => {
                const low = isLow(m);
                const pct = Math.min(100, (onHand(m) / (m.minStockLevel * 2.5)) * 100);
                return (
                  <tr key={m.id} className="border-b border-stone-100 last:border-0 hover:bg-paper/50">
                    <td className="td font-mono text-xs text-stone-500">{m.code}</td>
                    <td className="td">
                      <p className="font-medium">{m.name}</p>
                      {m.unitsPerPack != null && (
                        <p className="text-xs text-stone-400">
                          {m.unitsPerPack} {m.unit} / {m.packUnit}
                        </p>
                      )}
                    </td>
                    <td className="td text-right">
                      <div className="inline-block w-32 text-left">
                        <span className={clsx('font-medium tabular-nums', low && 'text-clay')}>
                          {onHand(m)} {m.unit}
                          <span className="text-xs font-normal text-stone-400">{packLabel(m)}</span>
                        </span>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className={clsx('h-full rounded-full', low ? 'bg-clay' : 'bg-pine-500')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="td text-right tabular-nums text-stone-500">{m.minStockLevel}</td>
                    <td className="td text-right tabular-nums text-stone-500">{peso(m.costPerUnit)}</td>
                    <td className="td">
                      {low ? (
                        <Badge tone="clay"><IconAlert width={11} height={11} /> low</Badge>
                      ) : (
                        <Badge tone="pine">ok</Badge>
                      )}
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button
                          className="btn-ghost !px-2 !py-1 text-xs text-pine-700"
                          onClick={() => setAction({ kind: 'restock', material: m })}
                        >
                          Restock
                        </button>
                        {canAdjust && (
                          <button
                            className="btn-ghost !px-2 !py-1 text-xs"
                            onClick={() => setAction({ kind: 'adjust', material: m })}
                          >
                            Adjust
                          </button>
                        )}
                        <button
                          className="btn-ghost !px-2 !py-1 text-xs"
                          onClick={() => { setTrError(null); setTrTo(''); setTrQty(''); setTransferOpen(m); }}
                        >
                          Transfer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState icon={<IconBox width={36} height={36} />} title="No materials found" />
          )}
          <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-stone-200 bg-paper/60">
              <tr>
                <th className="th">Date</th>
                <th className="th">Material</th>
                <th className="th">Kind</th>
                <th className="th text-right">Qty</th>
                <th className="th">Branch</th>
                <th className="th">Reason</th>
                <th className="th">By</th>
              </tr>
            </thead>
            <tbody>
              {mvPager.pageItems.map((mv) => {
                const mat = materials.find((m) => m.id === mv.materialId);
                return (
                  <tr key={mv.id} className="border-b border-stone-100 last:border-0 hover:bg-paper/50">
                    <td className="td whitespace-nowrap text-stone-500">{fmtTime(mv.createdAt)}</td>
                    <td className="td font-medium">{mat?.name ?? mv.materialId}</td>
                    <td className="td"><Badge tone={kindTone[mv.kind]}>{kindLabel[mv.kind]}</Badge></td>
                    <td className={clsx('td text-right font-medium tabular-nums', mv.qty < 0 ? 'text-clay' : 'text-pine-700')}>
                      {mv.qty > 0 ? `+${mv.qty}` : mv.qty} {mat?.unit}
                    </td>
                    <td className="td text-stone-500">{branchName(mv.branchId)}</td>
                    <td className="td max-w-56 truncate text-stone-500">{mv.reason}</td>
                    <td className="td text-stone-500">{mv.employeeName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {mvFiltered.length === 0 && (
            <EmptyState icon={<IconBox width={36} height={36} />} title="No movements yet" />
          )}
          <Pagination {...mvPager} onPage={mvPager.setPage} onPerPage={mvPager.setPerPage} />
        </div>
      )}

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={action?.kind === 'restock' ? `Restock ${action.material.name}` : `Adjust ${action?.material.name}`}
      >
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded-lg bg-paper px-4 py-3 text-sm text-stone-600">
            Currently <strong>{action ? onHand(action.material) : ''} {action?.material.unit}</strong> on hand
            at <strong>{branchName(viewBranch)}</strong>
          </p>
          <Field label={action?.kind === 'restock' ? 'Quantity received' : LOSS_KIND[reason] ? 'Quantity lost' : 'Adjustment (+ / −)'}>
            <input
              className="input text-center text-lg"
              type="number"
              step="0.01"
              required
              placeholder={action?.kind === 'restock' ? 'e.g. 5' : 'e.g. −1 or 2'}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>
          {action?.kind === 'adjust' && (
            <Field label="Reason">
              <select className="input" required value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Select…</option>
                <option value="damage">Damaged</option>
                <option value="waste">Wasted</option>
                <option value="missing">Missing</option>
                <option value="count">Stock count correction</option>
                <option value="other">Other</option>
              </select>
            </Field>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setAction(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              {action?.kind === 'restock' ? 'Add stock' : 'Apply adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Inter-branch transfer */}
      <Modal
        open={!!transferOpen}
        onClose={() => setTransferOpen(null)}
        title={transferOpen ? `Transfer ${transferOpen.name}` : ''}
      >
        <form onSubmit={submitTransfer} className="space-y-4">
          <p className="rounded-lg bg-paper px-4 py-3 text-sm text-stone-600">
            From <strong>{branchName(viewBranch)}</strong> — {transferOpen ? onHand(transferOpen) : ''}{' '}
            {transferOpen?.unit} available
          </p>
          <Field label="Quantity">
            <input
              className="input text-center text-lg"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={trQty}
              onChange={(e) => setTrQty(e.target.value)}
            />
          </Field>
          <Field label="To branch">
            <select className="input" required value={trTo} onChange={(e) => setTrTo(e.target.value)}>
              <option value="">Select…</option>
              {branches.filter((b) => b.id !== viewBranch).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Reason (optional)">
            <input
              className="input"
              placeholder="e.g. Restock satellite branch"
              value={trReason}
              onChange={(e) => setTrReason(e.target.value)}
            />
          </Field>
          {trError && <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">{trError}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setTransferOpen(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">Transfer stock</button>
          </div>
        </form>
      </Modal>

      {/* Stock count / stocktake */}
      <Modal open={countOpen} onClose={() => setCountOpen(false)} title="Stock count" wide>
        <p className="-mt-1 mb-4 text-sm text-stone-500">
          Enter the physical count for each material at <strong>{branchName(viewBranch)}</strong>.
          Blank rows keep the recorded quantity. Differences post as count corrections.
        </p>
        <div className="max-h-80 overflow-y-auto rounded-lg border border-stone-200">
          <table className="w-full">
            <thead className="sticky top-0 border-b border-stone-200 bg-paper">
              <tr>
                <th className="th">Material</th>
                <th className="th text-right">Expected</th>
                <th className="th w-36 text-right">Counted</th>
                <th className="th w-24 text-right">Diff</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => {
                const expected = onHand(m);
                const counted = counts[m.id];
                const diff = counted === '' || counted == null ? null : parseFloat(counted) - expected;
                return (
                  <tr key={m.id} className="border-b border-stone-100 last:border-0">
                    <td className="td">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-stone-400">{m.code}</p>
                    </td>
                    <td className="td text-right tabular-nums text-stone-500">
                      {expected} {m.unit}
                    </td>
                    <td className="td text-right">
                      <input
                        className="input !w-24 !py-1 text-right tabular-nums"
                        inputMode="decimal"
                        placeholder={String(expected)}
                        value={counted ?? ''}
                        onChange={(e) =>
                          setCounts((c) => ({ ...c, [m.id]: e.target.value.replace(/[^0-9.]/g, '') }))
                        }
                        aria-label={`Counted ${m.name}`}
                      />
                    </td>
                    <td
                      className={clsx(
                        'td text-right font-medium tabular-nums',
                        diff == null ? 'text-stone-300' : diff === 0 ? 'text-stone-400' : diff > 0 ? 'text-pine-700' : 'text-clay',
                      )}
                    >
                      {diff == null ? '—' : diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => setCountOpen(false)}>
            Cancel
          </button>
          <button
            className="btn-primary flex-1"
            onClick={() => {
              const applied: Record<string, number> = {};
              for (const [id, v] of Object.entries(counts)) {
                if (v !== '' && !Number.isNaN(parseFloat(v))) applied[id] = parseFloat(v);
              }
              applyStockCount(applied, actor ? { ...actor, branchId: viewBranch } : undefined);
              setCountOpen(false);
            }}
          >
            Apply count
          </button>
        </div>
      </Modal>
    </div>
  );
}
