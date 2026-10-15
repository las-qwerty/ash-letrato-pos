'use client';

import { useMemo, useState } from 'react';
import { fmtTime, peso, workedHours, type EmployeeProfile, type LeaveType, type PayrollRun, type User } from '@simmy/core';
import { Badge, EmptyState, Field, Modal, PageHeader } from '@/components/ui';
import { Pagination } from '@/components/pagination';
import { downloadXlsx } from '@/lib/excel';
import { usePager } from '@/lib/use-pager';
import { IconDownload, IconUsers } from '@/components/icons';
import { useStore } from '@/lib/store';
import clsx from 'clsx';

type Tab = 'people' | 'attendance' | 'payroll';
const statusTone = { draft: 'stone', reviewed: 'brass', approved: 'pine', paid: 'pine' } as const;

export default function HrPage() {
  const [tab, setTab] = useState<Tab>('people');
  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="HR &amp; Payroll" sub="Employee profiles, attendance, leave, and pay runs" />
      <div className="mb-5 flex gap-1 rounded-lg bg-stone-100 p-1" role="tablist" aria-label="HR sections">
        {([['people', 'People'], ['attendance', 'Attendance'], ['payroll', 'Payroll']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={clsx(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition',
              tab === t ? 'bg-white text-ink shadow-sm' : 'text-stone-500 hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'people' && <PeopleTab />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'payroll' && <PayrollTab />}
    </div>
  );
}

// ─── People ──────────────────────────────────────────────────────────────────

function PeopleTab() {
  const users = useStore((s) => s.users);
  const profiles = useStore((s) => s.employeeProfiles);
  const upsertEmployeeProfile = useStore((s) => s.upsertEmployeeProfile);
  const [editing, setEditing] = useState<User | null>(null);
  const pager = usePager(users, 10, []);

  const profileOf = (id: string) => profiles.find((p) => p.userId === id);

  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-stone-200 bg-paper/60">
          <tr>
            <th className="th">Employee</th>
            <th className="th">Position</th>
            <th className="th">Status</th>
            <th className="th">Pay</th>
            <th className="th text-right">Rate</th>
            <th className="th text-right">Allowances</th>
            <th className="th text-right">Deductions</th>
            <th className="th"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {pager.pageItems.map((u) => {
            const p = profileOf(u.id);
            return (
              <tr key={u.id} className="border-b border-stone-100 last:border-0">
                <td className="td">
                  <p className="font-medium">{u.firstName} {u.lastName}</p>
                  <p className="text-xs capitalize text-stone-400">{u.role.replace('_', ' ')}</p>
                </td>
                <td className="td text-stone-600">{p?.position ?? '—'}</td>
                <td className="td">
                  {p ? (
                    <Badge tone={p.status === 'active' ? 'pine' : p.status === 'on_leave' ? 'brass' : 'stone'}>
                      {p.status.replace('_', ' ')}
                    </Badge>
                  ) : (
                    <Badge tone="clay">no profile</Badge>
                  )}
                </td>
                <td className="td text-stone-600">{p?.salaryType ?? '—'}</td>
                <td className="td text-right tabular-nums">{p ? peso(p.rate) : '—'}</td>
                <td className="td text-right tabular-nums text-stone-500">{p ? peso(p.allowances) : '—'}</td>
                <td className="td text-right tabular-nums text-stone-500">{p ? peso(p.deductions) : '—'}</td>
                <td className="td text-right">
                  <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setEditing(u)}>
                    {p ? 'Edit' : 'Create profile'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} />
      <ProfileModal user={editing} existing={editing ? profileOf(editing.id) : undefined} onSave={upsertEmployeeProfile} onClose={() => setEditing(null)} />
    </div>
  );
}

function ProfileModal({
  user,
  existing,
  onSave,
  onClose,
}: {
  user: User | null;
  existing?: EmployeeProfile;
  onSave: (p: EmployeeProfile) => void;
  onClose: () => void;
}) {
  const [position, setPosition] = useState(existing?.position ?? '');
  const [status, setStatus] = useState<EmployeeProfile['status']>(existing?.status ?? 'active');
  const [salaryType, setSalaryType] = useState<EmployeeProfile['salaryType']>(existing?.salaryType ?? 'daily');
  const [rate, setRate] = useState(String(existing?.rate ?? 0));
  const [allowances, setAllowances] = useState(String(existing?.allowances ?? 0));
  const [deductions, setDeductions] = useState(String(existing?.deductions ?? 0));
  const [ot, setOt] = useState(String(existing?.overtimeRate ?? 1.25));
  const [hiredAt, setHiredAt] = useState(existing?.hiredAt ?? new Date().toISOString().slice(0, 10));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    onSave({
      userId: user.id,
      position: position.trim() || user.role.replace('_', ' '),
      status,
      hiredAt,
      salaryType,
      rate: Math.max(0, parseFloat(rate) || 0),
      allowances: Math.max(0, parseFloat(allowances) || 0),
      deductions: Math.max(0, parseFloat(deductions) || 0),
      overtimeRate: Math.max(1, parseFloat(ot) || 1.25),
    });
    onClose();
  };

  return (
    <Modal open={!!user} onClose={onClose} title={user ? `Profile — ${user.firstName} ${user.lastName}` : ''}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Position">
            <input className="input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Cashier" />
          </Field>
          <Field label="Employment status">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as EmployeeProfile['status'])}>
              <option value="active">Active</option>
              <option value="on_leave">On leave</option>
              <option value="resigned">Resigned</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Salary type">
            <select className="input" value={salaryType} onChange={(e) => setSalaryType(e.target.value as EmployeeProfile['salaryType'])}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
            </select>
          </Field>
          <Field label={salaryType === 'monthly' ? 'Rate (₱/month)' : salaryType === 'hourly' ? 'Rate (₱/hour)' : 'Rate (₱/day)'}>
            <input className="input" type="number" min={0} step="0.01" required value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Allowances (₱)">
            <input className="input" type="number" min={0} step="0.01" value={allowances} onChange={(e) => setAllowances(e.target.value)} />
          </Field>
          <Field label="Deductions (₱)">
            <input className="input" type="number" min={0} step="0.01" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
          </Field>
          <Field label="OT multiplier">
            <input className="input" type="number" min={1} step="0.05" value={ot} onChange={(e) => setOt(e.target.value)} />
          </Field>
        </div>
        <Field label="Hired on">
          <input className="input" type="date" value={hiredAt} onChange={(e) => setHiredAt(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1">Save profile</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Attendance ───────────────────────────────────────────────────────────────

function AttendanceTab() {
  const users = useStore((s) => s.users);
  const attendance = useStore((s) => s.attendance);
  const profiles = useStore((s) => s.employeeProfiles);
  const branches = useStore((s) => s.branches);
  const currentUser = useStore((s) => s.currentUser);
  const clockIn = useStore((s) => s.clockIn);
  const clockOut = useStore((s) => s.clockOut);
  const recordLeave = useStore((s) => s.recordLeave);
  const [leaveFor, setLeaveFor] = useState<User | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const main = branches[0]?.id ?? '';
  const todayRec = (id: string) => attendance.find((r) => r.userId === id && r.date === today);
  const activeUsers = users.filter((u) => profiles.find((p) => p.userId === u.id)?.status !== 'resigned');

  const recent = useMemo(
    () => attendance.slice(0, 200),
    [attendance],
  );
  const pager = usePager(recent, 10, []);
  const nameOf = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : id;
  };

  return (
    <div className="space-y-4">
      {err && <p role="alert" className="rounded-lg bg-clay/10 px-4 py-2.5 text-sm text-clay">{err}</p>}

      <div className="card p-5">
        <h2 className="mb-3 font-display text-lg font-medium">Today — {today}</h2>
        <ul className="divide-y divide-stone-100">
          {activeUsers.map((u) => {
            const rec = todayRec(u.id);
            const hrs = rec ? workedHours(rec) : 0;
            return (
              <li key={u.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-stone-400">
                    {rec?.clockIn
                      ? `In ${fmtTime(rec.clockIn)}${rec.clockOut ? ` · Out ${fmtTime(rec.clockOut)} · ${hrs.toFixed(1)}h` : ' · on shift'}`
                      : rec?.leaveType
                        ? `${rec.leaveType} leave${rec.leaveApprovedBy ? ` (approved by ${rec.leaveApprovedBy})` : ''}`
                        : 'Not clocked in'}
                  </p>
                </div>
                {!rec?.clockIn && !rec?.leaveType && (
                  <button
                    className="btn-secondary !py-1.5 text-xs"
                    onClick={() => setErr(clockIn(u.id, u.branchId || main))}
                  >
                    Clock in
                  </button>
                )}
                {rec?.clockIn && !rec.clockOut && (
                  <button className="btn-primary !py-1.5 text-xs" onClick={() => setErr(clockOut(u.id))}>
                    Clock out
                  </button>
                )}
                {!rec?.clockIn && (
                  <button className="btn-ghost !py-1.5 text-xs text-brass-600" onClick={() => setLeaveFor(u)}>
                    Leave
                  </button>
                )}
                {rec?.clockOut && <Badge tone="pine">{hrs.toFixed(1)}h done</Badge>}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="border-b border-stone-200 bg-paper/60 px-5 py-3 font-display text-lg font-medium">Recent attendance</h2>
        <table className="w-full">
          <thead className="border-b border-stone-200">
            <tr>
              <th className="th">Date</th>
              <th className="th">Employee</th>
              <th className="th">In</th>
              <th className="th">Out</th>
              <th className="th text-right">Hours</th>
              <th className="th">Leave</th>
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.map((r) => (
              <tr key={r.id} className="border-b border-stone-100 last:border-0">
                <td className="td tabular-nums">{r.date}</td>
                <td className="td font-medium">{nameOf(r.userId)}</td>
                <td className="td text-stone-600">{r.clockIn ? fmtTime(r.clockIn) : '—'}</td>
                <td className="td text-stone-600">{r.clockOut ? fmtTime(r.clockOut) : '—'}</td>
                <td className="td text-right tabular-nums">{workedHours(r).toFixed(1)}</td>
                <td className="td">
                  {r.leaveType ? (
                    <Badge tone={r.leaveApprovedBy ? 'pine' : 'brass'}>
                      {r.leaveType}{r.leaveApprovedBy ? ' ✓' : ''}
                    </Badge>
                  ) : (
                    <span className="text-stone-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {recent.length === 0 && (
          <EmptyState icon={<IconUsers width={36} height={36} />} title="No attendance yet" hint="Clock staff in from the roster above." />
        )}
        <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} />
      </div>

      <LeaveModal
        user={leaveFor}
        branchId={leaveFor?.branchId || main}
        approver={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}
        onSave={(date, type, notes) => {
          if (leaveFor) recordLeave(leaveFor.id, leaveFor.branchId || main, date, type, `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || 'Manager', notes);
          setLeaveFor(null);
        }}
        onClose={() => setLeaveFor(null)}
      />
    </div>
  );
}

function LeaveModal({
  user,
  approver,
  onSave,
  onClose,
}: {
  user: User | null;
  branchId: string;
  approver: string;
  onSave: (date: string, type: LeaveType, notes?: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<LeaveType>('vacation');
  const [notes, setNotes] = useState('');
  return (
    <Modal open={!!user} onClose={onClose} title={user ? `Leave — ${user.firstName} ${user.lastName}` : ''}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(date, type, notes.trim() || undefined);
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Leave type">
            <select className="input" value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
              <option value="vacation">Vacation</option>
              <option value="sick">Sick</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </Field>
        <p className="text-xs text-stone-500">Approved by: <span className="font-medium">{approver}</span></p>
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1">Record leave</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

const nextStep: Record<PayrollRun['status'], 'reviewed' | 'approved' | 'paid' | null> = {
  draft: 'reviewed',
  reviewed: 'approved',
  approved: 'paid',
  paid: null,
};
const nextLabel: Record<PayrollRun['status'], string | null> = {
  draft: 'Mark reviewed',
  reviewed: 'Approve',
  approved: 'Mark paid',
  paid: null,
};
const needsPin: PayrollRun['status'][] = ['approved', 'paid'];

function PayrollTab() {
  const payrollRuns = useStore((s) => s.payrollRuns);
  const users = useStore((s) => s.users);
  const currentUser = useStore((s) => s.currentUser);
  const createPayrollRun = useStore((s) => s.createPayrollRun);
  const advancePayroll = useStore((s) => s.advancePayroll);
  const [newOpen, setNewOpen] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PayrollRun | null>(null);
  const [authRun, setAuthRun] = useState<PayrollRun | null>(null);

  const pager = usePager(payrollRuns, 10, []);
  const me = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || 'Owner';
  const supervisors = users.filter((u) => u.canAuthorizeVoids);
  // Payroll data is confidential — only owner/manager may export it.
  const canExport = currentUser?.role === 'super_admin' || currentUser?.role === 'manager';

  const exportRun = (r: PayrollRun) => {
    downloadXlsx(`ash-letrato-payroll-${r.periodStart}_to_${r.periodEnd}`, [
      {
        name: 'Payslips',
        rows: [
          ['Employee', 'Days worked', 'Paid leave', 'Hours', 'OT hrs', 'Gross', 'OT pay', 'Allowances', 'Deductions', 'Net pay'],
          ...r.slips.map((s) => [
            s.employeeName,
            s.daysWorked,
            s.paidLeaveDays,
            s.hoursWorked,
            s.overtimeHrs,
            s.gross,
            s.overtimePay,
            s.allowances,
            s.deductions,
            s.net,
          ]),
          [],
          ['TOTALS', '', '', '', '', r.slips.reduce((a, s) => a + s.gross, 0), r.slips.reduce((a, s) => a + s.overtimePay, 0), '', '', r.slips.reduce((a, s) => a + s.net, 0)],
        ],
      },
      {
        name: 'Run details',
        rows: [
          ['Period', `${r.periodStart} → ${r.periodEnd}`],
          ['Status', r.status],
          ['Created by', r.createdBy],
          ['Reviewed by', r.reviewedBy ?? ''],
          ['Approved by', r.approvedBy ?? ''],
          ['Paid at', r.paidAt ?? ''],
        ],
      },
    ]);
  };

  const advance = (r: PayrollRun) => {
    const to = nextStep[r.status];
    if (!to) return;
    if (needsPin.includes(to)) {
      setAuthRun(r);
    } else {
      advancePayroll(r.id, to, me);
    }
  };

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between border-b border-stone-200 bg-paper/60 px-5 py-3">
        <h2 className="font-display text-lg font-medium">Payroll runs</h2>
        <button className="btn-primary !py-1.5 text-xs" onClick={() => setNewOpen(true)}>
          New run
        </button>
      </div>
      {err && <p role="alert" className="mx-5 mt-4 rounded-lg bg-clay/10 px-4 py-2.5 text-sm text-clay">{err}</p>}
      <table className="w-full">
        <thead className="border-b border-stone-200">
          <tr>
            <th className="th">Period</th>
            <th className="th">Employees</th>
            <th className="th text-right">Gross</th>
            <th className="th text-right">Net pay</th>
            <th className="th">Status</th>
            <th className="th"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {pager.pageItems.map((r) => {
            const gross = r.slips.reduce((a, s) => a + s.gross + s.overtimePay, 0);
            const net = r.slips.reduce((a, s) => a + s.net, 0);
            return (
              <tr key={r.id} className="border-b border-stone-100 last:border-0">
                <td className="td font-medium tabular-nums">{r.periodStart} → {r.periodEnd}</td>
                <td className="td text-stone-600">{r.slips.length}</td>
                <td className="td text-right tabular-nums">{peso(gross)}</td>
                <td className="td text-right font-medium tabular-nums">{peso(net)}</td>
                <td className="td"><Badge tone={statusTone[r.status]}>{r.status}</Badge></td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    {canExport && (
                      <button
                        className="btn-ghost !px-2 !py-1"
                        onClick={() => exportRun(r)}
                        aria-label="Export payroll run"
                        title="Export payroll run (.xlsx)"
                      >
                        <IconDownload width={14} height={14} />
                      </button>
                    )}
                    <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setViewing(r)}>Slips</button>
                    {nextStep[r.status] && (
                      <button className="btn-ghost !px-2 !py-1 text-xs text-pine-700" onClick={() => advance(r)}>
                        {nextLabel[r.status]}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {payrollRuns.length === 0 && (
        <EmptyState icon={<IconUsers width={36} height={36} />} title="No payroll runs" hint="Create a run to compute payslips from attendance." />
      )}
      <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} />

      {/* New run */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New payroll run">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const error = createPayrollRun(start, end, me);
            if (error) { setErr(error); return; }
            setErr(null);
            setNewOpen(false);
            setStart(''); setEnd('');
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period start">
              <input className="input" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Period end">
              <input className="input" type="date" required value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-stone-500">
            Payslips are computed from attendance in the period — daily staff get rate × days worked,
            hourly get rate × hours, monthly is prorated by period length. Approved paid leave is included.
          </p>
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setNewOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1">Generate run</button>
          </div>
        </form>
      </Modal>

      {/* Payslips */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `Payslips — ${viewing.periodStart} → ${viewing.periodEnd}` : ''}>
        {viewing && (
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200">
              <tr>
                <th className="py-2 text-left text-xs font-medium uppercase text-stone-500">Employee</th>
                <th className="py-2 text-right text-xs font-medium uppercase text-stone-500">Days</th>
                <th className="py-2 text-right text-xs font-medium uppercase text-stone-500">OT hrs</th>
                <th className="py-2 text-right text-xs font-medium uppercase text-stone-500">Gross+OT</th>
                <th className="py-2 text-right text-xs font-medium uppercase text-stone-500">Net</th>
              </tr>
            </thead>
            <tbody>
              {viewing.slips.map((s) => (
                <tr key={s.userId} className="border-b border-stone-100 last:border-0">
                  <td className="py-2.5 font-medium">{s.employeeName}</td>
                  <td className="py-2.5 text-right tabular-nums">{s.daysWorked + s.paidLeaveDays}</td>
                  <td className="py-2.5 text-right tabular-nums">{s.overtimeHrs || '—'}</td>
                  <td className="py-2.5 text-right tabular-nums">{peso(s.gross + s.overtimePay)}</td>
                  <td className="py-2.5 text-right font-medium tabular-nums">{peso(s.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      {/* Supervisor authorization for approve/paid */}
      <PayrollAuthModal
        run={authRun}
        supervisors={supervisors}
        onAuthorized={(by) => {
          if (authRun) {
            const to = nextStep[authRun.status];
            if (to) advancePayroll(authRun.id, to, by);
          }
          setAuthRun(null);
        }}
        onClose={() => setAuthRun(null)}
      />
    </div>
  );
}

function PayrollAuthModal({
  run,
  supervisors,
  onAuthorized,
  onClose,
}: {
  run: PayrollRun | null;
  supervisors: User[];
  onAuthorized: (by: string) => void;
  onClose: () => void;
}) {
  const [supId, setSupId] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const to = run ? nextStep[run.status] : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = supervisors.find((s) => s.id === supId);
    if (!sup || !to) { setErr('Choose the authorizing supervisor.'); return; }
    void useStore.getState().verifyPin(sup.id, pin).then((ok) => {
      if (!ok) { setErr('Incorrect PIN for that supervisor.'); return; }
      onAuthorized(`${sup.firstName} ${sup.lastName}`);
      setSupId(''); setPin(''); setErr(null);
    });
  };

  return (
    <Modal open={!!run} onClose={onClose} title={run ? `Authorize — mark ${to}` : ''}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-paper px-4 py-3 text-sm text-stone-600">
          {run && `Run ${run.periodStart} → ${run.periodEnd} · ${run.slips.length} payslips · net ${peso(run.slips.reduce((a, s) => a + s.net, 0))}`}.
          A supervisor PIN is required and this is written to the audit trail.
        </p>
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
        {err && <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1">Authorize</button>
        </div>
      </form>
    </Modal>
  );
}
