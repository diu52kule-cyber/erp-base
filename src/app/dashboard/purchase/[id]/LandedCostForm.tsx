'use client';

import { useState } from 'react';

const COST_TYPES = ['freight', 'duty', 'customs', 'insurance', 'other'] as const;
type CostType = typeof COST_TYPES[number];

export default function LandedCostForm({ poId, grnId }: { poId: string; grnId?: string }) {
  const [open, setOpen] = useState(false);
  const [costType, setCostType] = useState<CostType>('freight');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ type: string; amount: number }[]>([]);

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/landed-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ po_id: poId, grn_id: grnId || null, cost_type: costType, amount: Number(amount), notes }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setSaved((s) => [...s, { type: costType, amount: Number(amount) }]);
        setAmount('');
        setNotes('');
      }
    } catch {
      setError('Failed to save');
    }
    setPending(false);
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
      >
        + Add Landed Cost
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Landed Costs (Freight / Duty)</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-neutral-400 hover:text-neutral-700">Close</button>
      </div>

      {saved.length > 0 && (
        <div className="space-y-1">
          {saved.map((s, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="capitalize text-neutral-600">{s.type}</span>
              <span className="font-medium">{fmt(s.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Type</label>
          <select value={costType} onChange={(e) => setCostType(e.target.value as CostType)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 capitalize">
            {COST_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Amount (₹)</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Notes</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={pending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Saving…' : 'Add Cost'}
        </button>
      </div>
    </div>
  );
}
