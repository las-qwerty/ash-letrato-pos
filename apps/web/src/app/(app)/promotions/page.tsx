'use client';

import { useState } from 'react';
import { fmtDate, isMoney, isPromoCode, peso, type Promotion, type PromotionType } from '@simmy/core';
import { Badge, EmptyState, Field, Modal, PageHeader } from '@/components/ui';
import { IconPercent, IconPlus } from '@/components/icons';
import { useStore } from '@/lib/store';
import clsx from 'clsx';

const typeLabel: Record<PromotionType, string> = {
  percent: 'Percent off',
  amount: 'Amount off',
  bxgy: 'Buy X get Y free',
};

const describe = (p: Promotion, productName?: string) => {
  if (p.type === 'percent') return `${p.pct}% off`;
  if (p.type === 'amount') return `${peso(p.amount ?? 0)} off`;
  return `Buy ${p.buyQty} ${productName ?? 'items'}, get ${p.getQty} free`;
};

export default function PromotionsPage() {
  const promotions = useStore((s) => s.promotions);
  const products = useStore((s) => s.products);
  const upsertPromotion = useStore((s) => s.upsertPromotion);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<Promotion | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm({
      id: `pr-${Date.now()}`,
      code: '',
      name: '',
      type: 'percent',
      pct: 10,
      usageCount: 0,
      isActive: true,
    });
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const code = form.code.trim().toUpperCase();
    if (!isPromoCode(code)) {
      setSaveError('Code must be 3–20 letters, digits, - or _ (no spaces).');
      return;
    }
    if (promotions.some((p) => p.code === code && p.id !== editing?.id)) {
      setSaveError('That code is already in use.');
      return;
    }
    if (form.type === 'percent' && (!form.pct || form.pct < 1 || form.pct > 100)) {
      setSaveError('Percent must be between 1 and 100.');
      return;
    }
    if (form.type === 'amount' && (!form.amount || !isMoney(form.amount))) {
      setSaveError('Enter a valid peso amount.');
      return;
    }
    if (form.type === 'bxgy' && (!form.buyQty || !form.getQty || !form.productId)) {
      setSaveError('Buy-X-get-Y needs quantities and a product.');
      return;
    }
    upsertPromotion({ ...form, code });
    setForm(null);
    setSaveError(null);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Promotions"
        sub="Codes cashiers can apply at the register"
        actions={
          <button className="btn-primary" onClick={openNew}>
            <IconPlus width={15} height={15} /> New promotion
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {promotions.map((p) => {
          const product = products.find((x) => x.id === p.productId);
          const expired = p.endsAt ? new Date(p.endsAt).getTime() < Date.now() : false;
          const exhausted = p.usageLimit != null && p.usageCount >= p.usageLimit;
          const live = p.isActive && !expired && !exhausted;

          return (
            <div key={p.id} className={clsx('card p-4', !live && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold tracking-wide text-pine-800">{p.code}</p>
                  <p className="mt-0.5 truncate text-sm text-stone-600">{p.name}</p>
                </div>
                <Badge tone={live ? 'pine' : expired ? 'stone' : 'clay'}>
                  {live ? 'live' : expired ? 'expired' : exhausted ? 'used up' : 'paused'}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-medium">{describe(p, product?.name)}</p>
              <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-xs text-stone-500">
                {p.minSpend != null && <p>Min spend {peso(p.minSpend)}</p>}
                {p.usageLimit != null && (
                  <p>
                    {p.usageCount}/{p.usageLimit} used
                  </p>
                )}
                {p.endsAt && <p>Ends {fmtDate(p.endsAt)}</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="btn-ghost !px-2 !py-1 text-xs"
                  onClick={() => {
                    setEditing(p);
                    setForm(p);
                  }}
                >
                  Edit
                </button>
                <button
                  className={clsx('btn-ghost !px-2 !py-1 text-xs', p.isActive ? 'text-clay' : 'text-pine-700')}
                  onClick={() => upsertPromotion({ ...p, isActive: !p.isActive })}
                >
                  {p.isActive ? 'Pause' : 'Activate'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {promotions.length === 0 && (
        <EmptyState icon={<IconPercent width={36} height={36} />} title="No promotions yet" />
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={editing ? 'Edit promotion' : 'New promotion'} wide>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code">
                <input
                  className="input font-mono uppercase"
                  required
                  placeholder="SUMMER20"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </Field>
              <Field label="Name">
                <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
            </div>

            <Field label="Type">
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(typeLabel) as PromotionType[]).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setForm({ ...form, type: t })}
                    className={clsx(
                      'rounded-lg border px-2 py-2 text-xs font-medium transition',
                      form.type === t
                        ? 'border-pine-600 bg-pine-50 text-pine-800'
                        : 'border-stone-200 text-stone-500 hover:border-stone-300',
                    )}
                  >
                    {typeLabel[t]}
                  </button>
                ))}
              </div>
            </Field>

            {form.type === 'percent' && (
              <Field label="Percent off">
                <input className="input w-32" type="number" min={1} max={100} required value={form.pct ?? ''} onChange={(e) => setForm({ ...form, pct: parseFloat(e.target.value) || 0 })} />
              </Field>
            )}
            {form.type === 'amount' && (
              <Field label="Pesos off">
                <input className="input w-32" type="number" min={1} required value={form.amount ?? ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
              </Field>
            )}
            {form.type === 'bxgy' && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="Buy qty">
                  <input className="input" type="number" min={1} required value={form.buyQty ?? ''} onChange={(e) => setForm({ ...form, buyQty: parseInt(e.target.value) || 0 })} />
                </Field>
                <Field label="Get free">
                  <input className="input" type="number" min={1} required value={form.getQty ?? ''} onChange={(e) => setForm({ ...form, getQty: parseInt(e.target.value) || 0 })} />
                </Field>
                <Field label="Product">
                  <select className="input" required value={form.productId ?? ''} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                    <option value="">Select…</option>
                    {products.filter((p) => p.pricing === 'fixed').map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Field label="Min spend (₱)">
                <input className="input" type="number" min={0} placeholder="none" value={form.minSpend ?? ''} onChange={(e) => setForm({ ...form, minSpend: e.target.value ? parseFloat(e.target.value) : undefined })} />
              </Field>
              <Field label="Usage limit">
                <input className="input" type="number" min={0} placeholder="∞" value={form.usageLimit ?? ''} onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? parseInt(e.target.value) : undefined })} />
              </Field>
              <Field label="Ends on">
                <input className="input" type="date" value={form.endsAt?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, endsAt: e.target.value ? `${e.target.value}T23:59:59` : undefined })} />
              </Field>
            </div>

            {saveError && (
              <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
                {saveError}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" className="btn-secondary flex-1" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1">{editing ? 'Save changes' : 'Create promotion'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
