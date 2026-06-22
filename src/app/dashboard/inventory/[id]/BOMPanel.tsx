'use client';

import { useEffect, useState } from 'react';

type BOMLine = {
  id: string;
  component_id: string;
  qty: number;
  unit: string | null;
  notes: string | null;
  component: {
    id: string;
    name: string;
    sku: string | null;
    stock_qty: number;
    cost_price: number;
  };
};

type Product = { id: string; name: string; sku: string | null };

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

export default function BOMPanel({ productId }: { productId: string }) {
  const [lines, setLines]     = useState<BOMLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ component_id: '', qty: '1', unit: '', notes: '' });
  const [error, setError]     = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/bom?product_id=${productId}`);
      const data = await res.json();
      setLines(Array.isArray(data) ? data : []);
    } catch { setLines([]); }
    setLoading(false);
  }

  async function loadProducts() {
    try {
      const res = await fetch('/api/products?limit=200');
      const data = await res.json();
      const list: Product[] = Array.isArray(data) ? data : (data.data ?? []);
      setProducts(list.filter((p) => p.id !== productId));
    } catch { setProducts([]); }
  }

  useEffect(() => { load(); }, [productId]);

  function openAdd() {
    if (products.length === 0) loadProducts();
    setAdding(true);
    setError(null);
  }

  async function handleAdd() {
    if (!form.component_id) { setError('Select a component'); return; }
    if (!form.qty || parseFloat(form.qty) <= 0) { setError('Qty must be > 0'); return; }
    setError(null);

    const res = await fetch('/api/inventory/bom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        component_id: form.component_id,
        qty: parseFloat(form.qty),
        unit: form.unit.trim() || null,
        notes: form.notes.trim() || null,
      }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    setForm({ component_id: '', qty: '1', unit: '', notes: '' });
    setAdding(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this ingredient from the recipe?')) return;
    await fetch('/api/inventory/bom', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const totalCost = lines.reduce((s, l) => s + l.qty * (l.component?.cost_price ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Bill of Materials / Recipe</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Ingredients or components needed to produce this product</p>
        </div>
        <button
          onClick={() => (adding ? setAdding(false) : openAdd())}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          {adding ? 'Cancel' : '+ Add Ingredient'}
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Component / Ingredient *</label>
              <select
                value={form.component_id}
                onChange={(e) => setForm({ ...form, component_id: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Qty *</label>
              <input
                type="number" min="0.001" step="0.001" value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Unit (optional)</label>
              <input
                placeholder="kg, ml, pcs…" value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Notes</label>
            <input
              placeholder="Optional notes" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button onClick={handleAdd} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
            Add to Recipe
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : lines.length === 0 ? (
        <p className="text-sm text-neutral-400">No ingredients defined. This product has no BOM yet.</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs text-neutral-500">
                <th className="pb-2 text-left font-medium">Component</th>
                <th className="pb-2 text-left font-medium">SKU</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-left font-medium">Unit</th>
                <th className="pb-2 text-right font-medium">Cost</th>
                <th className="pb-2 text-right font-medium">In Stock</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 font-medium">{l.component?.name ?? '—'}</td>
                  <td className="py-2 font-mono text-xs text-neutral-400">{l.component?.sku ?? '—'}</td>
                  <td className="py-2 text-right tabular-nums">{l.qty}</td>
                  <td className="py-2 text-neutral-500">{l.unit ?? '—'}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(l.qty * (l.component?.cost_price ?? 0))}</td>
                  <td className="py-2 text-right tabular-nums">
                    <span className={l.component?.stock_qty < l.qty ? 'text-red-500 font-medium' : 'text-green-600'}>
                      {l.component?.stock_qty ?? 0}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button onClick={() => handleDelete(l.id)} className="text-xs text-neutral-400 hover:text-red-600">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end text-sm">
            <span className="text-neutral-500">Total ingredient cost per unit:&nbsp;</span>
            <span className="font-semibold">{fmt(totalCost)}</span>
          </div>
        </>
      )}
    </div>
  );
}
