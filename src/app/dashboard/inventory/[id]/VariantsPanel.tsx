'use client';

import { useEffect, useState } from 'react';

type Variant = {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  stock_qty: number;
  attributes: Record<string, string>;
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

export default function VariantsPanel({ productId, parentPrice }: { productId: string; parentPrice: number }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', price: '', stock_qty: '0' });
  const [error, setError]       = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/products/${productId}/variants`);
      const data = await res.json();
      setVariants(Array.isArray(data) ? data : []);
    } catch { setVariants([]); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [productId]);

  async function handleAdd() {
    if (!form.name.trim()) { setError('Name required'); return; }
    setError(null);
    const res = await fetch(`/api/products/${productId}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        price: form.price ? parseFloat(form.price) : null,
        stock_qty: parseFloat(form.stock_qty) || 0,
      }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    setForm({ name: '', sku: '', price: '', stock_qty: '0' });
    setAdding(false);
    load();
  }

  async function handleDelete(variantId: string) {
    if (!confirm('Delete this variant?')) return;
    await fetch(`/api/products/${productId}/variants`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Variants</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          {adding ? 'Cancel' : '+ Add Variant'}
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Name *</label>
              <input placeholder="e.g. Red / Large" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">SKU</label>
              <input placeholder="Optional" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Price (blank = inherit)</label>
              <input type="number" min="0" step="0.01" placeholder={String(parentPrice)} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Opening Stock</label>
              <input type="number" min="0" step="0.001" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button onClick={handleAdd} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
            Add Variant
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : variants.length === 0 ? (
        <p className="text-sm text-neutral-400">No variants defined. Add variants to offer different sizes, colours, or flavours.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-xs text-neutral-500">
              <th className="pb-2 text-left font-medium">Name</th>
              <th className="pb-2 text-left font-medium">SKU</th>
              <th className="pb-2 text-right font-medium">Price</th>
              <th className="pb-2 text-right font-medium">Stock</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {variants.map((v) => (
              <tr key={v.id}>
                <td className="py-2 font-medium">{v.name}</td>
                <td className="py-2 font-mono text-xs text-neutral-500">{v.sku ?? '—'}</td>
                <td className="py-2 text-right">{v.price != null ? fmt(v.price) : <span className="text-xs text-neutral-400">inherit</span>}</td>
                <td className="py-2 text-right tabular-nums">{v.stock_qty}</td>
                <td className="py-2 text-right">
                  <button onClick={() => handleDelete(v.id)} className="text-xs text-neutral-400 hover:text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
