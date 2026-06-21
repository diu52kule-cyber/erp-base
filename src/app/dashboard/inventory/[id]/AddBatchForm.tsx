'use client';

import { useState } from 'react';

export default function AddBatchForm({ productId, unit }: { productId: string; unit: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ batch_no: '', expiry_date: '', qty: '', cost_price: '', notes: '' });

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit() {
    if (!form.batch_no.trim()) { setError('Batch number is required'); return; }
    if (!form.qty || parseFloat(form.qty) <= 0) { setError('Quantity must be positive'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/products/${productId}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_no: form.batch_no,
          expiry_date: form.expiry_date || undefined,
          qty: parseFloat(form.qty),
          cost_price: form.cost_price ? parseFloat(form.cost_price) : undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); return; }
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add batch');
      setPending(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:bg-neutral-900 dark:border-neutral-700';

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-neutral-500 underline hover:text-neutral-900">
        + Add batch / lot
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
      <h3 className="text-sm font-medium">Add Batch</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Batch / Lot No. *</label>
          <input type="text" value={form.batch_no} onChange={(e) => set('batch_no', e.target.value)} placeholder="e.g. LOT-2024-01" className={`${inputCls} font-mono`} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Expiry Date</label>
          <input type="date" value={form.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Qty ({unit}) *</label>
          <input type="number" value={form.qty} onChange={(e) => set('qty', e.target.value)} min="0" step="0.001" placeholder="0" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Cost Price (₹)</label>
          <input type="number" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} min="0" step="0.01" placeholder="0.00" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-neutral-500">Notes</label>
          <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Supplier, PO reference…" className={inputCls} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleSubmit} disabled={pending} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Adding…' : 'Add Batch'}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-neutral-500 hover:text-neutral-900">Cancel</button>
      </div>
    </div>
  );
}
