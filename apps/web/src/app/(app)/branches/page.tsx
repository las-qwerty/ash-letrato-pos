'use client';

import { useState } from 'react';
import { peso, type Branch } from '@simmy/core';
import { Badge, Field, Modal, PageHeader } from '@/components/ui';
import { IconBuilding, IconPlus } from '@/components/icons';
import { useStore } from '@/lib/store';

export default function BranchesPage() {
  const branches = useStore((s) => s.branches);
  const sales = useStore((s) => s.sales);
  const users = useStore((s) => s.users);
  const upsertBranch = useStore((s) => s.upsertBranch);
  const [form, setForm] = useState<Branch | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim() || !form.address.trim()) {
      setError('Branch name and address are required.');
      return;
    }
    upsertBranch(form);
    setForm(null);
    setError(null);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Branches"
        sub="Locations and their staff"
        actions={
          <button
            className="btn-primary"
            onClick={() =>
              setForm({ id: `b-${Date.now()}`, name: '', address: '', isActive: true })
            }
          >
            <IconPlus width={15} height={15} /> New branch
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {branches.map((b) => {
          const branchSales = sales.filter((s) => s.branchName === b.name);
          const revenue = branchSales
            .filter((s) => s.status === 'completed')
            .reduce((a, s) => a + s.total, 0);
          const staff = users.filter((u) => u.branchId === b.id);

          return (
            <div key={b.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pine-100 text-pine-700">
                    <IconBuilding width={18} height={18} />
                  </div>
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-stone-500">{b.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={b.isActive ? 'pine' : 'stone'}>
                    {b.isActive ? 'open' : 'closed'}
                  </Badge>
                  <button
                    className="btn-ghost !px-2 !py-1 text-xs"
                    onClick={() => setForm(b)}
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-paper px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-stone-500">Revenue</p>
                  <p className="font-display text-lg font-medium">{peso(revenue)}</p>
                </div>
                <div className="rounded-lg bg-paper px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-stone-500">Sales</p>
                  <p className="font-display text-lg font-medium">{branchSales.length}</p>
                </div>
              </div>

              <div className="mt-4 border-t border-stone-100 pt-3">
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-stone-500">Staff</p>
                <div className="flex flex-wrap gap-1.5">
                  {staff.map((u) => (
                    <Badge key={u.id} tone="stone">
                      {u.firstName} {u.lastName} · {u.role.replace('_', ' ')}
                    </Badge>
                  ))}
                  {staff.length === 0 && (
                    <span className="text-xs text-stone-400">No staff assigned</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form && branches.some((b) => b.id === form.id) ? `Edit ${form.name}` : 'New branch'}
      >
        {form && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Branch name">
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Address">
              <input
                className="input"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-stone-300 text-pine-700 focus:ring-pine-500"
              />
              Branch is open
            </label>
            {error && (
              <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
                {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" className="btn-secondary flex-1" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1">Save branch</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
