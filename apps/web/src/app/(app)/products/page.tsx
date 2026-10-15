'use client';

import { useMemo, useState } from 'react';
import { peso, type Category, type Product } from '@simmy/core';
import { Badge, EmptyState, Modal, PageHeader } from '@/components/ui';
import { CatalogModal, blankProduct } from '@/components/catalog-modal';
import { Pagination } from '@/components/pagination';
import { ProductThumb } from '@/components/product-thumb';
import { BarcodePrintModal } from '@/components/barcode';
import { usePager } from '@/lib/use-pager';
import { IconBarcode, IconPlus, IconSearch, IconTag, IconTrash } from '@/components/icons';
import { useStore } from '@/lib/store';

export default function ProductsPage() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const upsertProduct = useStore((s) => s.upsertProduct);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, 'id'> | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [printing, setPrinting] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products
      .filter((p) => p.kind !== 'service')
      .filter((p) => cat === 'all' || p.categoryId === cat)
      .filter(
        (p) => !needle || p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle),
      );
  }, [products, q, cat]);

  const pager = usePager(filtered, 10, [q, cat]);

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—';

  const openNew = () => {
    setEditing(null);
    setForm(blankProduct('product', categories[0]?.id ?? ''));
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    const { id: _id, ...rest } = p;
    setForm(rest);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Products"
        sub="Sellable goods & merchandise — services live under Services"
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setCatOpen(true)}>
              Categories
            </button>
            <button className="btn-primary" onClick={openNew}>
              <IconPlus width={15} height={15} /> New product
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-72">
          <IconSearch width={15} height={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input className="input !pl-9" placeholder="Search name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-stone-200 bg-paper/60">
            <tr>
              <th className="th">SKU</th>
              <th className="th">Name</th>
              <th className="th">Category</th>
              <th className="th">Pricing</th>
              <th className="th text-right">Price</th>
              <th className="th text-right">Stock</th>
              <th className="th">Status</th>
              <th className="th"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.map((p) => (
              <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-paper/50">
                <td className="td font-mono text-xs text-stone-500">{p.sku}</td>
                <td className="td">
                  <div className="flex items-center gap-3">
                    <ProductThumb src={p.imageUrl} alt={p.name} />
                    <div className="min-w-0">
                      <p className="font-medium">{p.name}</p>
                      {p.description && <p className="truncate text-xs text-stone-400">{p.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="td text-stone-500">{catName(p.categoryId)}</td>
                <td className="td">
                  {p.pricing === 'area' ? (
                    <Badge tone="brass">per {p.areaUnit}</Badge>
                  ) : (
                    <span className="text-stone-500">fixed</span>
                  )}
                </td>
                <td className="td text-right font-medium tabular-nums">{peso(p.price)}</td>
                <td className="td text-right tabular-nums text-stone-500">
                  {p.pricing === 'area' ? '—' : p.stockQty}
                </td>
                <td className="td">
                  <Badge tone={p.isActive ? 'pine' : 'stone'}>{p.isActive ? 'active' : 'archived'}</Badge>
                </td>
                <td className="td text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      className="btn-ghost !px-2 !py-1"
                      onClick={() => setPrinting(p)}
                      aria-label={`Print barcode for ${p.name}`}
                      title="Print barcode label"
                    >
                      <IconBarcode width={15} height={15} />
                    </button>
                    <button
                      className="btn-ghost !px-2 !py-1 text-xs"
                      onClick={() => upsertProduct({ ...p, isActive: !p.isActive })}
                    >
                      {p.isActive ? 'Archive' : 'Restore'}
                    </button>
                    <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState icon={<IconTag width={36} height={36} />} title="No products found" />
        )}
        <Pagination {...pager} onPage={pager.setPage} onPerPage={pager.setPerPage} />
      </div>

      <CatalogModal
        form={form}
        setForm={setForm}
        editing={editing}
        kind="product"
        onClose={() => setForm(null)}
      />
      <CategoryManager open={catOpen} onClose={() => setCatOpen(false)} />
      <BarcodePrintModal
        code={printing?.barcode ?? printing?.sku ?? ''}
        title={printing?.name ?? ''}
        sub={printing ? `SKU ${printing.sku} · ${peso(printing.price)}` : undefined}
        open={!!printing}
        onClose={() => setPrinting(null)}
      />
    </div>
  );
}

function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const upsertCategory = useStore((s) => s.upsertCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setError('A category with that name already exists.');
      return;
    }
    upsertCategory({
      id: `cat-${Date.now()}`,
      name,
      sortOrder: Math.max(0, ...categories.map((c) => c.sortOrder)) + 1,
    });
    setNewName('');
    setError(null);
  };

  const remove = (c: Category) => {
    if (!deleteCategory(c.id)) {
      setError(`"${c.name}" is used by products — reassign them first.`);
      return;
    }
    setError(null);
  };

  return (
    <Modal open={open} onClose={onClose} title="Categories">
      <form onSubmit={add} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="New category name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="btn-primary">Add</button>
      </form>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
          {error}
        </p>
      )}
      <ul className="mt-3 divide-y divide-stone-100">
        {[...categories]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c) => {
            const count = products.filter((p) => p.categoryId === c.id).length;
            return (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <input
                  className="input flex-1 !py-1.5"
                  value={c.name}
                  aria-label={`Rename ${c.name}`}
                  onChange={(e) => upsertCategory({ ...c, name: e.target.value })}
                />
                <span className="w-16 text-right text-xs text-stone-400">
                  {count} item{count === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  aria-label={`Delete ${c.name}`}
                  className="rounded p-1.5 text-stone-400 hover:bg-clay/10 hover:text-clay disabled:opacity-30"
                  disabled={count > 0}
                  onClick={() => remove(c)}
                >
                  <IconTrash width={14} height={14} />
                </button>
              </li>
            );
          })}
      </ul>
    </Modal>
  );
}
