'use client';

import { useState } from 'react';
import {
  FEATURE_KEYS,
  MODULE_KEYS,
  PERMISSION_LABELS,
  effectivePermissions,
  initials,
  isEmail,
  isPin,
  type Permission,
  type Role,
  type User,
} from '@simmy/core';
import { Badge, Field, Modal, PageHeader } from '@/components/ui';
import { IconPlus } from '@/components/icons';
import { Pagination } from '@/components/pagination';
import { usePager } from '@/lib/use-pager';
import { useStore } from '@/lib/store';

const roles: { id: Role; label: string; hint: string }[] = [
  { id: 'cashier', label: 'Cashier', hint: 'Sell, tender payments' },
  { id: 'handler', label: 'Handler', hint: 'Producers assigned to sale lines' },
  { id: 'manager', label: 'Manager', hint: 'Everything + authorize voids/refunds' },
  { id: 'super_admin', label: 'Owner', hint: 'Full control' },
];

const roleTone: Record<Role, 'pine' | 'brass' | 'clay' | 'stone'> = {
  super_admin: 'clay',
  manager: 'pine',
  cashier: 'brass',
  handler: 'stone',
};

export default function UsersPage() {
  const users = useStore((s) => s.users);
  const branches = useStore((s) => s.branches);
  const upsertUser = useStore((s) => s.upsertUser);
  const currentUser = useStore((s) => s.currentUser);
  const isOwner = currentUser?.role === 'super_admin';
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<User | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pager = usePager(users, 10);

  const openNew = () => {
    setEditing(null);
    setForm({
      id: `u-${Date.now()}`,
      email: '',
      firstName: '',
      lastName: '',
      role: 'cashier',
      branchId: branches[0]?.id ?? '',
      canAuthorizeVoids: false,
      pin: '',
    });
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!isEmail(form.email)) {
      setSaveError('Enter a valid email address.');
      return;
    }
    if (users.some((u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== editing?.id)) {
      setSaveError('That email is already registered to another staff member.');
      return;
    }
    if (!editing && !isPin(form.pin)) {
      setSaveError('PIN must be exactly 4 digits.');
      return;
    }
    if (form.pin && !isPin(form.pin)) {
      setSaveError('PIN must be exactly 4 digits.');
      return;
    }
    upsertUser({ ...form, canAuthorizeVoids: effectivePermissions(form).has('void_refund') });
    setForm(null);
    setSaveError(null);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Staff"
        sub="Register access, roles, and what each person can use"
        actions={
          <button className="btn-primary" onClick={openNew}>
            <IconPlus width={15} height={15} /> New staff
          </button>
        }
      />

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-stone-200 bg-paper/60">
            <tr>
              <th className="th">Staff</th>
              <th className="th">Role</th>
              <th className="th">Branch</th>
              <th className="th">Register PIN</th>
              <th className="th">Access</th>
              <th className="th"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.map((u) => (
              <tr key={u.id} className="border-b border-stone-100 last:border-0 hover:bg-paper/50">
                <td className="td">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pine-100 text-xs font-semibold text-pine-800">
                      {initials(u.firstName, u.lastName)}
                    </span>
                    <div>
                      <p className="font-medium">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-stone-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="td"><Badge tone={roleTone[u.role]}>{u.role.replace('_', ' ')}</Badge></td>
                <td className="td text-stone-500">
                  {branches.find((b) => b.id === u.branchId)?.name ?? '—'}
                </td>
                <td className="td font-mono tracking-[0.3em] text-stone-500">••••</td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={u.permissions ? 'brass' : 'stone'}>{u.permissions ? 'custom' : 'role defaults'}</Badge>
                    {effectivePermissions(u).has('void_refund') && <Badge tone="pine">void / refund</Badge>}
                  </div>
                </td>
                <td className="td text-right">
                  <button
                    className="btn-ghost !px-2 !py-1 text-xs"
                    onClick={() => {
                      setEditing(u);
                      setForm(u);
                    }}
                  >
                    {isOwner ? 'Edit' : 'View'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} />
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={editing ? 'Edit staff' : 'New staff'}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <input className="input" required disabled={!isOwner} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </Field>
              <Field label="Last name">
                <input className="input" required disabled={!isOwner} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </Field>
            </div>
            <Field label="Email">
              <input className="input" type="email" required disabled={!isOwner} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <select className="input" disabled={!isOwner} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Branch">
                <select className="input" disabled={!isOwner} value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            {isOwner && (
              <Field label={editing ? 'Register PIN (blank = keep current)' : 'Register PIN (4 digits)'}>
                <input
                  className="input w-40 text-center tracking-[0.4em]"
                  inputMode="numeric"
                  maxLength={4}
                  required={!editing}
                  pattern="\d{4}"
                  placeholder="••••"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                />
              </Field>
            )}
            <AccessEditor form={form} editable={isOwner} onChange={setForm} />
            {saveError && (
              <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
                {saveError}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" className="btn-secondary flex-1" onClick={() => setForm(null)}>
                {isOwner ? 'Cancel' : 'Close'}
              </button>
              {isOwner && (
                <button type="submit" className="btn-primary flex-1">{editing ? 'Save changes' : 'Create staff'}</button>
              )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function AccessEditor({ form, editable, onChange }: { form: User; editable: boolean; onChange: (u: User) => void }) {
  const granted = effectivePermissions(form);
  const custom = form.permissions !== undefined;
  const isOwnerRole = form.role === 'super_admin';
  const apply = (next: Permission[] | undefined) =>
    onChange({
      ...form,
      permissions: next,
      canAuthorizeVoids: effectivePermissions({ ...form, permissions: next }).has('void_refund'),
    });
  const toggle = (p: Permission, on: boolean) => {
    const base = [...granted];
    apply(on ? [...new Set([...base, p])] : base.filter((x) => x !== p));
  };
  const row = (p: Permission) => (
    <label key={p} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-paper">
      <input
        type="checkbox"
        className="h-4 w-4 rounded accent-pine-700"
        disabled={!editable || isOwnerRole || !custom}
        checked={granted.has(p)}
        onChange={(e) => toggle(p, e.target.checked)}
      />
      {PERMISSION_LABELS[p]}
    </label>
  );
  return (
    <fieldset className="space-y-3 rounded-lg border border-stone-200 p-3">
      <legend className="px-1 text-sm font-medium">Access</legend>
      {isOwnerRole ? (
        <p className="text-xs text-stone-500">The owner always has every module and feature.</p>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-pine-700"
            disabled={!editable}
            checked={!custom}
            onChange={(e) => apply(e.target.checked ? undefined : [...granted])}
          />
          Use role defaults ({form.role.replace('_', ' ')})
        </label>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <p className="col-span-2 text-[11px] font-medium uppercase tracking-wide text-stone-400">Modules</p>
        {MODULE_KEYS.map(row)}
        <p className="col-span-2 mt-2 text-[11px] font-medium uppercase tracking-wide text-stone-400">Features</p>
        {FEATURE_KEYS.map(row)}
      </div>
      <p className="text-xs text-stone-500">
        {editable
          ? custom
            ? 'Custom access: tick exactly what this person may open or do.'
            : 'Untick “Use role defaults” to choose modules and features one by one.'
          : 'Only the owner can change access. Changes are recorded in the audit log.'}
      </p>
    </fieldset>
  );
}
