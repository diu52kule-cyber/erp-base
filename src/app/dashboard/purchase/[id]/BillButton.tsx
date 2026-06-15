'use client';

import { useState } from 'react';

export default function BillButton({ poId }: { poId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  async function handleCreate() {
    setPending(true); setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_number: billNumber, bill_date: billDate, due_date: dueDate || null, notes }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { window.location.reload(); }
    } catch { setError('Failed to create bill'); setPending(false); }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Create Vendor Bill</h2>
        <button onClick={() => setOpen((o) => !o)}
          className="text-sm text-neutral-500 hover:text-neutral-900">
          {open ? 'Cancel' : 'Create Bill →'}
        </button>
      </div>

      {open && (
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Vendor Invoice No</label>
              <input type="text" value={billNumber} onChange={(e) => setBillNumber(e.target.value)}
                placeholder="From vendor's invoice"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Bill Date</label>
              <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Notes</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleCreate} disabled={pending}
              className="rounded-md bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
              {pending ? 'Saving…' : 'Create Vendor Bill'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
