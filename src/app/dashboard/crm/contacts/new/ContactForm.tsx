'use client';

import { useState } from 'react';
import { CONTACT_TYPES, CONTACT_TYPE_LABELS } from '@/lib/types/crm';
import { useFormDraft } from '@/lib/useFormDraft';

export default function ContactForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'lead' as const,
    company: '',
    gstin: '',
    address: '',
    notes: '',
  });
  const { clearDraft, draftRestored } = useFormDraft('contact-new', form, setForm);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { clearDraft(); window.location.href = `/dashboard/crm/contacts/${data.id}`; }
    } catch {
      setError('Failed to save contact');
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {draftRestored && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <span>Restored your unsaved draft.</span>
          <button type="button" onClick={() => { clearDraft(); window.location.reload(); }} className="font-medium underline-offset-2 hover:underline">Discard</button>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Contact Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Type</label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              {CONTACT_TYPES.map((t) => (
                <option key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Company</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
              placeholder="Company or business name"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="contact@example.com"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">GSTIN</label>
            <input
              type="text"
              value={form.gstin}
              onChange={(e) => set('gstin', e.target.value.toUpperCase())}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Street, City, State, PIN"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Any additional notes"
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
          {pending ? 'Saving…' : 'Add Contact'}
        </button>
      </div>
    </div>
  );
}
