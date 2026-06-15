'use client';

import { useState } from 'react';
import { BILLING_CYCLES, BILLING_CYCLE_LABELS } from '@/lib/types/subscriptions';

export default function PlanForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [features, setFeatures] = useState(['']);

  function addFeature() { setFeatures((f) => [...f, '']); }
  function setFeature(i: number, v: string) { setFeatures((f) => f.map((x, j) => j === i ? v : x)); }
  function removeFeature(i: number) { setFeatures((f) => f.filter((_, j) => j !== i)); }

  async function handleSubmit() {
    if (!name.trim()) { setError('Plan name is required'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/subscription-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, price, billing_cycle: cycle, features: features.filter(Boolean) }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { window.location.href = '/dashboard/subscriptions/plans'; }
    } catch { setError('Failed to save plan'); setPending(false); }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Plan Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Plan Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Starter, Pro, Enterprise"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Price (₹)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="1" placeholder="0"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Billing Cycle</label>
            <select value={cycle} onChange={(e) => setCycle(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
              {BILLING_CYCLES.map((c) => <option key={c} value={c}>{BILLING_CYCLE_LABELS[c]}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief description"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
        <h2 className="font-medium">Features</h2>
        {features.map((f, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" value={f} onChange={(e) => setFeature(i, e.target.value)} placeholder="e.g. Up to 5 users"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            <button onClick={() => removeFeature(i)} disabled={features.length === 1}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-400 hover:text-neutral-700 disabled:opacity-30">×</button>
          </div>
        ))}
        <button onClick={addFeature} className="text-sm text-neutral-500 hover:text-neutral-900">+ Add feature</button>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={pending}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Saving…' : 'Create Plan'}
        </button>
      </div>
    </div>
  );
}
