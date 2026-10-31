'use client';

import { useRef, useState } from 'react';
import { isMoney, isSku, type Product, type ProductKind } from '@simmy/core';
import { Field, Modal } from './ui';
import { IconImage, IconTrash } from './icons';
import { fileToImageDataUrl, IMAGE_ACCEPT_ATTR } from '@/lib/image';
import { useStore } from '@/lib/store';

export const blankProduct = (
  kind: ProductKind,
  categoryId: string,
): Omit<Product, 'id'> => ({
  sku: '',
  name: '',
  categoryId,
  kind,
  price: 0,
  pricing: 'fixed',
  consumes: [],
  stockQty: kind === 'service' ? undefined : 0,
  isActive: true,
});

export function CatalogModal({
  form,
  setForm,
  editing,
  kind,
  onClose,
}: {
  form: Omit<Product, 'id'> | null;
  setForm: (f: Omit<Product, 'id'> | null) => void;
  editing: Product | null;
  kind: ProductKind;
  onClose: () => void;
}) {
  const categories = useStore((s) => s.categories);
  const materials = useStore((s) => s.materials);
  const products = useStore((s) => s.products);
  const upsertProduct = useStore((s) => s.upsertProduct);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const imgInput = useRef<HTMLInputElement>(null);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !form) return;
    try {
      const dataUrl = await fileToImageDataUrl(file);
      setForm({ ...form, imageUrl: dataUrl });
      setImgError(null);
    } catch (err) {
      setImgError(err instanceof Error ? err.message : 'Could not load that image.');
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!isSku(form.sku)) {
      setSaveError('SKU must be 2–30 letters/digits (dashes ok).');
      return;
    }
    if (!isMoney(form.price) || form.price <= 0) {
      setSaveError('Price must be a positive amount (max ₱1,000,000).');
      return;
    }
    if (products.some((p) => p.sku === form.sku && p.id !== editing?.id)) {
      setSaveError('That SKU is already used by another item.');
      return;
    }
    upsertProduct({ ...form, kind, id: editing?.id ?? `p-${Date.now()}` });
    setForm(null);
    setSaveError(null);
  };

  const noun = kind === 'service' ? 'service' : 'product';

  return (
    <Modal
      open={!!form}
      onClose={onClose}
      title={editing ? `Edit ${editing.name}` : `New ${noun}`}
    >
      {form && (
        <form onSubmit={save} className="space-y-4">
          {/* Image — persisted with the item, shown at the register */}
          <div className="flex items-center gap-4">
            {form.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.imageUrl}
                alt={form.name || 'Item image'}
                className="h-20 w-20 rounded-xl border border-stone-200 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-paper text-stone-300">
                <IconImage width={26} height={26} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Image</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary !px-3 !py-1.5 text-xs"
                  onClick={() => imgInput.current?.click()}
                >
                  {form.imageUrl ? 'Replace' : 'Upload'}…
                </button>
                {form.imageUrl && (
                  <button
                    type="button"
                    className="btn-ghost !px-3 !py-1.5 text-xs text-clay"
                    onClick={() => setForm({ ...form, imageUrl: undefined })}
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-stone-400">JPG, PNG or WebP · max 3 MB · auto-resized</p>
            </div>
            <input
              ref={imgInput}
              type="file"
              accept={IMAGE_ACCEPT_ATTR}
              className="hidden"
              onChange={(e) => void onPickImage(e)}
            />
          </div>
          {imgError && (
            <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">{imgError}</p>
          )}
          <Field label="Name">
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Description (optional)">
            <input
              className="input"
              placeholder="Shown on receipts and detail views"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value || undefined })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU">
              <input className="input" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Category">
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pricing">
              <select
                className="input"
                value={form.pricing}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pricing: e.target.value as Product['pricing'],
                    areaUnit: e.target.value === 'area' ? 'sq ft' : undefined,
                    minCharge: e.target.value === 'area' ? form.minCharge : undefined,
                  })
                }
              >
                <option value="fixed">Fixed price</option>
                <option value="area">By area</option>
              </select>
            </Field>
            <Field label={form.pricing === 'area' ? 'Rate per sq ft' : 'Price'}>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.price || ''}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              />
            </Field>
          </div>
          {form.pricing === 'area' && (
            <Field label="Minimum charge (optional)">
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={form.minCharge || ''}
                onChange={(e) => setForm({ ...form, minCharge: parseFloat(e.target.value) || undefined })}
              />
            </Field>
          )}
          {form.pricing === 'fixed' && kind === 'product' && (
            <Field label="Stock on hand">
              <input
                className="input"
                type="number"
                min={0}
                value={form.stockQty ?? 0}
                onChange={(e) => setForm({ ...form, stockQty: parseInt(e.target.value) || 0 })}
              />
            </Field>
          )}
          {kind === 'service' && (
            <>
              <label className="flex items-start gap-3 rounded-lg border border-stone-200 px-3 py-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded accent-pine-700"
                  checked={form.machineTracked ?? false}
                  onChange={(e) => setForm({ ...form, machineTracked: e.target.checked || undefined })}
                />
                <span>
                  <span className="block text-sm font-medium">Machine-tracked output</span>
                  <span className="block text-xs text-stone-500">
                    Counted on production equipment — reconciled in the Production screen
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-stone-200 px-3 py-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded accent-pine-700"
                  checked={form.notaryFee ?? false}
                  onChange={(e) => setForm({ ...form, notaryFee: e.target.checked || undefined })}
                />
                <span>
                  <span className="block text-sm font-medium">Charges notary fee</span>
                  <span className="block text-xs text-stone-500">
                    Adds the configured document-stamp fee per unit at checkout
                  </span>
                </span>
              </label>
            </>
          )}

          {/* Material recipe — deducted from inventory per unit sold */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Consumes materials
              </span>
              <button
                type="button"
                className="text-xs font-medium text-pine-700 hover:underline"
                onClick={() =>
                  setForm({
                    ...form,
                    consumes: [
                      ...form.consumes,
                      { materialId: materials[0]?.id ?? '', qty: 1 },
                    ],
                  })
                }
              >
                + Add material
              </button>
            </div>
            {form.consumes.length === 0 ? (
              <p className="rounded-lg bg-paper px-3 py-2 text-xs text-stone-400">
                No recipe — nothing is deducted from stock when this sells.
              </p>
            ) : (
              <div className="space-y-2">
                {form.consumes.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      className="input flex-1"
                      value={row.materialId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          consumes: form.consumes.map((r, j) =>
                            j === i ? { ...r, materialId: e.target.value } : r,
                          ),
                        })
                      }
                    >
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      className="input !w-20"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={row.qty}
                      aria-label="Quantity per unit sold"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          consumes: form.consumes.map((r, j) =>
                            j === i ? { ...r, qty: Math.max(0, parseFloat(e.target.value) || 0) } : r,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label="Remove material"
                      className="rounded p-1.5 text-stone-400 hover:bg-clay/10 hover:text-clay"
                      onClick={() =>
                        setForm({ ...form, consumes: form.consumes.filter((_, j) => j !== i) })
                      }
                    >
                      <IconTrash width={14} height={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {saveError && (
            <p role="alert" className="rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
              {saveError}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setForm(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              {editing ? 'Save changes' : `Create ${noun}`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
