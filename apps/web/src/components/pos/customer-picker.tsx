'use client';

import { useMemo, useState } from 'react';
import { initials, isPhone, type Customer } from '@simmy/core';
import { IconSearch, IconStar } from '../icons';
import { Badge, Modal } from '../ui';
import { useCart } from '@/lib/cart';
import { useStore } from '@/lib/store';
import clsx from 'clsx';

const tierTone = { none: 'stone', silver: 'stone', gold: 'brass', platinum: 'pine' } as const;

export function CustomerPicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const customers = useStore((s) => s.customers);
  const upsertCustomer = useStore((s) => s.upsertCustomer);
  const setCustomer = useCart((s) => s.setCustomer);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.code} ${c.phone ?? ''}`
        .toLowerCase()
        .includes(needle),
    );
  }, [customers, q]);

  const pick = (c: Customer) => {
    setCustomer(c);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Attach customer" wide>
      <div className="relative">
        <IconSearch
          width={16}
          height={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          className="input !pl-9"
          placeholder="Search name, code, or phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <ul className="mt-3 max-h-80 divide-y divide-stone-100 overflow-y-auto" role="listbox">
        {results.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => pick(c)}
              className="flex w-full items-center gap-3 px-2 py-2.5 text-left transition hover:bg-paper"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine-100 text-xs font-semibold text-pine-800">
                {initials(c.firstName, c.lastName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {c.firstName} {c.lastName}
                  {(c.isSeniorCitizen || c.isPwd) && (
                    <span className="ml-2 text-[11px] font-medium text-clay">
                      {c.isSeniorCitizen ? 'SC' : 'PWD'}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-stone-500">
                  {c.code}
                  {c.phone ? ` · ${c.phone}` : ''}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-stone-500">
                  <IconStar width={12} height={12} className="text-brass-500" />
                  {c.loyaltyPoints.toLocaleString()}
                </span>
                <Badge tone={tierTone[c.tier]}>
                  {c.tier === 'none' ? 'member' : c.tier}
                </Badge>
              </span>
            </button>
          </li>
        ))}
        {results.length === 0 && (
          <li className="px-2 py-8 text-center text-sm text-stone-400">
            No customers match “{q}”
          </li>
        )}
      </ul>

      {adding ? (
        <NewMemberForm
          onCreated={(c) => {
            upsertCustomer(c);
            pick(c);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full rounded-lg border border-dashed border-stone-300 px-3 py-2.5 text-sm text-stone-500 transition hover:border-pine-400 hover:text-pine-700"
        >
          + New member
        </button>
      )}
    </Modal>
  );
}

function NewMemberForm({
  onCreated,
  onCancel,
}: {
  onCreated: (c: Customer) => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (phone && !isPhone(phone)) {
      setError('Phone number looks invalid.');
      return;
    }
    onCreated({
      id: `c-${Date.now()}`,
      code: `M-${Date.now().toString(36).toUpperCase()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      tier: 'none',
      loyaltyPoints: 0,
      lifetimeSpend: 0,
      isSeniorCitizen: false,
      isPwd: false,
    });
  };

  return (
    <form onSubmit={save} className="mt-3 space-y-2 rounded-lg border border-stone-200 bg-paper p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">New member</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input !py-2"
          placeholder="First name"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          className="input !py-2"
          placeholder="Last name"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
      <input
        className="input !py-2"
        placeholder="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      {error && <p role="alert" className="text-xs text-clay">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 !py-2 text-xs">
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1 !py-2 text-xs">
          Add &amp; attach
        </button>
      </div>
    </form>
  );
}

export function CustomerChip() {
  const customer = useCart((s) => s.customer);
  const setCustomer = useCart((s) => s.setCustomer);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={clsx(
          'flex w-full items-center gap-2.5 rounded-lg border border-dashed px-3 py-2.5 text-left text-sm transition',
          customer
            ? 'border-pine-300 bg-pine-50 text-ink'
            : 'border-stone-300 text-stone-500 hover:border-pine-400 hover:text-pine-700',
        )}
      >
        {customer ? (
          <>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pine-700 text-[11px] font-semibold text-white">
              {initials(customer.firstName, customer.lastName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {customer.firstName} {customer.lastName}
              </span>
              <span className="block text-[11px] text-stone-500">
                {customer.tier !== 'none' && `${customer.tier} member · `}
                {customer.loyaltyPoints.toLocaleString()} pts
              </span>
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Remove customer"
              className="rounded p-1 text-stone-400 hover:bg-white hover:text-clay"
              onClick={(e) => {
                e.stopPropagation();
                setCustomer(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  setCustomer(null);
                }
              }}
            >
              ×
            </span>
          </>
        ) : (
          <>+ Attach customer</>
        )}
      </button>
      <CustomerPicker open={open} onClose={() => setOpen(false)} />
    </>
  );
}
