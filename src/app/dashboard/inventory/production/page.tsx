'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Order = {
  id: string;
  product_id: string;
  qty_to_produce: number;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  planned_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  product: { name: string; sku: string | null } | null;
};

type Product = { id: string; name: string; sku: string | null };

const STATUS_COLORS: Record<string, string> = {
  draft:       'bg-neutral-100 text-neutral-600',
  in_progress: 'bg-blue-50 text-blue-700',
  completed:   'bg-green-50 text-green-700',
  cancelled:   'bg-red-50 text-red-600',
};

export default function ProductionOrdersPage() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState({ product_id: '', qty_to_produce: '1', planned_date: '', notes: '' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/production');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch { setOrders([]); }
    setLoading(false);
  }

  async function loadProducts() {
    try {
      const res = await fetch('/api/products?limit=200');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : (data.data ?? []));
    } catch { setProducts([]); }
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    if (products.length === 0) loadProducts();
    setAdding(true);
    setError(null);
  }

  async function handleCreate() {
    if (!form.product_id) { setError('Select a product'); return; }
    if (!form.qty_to_produce || parseFloat(form.qty_to_produce) <= 0) { setError('Qty must be > 0'); return; }
    setSaving(true);
    setError(null);
    const res = await fetch('/api/inventory/production', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: form.product_id,
        qty_to_produce: parseFloat(form.qty_to_produce),
        planned_date: form.planned_date || null,
        notes: form.notes.trim() || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setError(data.error); return; }
    setForm({ product_id: '', qty_to_produce: '1', planned_date: '', notes: '' });
    setAdding(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    const label = status === 'completed' ? 'Complete this order? This will adjust inventory.' : `Mark as ${status}?`;
    if (!confirm(label)) return;
    await fetch('/api/inventory/production', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/inventory" className="text-sm text-neutral-500 hover:text-neutral-900">← Inventory</Link>
          <h1 className="mt-1 text-2xl font-semibold">Production Orders</h1>
        </div>
        <button
          onClick={openAdd}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          + New Order
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 space-y-4">
          <h2 className="font-medium text-sm">New Production Order</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Product to Produce *</label>
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Qty to Produce *</label>
              <input
                type="number" min="0.001" step="0.001" value={form.qty_to_produce}
                onChange={(e) => setForm({ ...form, qty_to_produce: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Planned Date</label>
              <input
                type="date" value={form.planned_date}
                onChange={(e) => setForm({ ...form, planned_date: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Notes</label>
              <input
                placeholder="Optional" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate} disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Order'}
            </button>
            <button onClick={() => setAdding(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400">No production orders yet.</p>
          <p className="text-sm text-neutral-300 mt-1">Create an order to produce a finished good from raw materials.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr className="text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-left font-medium">Planned</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium">
                    {o.product?.name ?? '—'}
                    {o.product?.sku && <span className="ml-1 text-xs text-neutral-400 font-mono">{o.product.sku}</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.qty_to_produce}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {o.planned_date ? new Date(o.planned_date).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? ''}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400 max-w-xs truncate">{o.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {o.status === 'draft' && (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => updateStatus(o.id, 'in_progress')}
                          className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => updateStatus(o.id, 'cancelled')}
                          className="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:text-red-600"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {o.status === 'in_progress' && (
                      <button
                        onClick={() => updateStatus(o.id, 'completed')}
                        className="rounded border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
                      >
                        Complete
                      </button>
                    )}
                    {(o.status === 'completed' || o.status === 'cancelled') && (
                      <span className="text-xs text-neutral-300">
                        {o.completed_at ? new Date(o.completed_at).toLocaleDateString('en-IN') : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
