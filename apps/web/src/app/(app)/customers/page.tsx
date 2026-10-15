'use client';

import { useMemo, useState } from 'react';
import { initials, isEmail, isPhone, peso, type Customer, type MembershipTier } from '@simmy/core';
import { Badge, EmptyState, Field, Modal, PageHeader } from '@/components/ui';
import { IconPlus, IconSearch, IconStar, IconUsers } from '@/components/icons';
import { Pagination } from '@/components/pagination';
import { usePager } from '@/lib/use-pager';
import { useStore } from '@/lib/store';

const tierTone = { none: 'stone', silver: 'stone', gold: 'brass', platinum: 'pine' } as const;
const tiers: MembershipTier[] = ['none', 'silver', 'gold', 'platinum'];

export default function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const upsertCustomer = useStore((s) => s.upsertCustomer);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return customers.filter((c) =>
      !needle ||
      `${c.firstName} ${c.lastName} ${c.code} ${c.phone ?? ''}`.toLowerCase().includes(needle),
    );
  }, [customers, q]);

  const pager = usePager(filtered, 12, [q]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (form.phone && !isPhone(form.phone)) {
      setSaveError('Phone number looks invalid.');
      return;
    }
    if (form.email && !isEmail(form.email)) {
      setSaveError('Email address looks invalid.');
      return;
    }
    if ((form.isSeniorCitizen || form.isPwd) && !form.discountId?.trim()) {
      setSaveError('Enter the SC/PWD ID number — required for statutory discounts.');
      return;
    }
    upsertCustomer(form);
    setForm(null);
    setSaveError(null);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Customers"
        sub="Membership, loyalty points, and statutory discount eligibility"
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setForm({
                id: `c-${Date.now()}`,
                code: `C-${String(customers.length + 1).padStart(4, '0')}`,
                firstName: '',
                lastName: '',
                tier: 'none',
                loyaltyPoints: 0,
                lifetimeSpend: 0,
                isSeniorCitizen: false,
                isPwd: false,
              });
            }}
          >
            <IconPlus width={15} height={15} /> New customer
          </button>
        }
      />

      <div className="relative mb-4 w-72">
        <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input className="input !pl-9" placeholder="Search name, code, or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {pager.pageItems.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setEditing(c);
              setForm(c);
            }}
            className="card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-100 text-sm font-semibold text-pine-800">
                {initials(c.firstName, c.lastName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {c.firstName} {c.lastName}
                </p>
                <p className="text-xs text-stone-500">{c.code}{c.phone ? ` · ${c.phone}` : ''}</p>
              </div>
              <Badge tone={tierTone[c.tier]}>{c.tier === 'none' ? 'member' : c.tier}</Badge>
            </div>
            <div className="mt-3 flex items-center gap-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <IconStar width={12} height={12} className="text-brass-500" />
                {c.loyaltyPoints.toLocaleString()} pts
              </span>
              <span>{peso(c.lifetimeSpend)} lifetime</span>
              {(c.isSeniorCitizen || c.isPwd) && (
                <Badge tone="clay">{c.isSeniorCitizen ? 'Senior' : 'PWD'}</Badge>
              )}
            </div>
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <EmptyState icon={<IconUsers width={36} height={36} />} title="No customers found" />
      )}
      <div className="card mt-4">
        <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} />
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={editing ? 'Edit customer' : 'New customer'}>
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
            <div className="grid grid-cols-2 gap-3">
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
