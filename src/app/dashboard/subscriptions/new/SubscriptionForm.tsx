'use client';

import { useState } from 'react';
import { SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUS_LABELS } from '@/lib/types/subscriptions';
import type { SubscriptionPlan } from '@/lib/types/subscriptions';

interface Props { plans: SubscriptionPlan[]; }

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function SubscriptionForm({ plans }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planId, setPlanId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [status, setStatus] = useState('active');
  const [startsAt, setStartsAt] = useState(new Date().toISOString().split('T')[0]);

  async function handleSubmit() {
    if (!planId) { setError('Please select a plan'); return; }
    if (!customerName.trim()) { setError('Customer name is required'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, customer_name: customerName, customer_email: customerEmail, status, starts_at: startsAt }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { window.location.href = '/dashboard/subscriptions'; }
    } catch { setError('Failed to create subscription'); setPending(false); }
  }

  const selectedPlan = plans.find((p) => p.id === planId);

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Plan</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-neutral-500">No plans available. <a href="/dashboard/subscriptions/plans/new" className="underline">Create a plan first.</a></p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <button key={p.id} type="button" onClick={() => setPlanId(p.id)}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${planId === p.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                <p className="font-medium">{p.name}</p>
                <p className="mt-1 text-lg font-bold">{fmt(p.price)}</p>
                <p className="text-xs text-neutral-400">per {p.billing_cycle}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Customer</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Customer Name *</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Email</label>
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
              {SUBSCRIPTION_STATUSES.map((s) => <option key={s} value={s}>{SUBSCRIPTION_STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Start Date</label>
            <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
        </div>
      </div>

      {selectedPlan && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <p>Plan: <strong>{selectedPlan.name}</strong> at <strong>{fmt(selectedPlan.price)}</strong> / {selectedPlan.billing_cycle}</p>
          <p className="mt-1 text-neutral-500">Next billing date will be calculated automatically.</p>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={pending || plans.length === 0}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Saving…' : 'Create Subscription'}
        </button>
      </div>
    </div>
  );
}
