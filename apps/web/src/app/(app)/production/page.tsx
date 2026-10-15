'use client';

import { useMemo, useState } from 'react';
import { fmtTime, type PunchRecord } from '@simmy/core';
import { Badge, EmptyState, Field, Modal, PageHeader } from '@/components/ui';
import { BarcodePrintModal } from '@/components/barcode';
import { IconAlert, IconBarcode, IconBox, IconDownload } from '@/components/icons';
import { downloadXlsx } from '@/lib/excel';
import { Pagination } from '@/components/pagination';
import { usePager } from '@/lib/use-pager';
import { useStore } from '@/lib/store';
import clsx from 'clsx';

const statusTone = { open: 'brass', completed: 'pine', flagged: 'clay' } as const;

export default function ProductionPage() {
  const punchRecords = useStore((s) => s.punchRecords);
  const counterReadings = useStore((s) => s.counterReadings);
  const products = useStore((s) => s.products);
  const sales = useStore((s) => s.sales);
  const users = useStore((s) => s.users);
  const branches = useStore((s) => s.branches);
  const currentUser = useStore((s) => s.currentUser);
  const addPunchRecord = useStore((s) => s.addPunchRecord);
  const completePunchRecord = useStore((s) => s.completePunchRecord);
  const flagPunchRecord = useStore((s) => s.flagPunchRecord);
  const correctPunchRecord = useStore((s) => s.correctPunchRecord);
  const addCounterReading = useStore((s) => s.addCounterReading);

  const [branchId, setBranchId] = useState<'all' | string>('all');
  const [newOpen, setNewOpen] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [completing, setCompleting] = useState<PunchRecord | null>(null);
  const [flagging, setFlagging] = useState<PunchRecord | null>(null);
  const [correcting, setCorrecting] = useState<PunchRecord | null>(null);
  const [printingTicket, setPrintingTicket] = useState<PunchRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mainBranch = branches[0]?.id ?? '';
  const viewBranch = branchId === 'all' ? mainBranch : branchId;
  const actor = currentUser
    ? {
        employeeId: currentUser.id,
        employeeName: `${currentUser.firstName} ${currentUser.lastName}`,
        branchId: currentUser.branchId || viewBranch,
      }
    : undefined;
  const todayStr = new Date().toISOString().slice(0, 10);
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;

  // ── Reconciliation (today, viewed branch) ──
  const machineTrackedIds = useMemo(
    () => new Set(products.filter((p) => p.machineTracked).map((p) => p.id)),
    [products],
  );
  const recon = useMemo(() => {
    const isToday = (iso: string) => iso.slice(0, 10) === todayStr;
    const expected = sales
      .filter((s) => s.status === 'completed' && s.branchId === viewBranch && isToday(s.createdAt))
      .reduce(
        (a, s) =>
          a +
          s.lines
            .filter((l) => l.productId && machineTrackedIds.has(l.productId))
            .reduce((x, l) => x + l.qty, 0),
        0,
      );
    const tickets = punchRecords.filter(
      (p) => p.branchId === viewBranch && isToday(p.createdAt) && p.status !== 'flagged',
    );
    const punched = tickets.reduce((a, p) => a + p.qty, 0);
    const damaged = tickets.reduce((a, p) => a + p.damagedQty, 0);
    const reads = counterReadings.filter(
      (c) => c.branchId === viewBranch && c.shiftDate === todayStr,
    );
    const openR = reads.filter((c) => c.kind === 'open').sort((a, b) => a.reading - b.reading)[0];
    const closeR = reads.filter((c) => c.kind === 'close').sort((a, b) => b.reading - a.reading)[0];
    const machineDelta = openR && closeR ? closeR.reading - openR.reading : null;
    return { expected, punched, damaged, openR, closeR, machineDelta };
  }, [sales, punchRecords, counterReadings, viewBranch, machineTrackedIds, todayStr]);
  const variance = recon.punched - recon.expected;

  const [search, setSearch] = useState('');
  const tickets = useMemo(
    () =>
      punchRecords.filter(
        (p) =>
          (branchId === 'all' || p.branchId === branchId) &&
          (!search || p.ticketCode.toLowerCase().includes(search.toLowerCase()) || p.serviceType.toLowerCase().includes(search.toLowerCase()) || p.employeeName.toLowerCase().includes(search.toLowerCase())),
      ),
    [punchRecords, branchId, search],
  );
  const pager = usePager(tickets, 10, [search, branchId]);

  const trackedProducts = products.filter((p) => p.machineTracked && p.isActive);
  const nextTicket = `JT-${String(punchRecords.length + 1).padStart(4, '0')}`;

  const exportProduction = () => {
    downloadXlsx(`ash-letrato-production-${todayStr}`, [
      {
        name: 'Job tickets',
        rows: [
          ['Ticket', 'Service', 'Branch', 'Operator', 'Planned/Actual qty', 'Damaged', 'Reprocessed', 'Status', 'Linked sale', 'Correction', 'Created'],
          ...tickets.map((p) => [
            p.ticketCode,
            p.serviceType,
            branchName(p.branchId),
            p.employeeName,
            p.qty,
            p.damagedQty,
            p.reprocessedQty,
            p.status,
            p.saleId ?? '',
            p.correction ? `${p.correction.reason} (by ${p.correction.approvedBy})` : '',
            p.createdAt.slice(0, 16).replace('T', ' '),
          ]),
          [],
          ['EXPECTED (POS)', recon.expected, 'PUNCHED', recon.punched, 'MACHINE Δ', recon.machineDelta ?? '', 'VARIANCE', variance],
        ],
      },
      {
        name: 'Counter readings',
        rows: [
          ['Date', 'Machine', 'Branch', 'Open/Close', 'Reading', 'Employee'],
          ...counterReadings.map((c) => [c.shiftDate, c.machine, branchName(c.branchId), c.kind, c.reading, c.employeeName]),
        ],
      },
    ]);
    setNotice('Production workbook downloaded.');
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Production"
        sub="Punching & machine output — tallied against POS sales and counter readings"
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={exportProduction}>
              <IconDownload width={14} height={14} /> Export
            </button>
            <button className="btn-secondary" onClick={() => setCounterOpen(true)}>
              Log counter
            </button>
            <button className="btn-primary" onClick={() => setNewOpen(true)}>
              New job ticket
            </button>
          </div>
        }
      />

      {notice && (
        <p className="mb-4 rounded-lg bg-pine-50 px-4 py-2.5 text-sm text-pine-800">{notice}</p>
      )}

      {/* Reconciliation */}
      <div className="card mb-4 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-medium">Today’s reconciliation</h2>
          <select
            className="input !w-48 !py-1.5 text-xs"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            aria-label="Branch"
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-paper p-3">
            <p className="text-xs text-stone-500">Expected (POS sales)</p>
            <p className="mt-1 font-display text-2xl font-medium tabular-nums">{recon.expected}</p>
          </div>
          <div className="rounded-xl bg-paper p-3">
            <p className="text-xs text-stone-500">Punched (tickets)</p>
            <p className="mt-1 font-display text-2xl font-medium tabular-nums">{recon.punched}</p>
          </div>
          <div className="rounded-xl bg-paper p-3">
            <p className="text-xs text-stone-500">Machine counter Δ</p>
            <p className="mt-1 font-display text-2xl font-medium tabular-nums">
              {recon.machineDelta ?? '—'}
            </p>
            {recon.machineDelta == null && (
              <p className="text-[11px] text-stone-400">needs open + close readings</p>
            )}
          </div>
          <div className={clsx('rounded-xl p-3', variance === 0 ? 'bg-pine-50' : 'bg-clay/10')}>
            <p className="text-xs text-stone-500">Variance</p>
            <p className={clsx('mt-1 font-display text-2xl font-medium tabular-nums', variance === 0 ? 'text-pine-800' : 'text-clay')}>
              {variance > 0 ? `+${variance}` : variance}
            </p>
            {recon.damaged > 0 && (
              <p className="text-[11px] text-clay">{recon.damaged} damaged logged</p>
            )}
          </div>
        </div>
        {variance !== 0 && (
          <p className="mt-3 flex items-center gap-2 text-xs text-stone-500">
            <IconAlert width={13} height={13} className="text-brass-500" />
            Punched qty doesn’t match POS-recorded work — check unmatched jobs or missing tickets.
            Flag the suspect ticket for investigation rather than assuming fault.
          </p>
        )}
      </div>

      {/* Today's counter readings */}
      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <h2 className="mb-3 font-display text-lg font-medium">Job tickets</h2>
          <input
            className="input mb-3 !py-1.5 text-sm"
            placeholder="Search ticket, service, employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <table className="w-full">
            <thead className="border-b border-stone-200">
              <tr>
                <th className="th">Ticket</th>
                <th className="th">Service</th>
                <th className="th">Operator</th>
                <th className="th text-right">Qty</th>
                <th className="th text-right">Damaged</th>
                <th className="th">Status</th>
                <th className="th"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-0">
                  <td className="td font-mono text-xs">{p.ticketCode}</td>
                  <td className="td">
                    <p className="font-medium">{p.serviceType}</p>
                    <p className="text-xs text-stone-400">{branchName(p.branchId)} · {fmtTime(p.createdAt)}</p>
                    {p.correction && (
                      <p className="text-xs text-brass-600">corrected by {p.correction.approvedBy}: {p.correction.reason}</p>
                    )}
                  </td>
                  <td className="td text-stone-500">{p.employeeName}</td>
                  <td className="td text-right font-medium tabular-nums">{p.qty}</td>
                  <td className="td text-right tabular-nums text-stone-500">
                    {p.damagedQty + p.reprocessedQty > 0 ? `${p.damagedQty}dmg +${p.reprocessedQty}redo` : '—'}
                  </td>
                  <td className="td"><Badge tone={statusTone[p.status]}>{p.status}</Badge></td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <button
                        className="btn-ghost !px-2 !py-1"
                        onClick={() => setPrintingTicket(p)}
                        aria-label={`Print barcode for ${p.ticketCode}`}
                        title="Print job-ticket barcode"
                      >
                        <IconBarcode width={14} height={14} />
                      </button>
                      {p.status === 'open' && (
                        <button className="btn-ghost !px-2 !py-1 text-xs text-pine-700" onClick={() => setCompleting(p)}>
                          Complete
                        </button>
                      )}
                      {p.status !== 'flagged' && (
                        <button className="btn-ghost !px-2 !py-1 text-xs text-clay" onClick={() => setFlagging(p)}>
                          Flag
                        </button>
                      )}
                      <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setCorrecting(p)}>
                        Correct
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && (
            <EmptyState icon={<IconBox width={36} height={36} />} title="No job tickets" hint="Open a ticket to start tracking machine work." />
          )}
          <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} />
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-display text-lg font-medium">Machine counters</h2>
          <ul className="space-y-2.5">
            {counterReadings
              .filter((c) => branchId === 'all' || c.branchId === branchId)
              .slice(0, 8)
              .map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{c.machine}</p>
                    <p className="text-xs text-stone-400">{c.shiftDate} · {c.employeeName}</p>
                  </div>
                  <span className="text-right">
                    <Badge tone={c.kind === 'open' ? 'stone' : 'brass'}>{c.kind}</Badge>
                    <span className="ml-2 font-mono text-sm tabular-nums">{c.reading.toLocaleString()}</span>
                  </span>
                </li>
              ))}
            {counterReadings.length === 0 && (
              <p className="text-sm text-stone-400">No readings yet — log open/close each shift.</p>
            )}
          </ul>
        </div>
      </div>

      <NewTicketModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        ticketCode={nextTicket}
        tracked={trackedProducts}
        branchId={viewBranch}
        actor={actor}
        onCreated={() => { setNewOpen(false); setNotice('Job ticket opened.'); }}
      />
      <CounterModal
        open={counterOpen}
        onClose={() => setCounterOpen(false)}
        branchId={viewBranch}
        branchName={branchName}
        actor={actor}
        onCreated={() => { setCounterOpen(false); setNotice('Counter reading logged.'); }}
      />
      <CompleteModal record={completing} onClose={() => setCompleting(null)} />
      <FlagModal record={flagging} actor={actor} onClose={() => setFlagging(null)} />
      <CorrectModal record={correcting} supervisors={users.filter((u) => u.canAuthorizeVoids)} onClose={() => setCorrecting(null)} />
      <BarcodePrintModal
        code={printingTicket?.ticketCode ?? ''}
        title={printingTicket ? `${printingTicket.serviceType} — ${printingTicket.ticketCode}` : ''}
        sub={printingTicket ? `Scan to look up job · ${printingTicket.employeeName}` : undefined}
        open={!!printingTicket}
        onClose={() => setPrintingTicket(null)}
      />
    </div>
  );

  function NewTicketModal({
    open, onClose, ticketCode, tracked, branchId, actor, onCreated,
  }: {
    open: boolean; onClose: () => void; ticketCode: string;
    tracked: typeof trackedProducts;
    branchId: string;
    actor?: { employeeId: string; employeeName: string; branchId: string };
    onCreated: () => void;
  }) {
    const [productId, setProductId] = useState('');
    const [qty, setQty] = useState('');
    const [saleId, setSaleId] = useState('');
    const [err, setErr] = useState<string | null>(null);

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      const p = tracked.find((x) => x.id === productId);
      const n = parseInt(qty);
      if (!p || !n || n <= 0) return;
      const error = addPunchRecord({
        ticketCode,
        branchId,
        employeeId: actor?.employeeId ?? '',
        employeeName: actor?.employeeName ?? '—',
        serviceType: p.name,
        productId: p.id,
        saleId: saleId || undefined,
        qty: n,
        damagedQty: 0,
        reprocessedQty: 0,
      });
      if (error) { setErr(error); return; }
      setProductId(''); setQty(''); setSaleId(''); setErr(null);
      onCreated();
    };

    const todaySales = sales
      .filter((s) => s.createdAt.slice(0, 10) === todayStr && s.status === 'completed')
      .slice(0, 20);

    return (
      <Modal open={open} onClose={onClose} title={`New job ticket — ${ticketCode}`}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Machine-tracked service">
            <select className="input" required value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select…</option>
              {tracked.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Planned quantity">
            <input className="input text-center text-lg" type="number" min={1} required value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Link to sale (optional)">
            <select className="input" value={saleId} onChange={(e) => setSaleId(e.target.value)}>
              <option value="">— unlinked —</option>
              {todaySales.map((s) => (
                <option key={s.id} value={s.id}>{s.invoiceNumber} · {s.customerName ?? 'Walk-in'}</option>
              ))}
            </select>
          </Field>
          {err && <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1">Open ticket</button>
          </div>
        </form>
      </Modal>
    );
  }

  function CounterModal({
    open, onClose, branchId, branchName, actor, onCreated,
  }: {
    open: boolean; onClose: () => void; branchId: string;
    branchName: (id: string) => string;
    actor?: { employeeId: string; employeeName: string; branchId: string };
    onCreated: () => void;
  }) {
    const [machine, setMachine] = useState('Punching Machine 1');
    const [kind, setKind] = useState<'open' | 'close'>('open');
    const [reading, setReading] = useState('');

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      const n = parseInt(reading);
      if (!machine.trim() || Number.isNaN(n) || n < 0) return;
      addCounterReading({
        branchId,
        machine: machine.trim(),
        kind,
        reading: n,
        employeeId: actor?.employeeId ?? '',
        employeeName: actor?.employeeName ?? '—',
        shiftDate: todayStr,
      });
      setReading('');
      onCreated();
    };

    return (
      <Modal open={open} onClose={onClose} title="Log machine counter">
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded-lg bg-paper px-4 py-3 text-sm text-stone-600">
            {branchName(branchId)} · {todayStr}
          </p>
          <Field label="Machine">
            <input className="input" required value={machine} onChange={(e) => setMachine(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reading type">
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value as 'open' | 'close')}>
                <option value="open">Shift open</option>
                <option value="close">Shift close</option>
              </select>
            </Field>
            <Field label="Counter value">
              <input className="input text-center" type="number" min={0} required value={reading} onChange={(e) => setReading(e.target.value)} />
            </Field>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1">Save reading</button>
          </div>
        </form>
      </Modal>
    );
  }

  function CompleteModal({ record, onClose }: { record: PunchRecord | null; onClose: () => void }) {
    const [qty, setQty] = useState('');
    const [dmg, setDmg] = useState('0');
    const [redo, setRedo] = useState('0');

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!record) return;
      const n = parseInt(qty);
      if (Number.isNaN(n) || n <= 0) return;
      completePunchRecord(record.id, {
        qty: n,
        damagedQty: Math.max(0, parseInt(dmg) || 0),
        reprocessedQty: Math.max(0, parseInt(redo) || 0),
      });
      setQty(''); setDmg('0'); setRedo('0');
      setNotice(`Ticket ${record.ticketCode} completed — ${n} units.`);
      onClose();
    };

    return (
      <Modal open={!!record} onClose={onClose} title={record ? `Complete ${record.ticketCode}` : ''}>
        {record && (
          <form onSubmit={submit} className="space-y-4">
            <p className="rounded-lg bg-paper px-4 py-3 text-sm text-stone-600">
              {record.serviceType} · planned {record.qty} units
            </p>
            <Field label="Actual quantity produced">
              <input className="input text-center text-lg" type="number" min={1} required value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Damaged / waste">
                <input className="input text-center" type="number" min={0} value={dmg} onChange={(e) => setDmg(e.target.value)} />
              </Field>
              <Field label="Reprocessed">
                <input className="input text-center" type="number" min={0} value={redo} onChange={(e) => setRedo(e.target.value)} />
              </Field>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary flex-1">Complete job</button>
            </div>
          </form>
        )}
      </Modal>
    );
  }

  function FlagModal({
    record, actor, onClose,
  }: {
    record: PunchRecord | null;
    actor?: { employeeId: string; employeeName: string; branchId: string };
    onClose: () => void;
  }) {
    const [reason, setReason] = useState('');
    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!record || !reason.trim()) return;
      flagPunchRecord(record.id, reason.trim(), actor);
      setReason('');
      setNotice(`Ticket ${record.ticketCode} flagged for investigation.`);
      onClose();
    };
    return (
      <Modal open={!!record} onClose={onClose} title={record ? `Flag ${record.ticketCode}` : ''}>
        {record && (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Reason for flagging">
              <textarea
                className="input min-h-[4rem] resize-none"
                required
                placeholder="e.g. Count exceeds linked sale qty — verify job slips"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-danger flex-1">Flag ticket</button>
            </div>
          </form>
        )}
      </Modal>
    );
  }

  function CorrectModal({
    record, supervisors, onClose,
  }: {
    record: PunchRecord | null;
    supervisors: { id: string; firstName: string; lastName: string }[];
    onClose: () => void;
  }) {
    const [supId, setSupId] = useState('');
    const [pin, setPin] = useState('');
    const [reason, setReason] = useState('');
    const [qty, setQty] = useState('');
    const [dmg, setDmg] = useState('0');
    const [redo, setRedo] = useState('0');
    const [err, setErr] = useState<string | null>(null);

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!record) return;
      const sup = supervisors.find((x) => x.id === supId);
      if (!sup) { setErr('Choose the authorizing supervisor.'); return; }
      const n = parseInt(qty);
      if (Number.isNaN(n) || n < 0 || !reason.trim()) { setErr('Enter a corrected qty and a reason.'); return; }
      void useStore.getState().verifyPin(sup.id, pin).then((ok) => {
        if (!ok) { setErr('Incorrect PIN for that supervisor.'); return; }
        correctPunchRecord(
          record.id,
          { qty: n, damagedQty: Math.max(0, parseInt(dmg) || 0), reprocessedQty: Math.max(0, parseInt(redo) || 0) },
          reason.trim(),
          `${sup.firstName} ${sup.lastName}`,
        );
        setSupId(''); setPin(''); setReason(''); setQty(''); setDmg('0'); setRedo('0'); setErr(null);
        setNotice(`Ticket ${record.ticketCode} corrected under supervision.`);
        onClose();
      });
    };

    return (
      <Modal open={!!record} onClose={onClose} title={record ? `Correct ${record.ticketCode}` : ''}>
        {record && (
          <form onSubmit={submit} className="space-y-4">
            <p className="rounded-lg bg-paper px-4 py-3 text-sm text-stone-600">
              Current counts — {record.qty} qty · {record.damagedQty} damaged · {record.reprocessedQty} reprocessed.
              Corrections need a supervisor PIN and are written to the audit trail.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Qty">
                <input className="input text-center" type="number" min={0} required value={qty} onChange={(e) => setQty(e.target.value)} />
              </Field>
              <Field label="Damaged">
                <input className="input text-center" type="number" min={0} value={dmg} onChange={(e) => setDmg(e.target.value)} />
              </Field>
              <Field label="Reprocessed">
                <input className="input text-center" type="number" min={0} value={redo} onChange={(e) => setRedo(e.target.value)} />
              </Field>
            </div>
            <Field label="Authorizing supervisor">
              <select className="input" required value={supId} onChange={(e) => setSupId(e.target.value)}>
                <option value="">Select supervisor…</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </Field>
            <Field label="Supervisor PIN">
              <input
                className="input text-center tracking-[0.4em]"
                type="password" inputMode="numeric" maxLength={6} required
                value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
            <Field label="Reason">
              <textarea className="input min-h-[4rem] resize-none" required value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            {err && <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">{err}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary flex-1">Apply correction</button>
            </div>
          </form>
        )}
      </Modal>
    );
  }
}
