'use client';

import { useMemo, useState } from 'react';
import {
  birthdaysInMonth,
  hasPermission,
  initials,
  isEmail,
  isPhone,
  isValidISODate,
  membershipExpiry,
  membershipStatus,
  peso,
  renewalStart,
  todayISO,
  type Customer,
  type MembershipTier,
} from '@simmy/core';
import { Badge, EmptyState, Field, Modal, PageHeader } from '@/components/ui';
import { IconPlus, IconSearch, IconStar, IconUsers } from '@/components/icons';
import { Pagination } from '@/components/pagination';
import { isBuyer } from '@/lib/ledger';
import { usePager } from '@/lib/use-pager';
import { useStore } from '@/lib/store';

const tierTone = { none: 'stone', silver: 'stone', gold: 'brass', platinum: 'pine' } as const;
const tiers: MembershipTier[] = ['none', 'silver', 'gold', 'platinum'];
const stateTone = { valid: 'pine', expiring: 'brass', expired: 'clay', none: 'stone' } as const;
const stateLabel = { valid: 'Member · valid', expiring: 'Expiring soon', expired: 'Expired', none: 'Not a member' } as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const currentUser = useStore((s) => s.currentUser);
  const upsertCustomer = useStore((s) => s.upsertCustomer);
  const canMembership = hasPermission(currentUser, 'membership');
  const today = todayISO();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Customer | null>(null);
  const [member, setMember] = useState(false);
  const [cardNo, setCardNo] = useState('');
  const [start, setStart] = useState(today);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [birthMonth, setBirthMonth] = useState(new Date().getMonth() + 1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return customers.filter(
      (c) => !needle || `${c.firstName} ${c.lastName} ${c.code} ${c.phone ?? ''}`.toLowerCase().includes(needle),
    );
  }, [customers, q]);
  const pager = usePager(filtered, 12, [q]);
  const birthdays = useMemo(() => birthdaysInMonth(customers, birthMonth), [customers, birthMonth]);

  const openFor = (c: Customer | null, next: Customer) => {
    setEditing(c);
    setForm(next);
    setMember(!!next.membershipCardNo);
    setCardNo(next.membershipCardNo ?? '');
    setStart(next.membershipStart ?? today);
    setSaveError(null);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (form.phone && !isPhone(form.phone)) return setSaveError('Phone number looks invalid.');
    if (form.email && !isEmail(form.email)) return setSaveError('Email address looks invalid.');
    if ((form.isSeniorCitizen || form.isPwd) && !form.discountId?.trim())
      return setSaveError('Enter the SC/PWD ID number — required for statutory discounts.');
    if (!editing && !form.birthdate) return setSaveError('Enter the birthdate — needed to plan birthday tarpaulins.');
    if (form.birthdate && !isValidISODate(form.birthdate)) return setSaveError('Birthdate is not a real date.');
    let membership: Pick<Customer, 'membershipCardNo' | 'membershipStart' | 'membershipExpires'> = {
      membershipCardNo: undefined,
      membershipStart: undefined,
      membershipExpires: undefined,
    };
    if (!canMembership && editing) {
      membership = {
        membershipCardNo: editing.membershipCardNo,
        membershipStart: editing.membershipStart,
        membershipExpires: editing.membershipExpires,
      };
    } else if (member) {
      if (!cardNo.trim()) return setSaveError('Enter the membership card number.');
      if (!isValidISODate(start)) return setSaveError('Enter a valid membership start date.');
      membership = {
        membershipCardNo: cardNo.trim().toUpperCase(),
        membershipStart: start,
        membershipExpires: membershipExpiry(start),
      };
    }
    const error = upsertCustomer({ ...form, birthdate: form.birthdate || undefined, ...membership });
    if (error) return setSaveError(error);
    setForm(null);
    setSaveError(null);
  };

  const renew = () =>
    setStart(renewalStart({ membershipCardNo: cardNo, membershipExpires: editing?.membershipExpires }, today));

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Customers"
        sub="Membership, birthdays, loyalty points, and statutory discount eligibility"
        actions={
          <button
            className="btn-primary"
            onClick={() =>
              openFor(null, {
                id: `c-${Date.now()}`,
                code: `C-${String(customers.length + 1).padStart(4, '0')}`,
                firstName: '',
                lastName: '',
                tier: 'none',
                loyaltyPoints: 0,
                lifetimeSpend: 0,
                isSeniorCitizen: false,
                isPwd: false,
              })
            }
          >
            <IconPlus width={15} height={15} /> New customer
          </button>
        }
      />

      <div className="card mb-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Birthdays in {MONTHS[birthMonth - 1]}</p>
            <p className="text-xs text-stone-500">Plan birthday tarpaulins and birth-month layouts ahead of time.</p>
          </div>
          <select
            className="input !w-auto"
            value={birthMonth}
            onChange={(e) => setBirthMonth(Number(e.target.value))}
            aria-label="Birth month"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        {birthdays.length === 0 ? (
          <p className="mt-3 text-sm text-stone-400">No customer birthdays this month.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {birthdays.map((c) => {
              const st = membershipStatus(c, today);
              return (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2 text-sm">
                  <span className="truncate">
                    <span className="font-medium">{MONTHS[birthMonth - 1]} {c.day}</span> · {c.firstName} {c.lastName}
                  </span>
                  <Badge tone={stateTone[st.state]}>{stateLabel[st.state]}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="relative mb-4 w-72">
        <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input className="input !pl-9" placeholder="Search name, code, or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {pager.pageItems.map((c) => {
          const st = membershipStatus(c, today);
          return (
            <button
              key={c.id}
              onClick={() => openFor(c, c)}
              className="card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-100 text-sm font-semibold text-pine-800">
                  {initials(c.firstName, c.lastName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-stone-500">{c.code}{c.phone ? ` · ${c.phone}` : ''}</p>
                </div>
                <Badge tone={tierTone[c.tier]}>{c.tier === 'none' ? 'member' : c.tier}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stone-100 pt-3 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <IconStar width={12} height={12} className="text-brass-500" />
                  {c.loyaltyPoints.toLocaleString()} pts
                </span>
                <span>{peso(c.lifetimeSpend)} lifetime</span>
                {(c.isSeniorCitizen || c.isPwd) && (
                  <Badge tone="clay">{c.isSeniorCitizen ? 'Senior' : 'PWD'}</Badge>
                )}
                {st.state !== 'none' && <Badge tone={stateTone[st.state]}>{stateLabel[st.state]}</Badge>}
              </div>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <EmptyState icon={<IconUsers width={36} height={36} />} title="No customers found" />
      )}
      <div className="card mt-4">
        <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} />
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={editing ? 'Edit customer' : 'New customer'} wide>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <input className="input" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </Field>
              <Field label="Last name">
                <input className="input" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label={editing ? 'Birthdate' : 'Birthdate *'}>
                <input className="input" type="date" value={form.birthdate ?? ''} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className="input" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Membership tier">
                <select className="input" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as MembershipTier })}>
                  {tiers.map((t) => (
                    <option key={t} value={t}>{t === 'none' ? 'None' : t[0]!.toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </Field>
            </div>

            <fieldset className="space-y-3 rounded-lg border border-stone-200 p-3">
              <legend className="px-1 text-sm font-medium">Membership card</legend>
              {canMembership ? (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-pine-700" checked={member} onChange={(e) => setMember(e.target.checked)} />
                    Issue a one-year membership card
                  </label>
                  {member && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Card number">
                          <input className="input font-mono uppercase" value={cardNo} placeholder="e.g. ASH-2026-0101" onChange={(e) => setCardNo(e.target.value)} />
                        </Field>
                        <Field label="Valid from">
                          <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                        </Field>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                        <span>
                          Valid through <strong className="text-stone-700">{isValidISODate(start) ? membershipExpiry(start) : '—'}</strong>
                        </span>
                        {editing?.membershipCardNo && (
                          <button type="button" className="btn-secondary !py-1 text-xs" onClick={renew}>
                            Renew for one year
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-stone-500">
                  {(() => {
                    const st = membershipStatus(editing ?? form, today);
                    return st.state === 'none' ? 'Not a member.' : `${stateLabel[st.state]} · card ${editing?.membershipCardNo} · through ${st.expires}`;
                  })()}{' '}
                  Only authorized staff can issue or renew membership cards.
                </p>
              )}
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-pine-700"
                  checked={form.isSeniorCitizen}
                  onChange={(e) => setForm({ ...form, isSeniorCitizen: e.target.checked, isPwd: e.target.checked ? false : form.isPwd })}
                />
                Senior citizen
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-pine-700"
                  checked={form.isPwd}
                  onChange={(e) => setForm({ ...form, isPwd: e.target.checked, isSeniorCitizen: e.target.checked ? false : form.isSeniorCitizen })}
                />
                PWD
              </label>
            </div>
            {(form.isSeniorCitizen || form.isPwd) && (
              <Field label={form.isSeniorCitizen ? 'Senior citizen ID' : 'PWD ID'}>
                <input className="input" placeholder="e.g. SC-1042" value={form.discountId ?? ''} onChange={(e) => setForm({ ...form, discountId: e.target.value })} />
              </Field>
            )}

            {editing && hasPermission(currentUser, 'customer_history') && <PurchaseHistory customer={editing} />}

            {saveError && (
              <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
                {saveError}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" className="btn-secondary flex-1" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1">{editing ? 'Save changes' : 'Create customer'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function PurchaseHistory({ customer }: { customer: Customer }) {
  const sales = useStore((s) => s.sales);
  const rows = useMemo(
    () => sales.filter((s) => isBuyer(customer, s)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [sales, customer],
  );
  const spent = rows.filter((s) => s.status === 'completed').reduce((a, s) => a + s.total, 0);
  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Purchase history</p>
        <p className="text-sm">
          Total spent <strong className="font-display tabular-nums">{peso(spent)}</strong>
          <span className="text-xs text-stone-500"> · {rows.filter((s) => s.status === 'completed').length} completed orders</span>
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-stone-400">No orders yet.</p>
      ) : (
        <ul className="mt-2 max-h-56 divide-y divide-stone-100 overflow-y-auto text-xs">
          {rows.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-1.5">
              <span className="text-stone-600">
                {s.invoiceNumber} · {new Date(s.createdAt).toLocaleDateString('en-PH')} · {s.branchName}
                {s.status !== 'completed' && <span className="ml-1 text-clay">({s.status})</span>}
              </span>
              <span className="tabular-nums">{peso(s.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
