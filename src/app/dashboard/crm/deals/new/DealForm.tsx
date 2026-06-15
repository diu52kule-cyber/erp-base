'use client';

import { useState } from 'react';
import { DEAL_STAGES, DEAL_STAGE_LABELS } from '@/lib/types/crm';
import type { Contact } from '@/lib/types/crm';

type Props = { contacts: Contact[]; preselectedContactId?: string };

export default function DealForm({ contacts, preselectedContactId }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    contact_id: preselectedContactId ?? '',
    value: '',
    stage: 'lead' as const,
    expected_close: '',
    notes: '',
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setError('Deal title is required'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, value: parseFloat(form.value) || 0 }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { window.location.href = `/dashboard/crm/deals/${data.id}`; }
    } catch {
      setError('Failed to save deal');
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Deal Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Deal Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Website redesign for Acme Corp"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Contact</label>
            <select
              value={form.contact_id}
              onChange={(e) => set('contact_id', e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="">— No contact —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` (${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Stage</label>
            <select
              value={form.stage}
              onChange={(e) => set('stage', e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              {DEAL_STAGES.map((s) => (
                <option key={s} value={s}>{DEAL_STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Value (₹)</label>
            <input
              type="number"
              value={form.value}
              onChange={(e) => set('value', e.target.value)}
              min="0"
              step="0.01"
              placeholder="0"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Expected Close Date</label>
            <input
              type="date"
              value={form.expected_close}
              onChange={(e) => set('expected_close', e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Deal notes, requirements, next steps…"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Create Deal'}
        </button>
      </div>
    </div>
  );
}
