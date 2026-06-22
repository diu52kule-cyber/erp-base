'use client';

import { useState } from 'react';

type Outlet  = { id: string; name: string };
type Product = { id: string; name: string; sku: string; stock_qty: number };
type Transfer = {
  id: string;
  from_outlet: { name: string };
  to_outlet: { name: string };
  product: { name: string; sku: string };
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
};

const STATUS_COLORS = {
  pending:   'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-neutral-100 text-neutral-500',
};

const EMPTY_FORM = { from_outlet_id: '', to_outlet_id: '', product_id: '', quantity: '', notes: '' };

export default function TransfersClient({
  outlets, products, initialTransfers,
}: { outlets: Outlet[]; products: Product[]; initialTransfers: Transfer[] }) {
  const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function create() {
    if (!form.from_outlet_id || !form.to_outlet_id || !form.product_id || !form.quantity) {
      setError('All fields required'); return;
    }
    if (Number(form.quantity) <= 0) { setError('Quantity must be positive'); return; }
    setSaving(true); setError(null);
    const res = await fetch('/api/outlets/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setSaving(false); return; }
    window.location.reload();
  }

  async function updateStatus(id: string, status: 'completed' | 'cancelled') {
    const res = await fetch(`/api/outlets/transfers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setTransfers((ts) => ts.map((t) => t.id === id ? { ...t, status } : t));
    }
  }

  const selectedProduct = products.find((p) => p.id === form.product_id);

  return (
    <div className="space-y-6">
      {/* Create transfer button */}
      <button
        onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setError(null); }}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
      >
        + New Transfer
      </button>

      {/* Transfers list */}
      {transfers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center">
          <p className="text-neutral-500">No transfers yet</p>
          <p className="mt-1 text-sm text-neutral-400">Create a stock transfer to move inventory between outlets</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">From</th>
                <th className="px-4 py-3 text-left font-medium">To</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.product?.name ?? '—'}</p>
                    <p className="text-xs text-neutral-400">{t.product?.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{t.from_outlet?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-neutral-600">{t.to_outlet?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{t.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status]}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => updateStatus(t.id, 'completed')}
                          className="rounded-lg bg-green-600 px-2.5 py-1 text-xs text-white hover:bg-green-700"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => updateStatus(t.id, 'cancelled')}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">New Stock Transfer</h2>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Product</label>
              <select
                value={form.product_id}
                onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.stock_qty}</option>
                ))}
              </select>
              {selectedProduct && (
                <p className="mt-1 text-xs text-neutral-400">Available stock: {selectedProduct.stock_qty}</p>
              )}
            </div>

            {[
              { label: 'From Outlet', key: 'from_outlet_id' },
              { label: 'To Outlet', key: 'to_outlet_id' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-neutral-500 mb-1">{label}</label>
                <select
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Select outlet…</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                min={1}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Notes (optional)</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm">
                Cancel
              </button>
              <button onClick={create} disabled={saving} className="flex-[2] rounded-xl bg-neutral-900 py-2.5 text-sm text-white disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
