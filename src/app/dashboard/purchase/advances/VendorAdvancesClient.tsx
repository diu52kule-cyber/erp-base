'use client';

import { useState } from 'react';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', card: 'Card', bank_transfer: 'Bank Transfer', cheque: 'Cheque',
};
const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-blue-50 text-blue-700',
  adjusted: 'bg-green-50 text-green-700',
  refunded: 'bg-neutral-100 text-neutral-600',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

type Advance = {
  id: string;
  vendor_name: string;
  amount: number;
  method: string;
  reference_number: string | null;
  advance_date: string;
  notes: string | null;
  status: string;
};

type Vendor = { id: string; name: string };

export default function VendorAdvancesClient({
  advances: initial,
  vendors,
}: {
  advances: Advance[];
  vendors: Vendor[];
}) {
  const [advances, setAdvances] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vendor_name: '',
    vendor_id: '',
    amount: '',
    method: 'bank_transfer',
    reference_number: '',
    advance_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.vendor_name.trim() || !form.amount) { setError('Vendor name and amount required'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/vendor-advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          vendor_id: form.vendor_id || null,
          reference_number: form.reference_number || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        const newAdv: Advance = {
          id: data.id,
          vendor_name: form.vendor_name,
          amount: Number(form.amount),
          method: form.method,
          reference_number: form.reference_number || null,
          advance_date: form.advance_date,
          notes: form.notes || null,
          status: 'paid',
        };
        setAdvances((a) => [newAdv, ...a]);
        setShowForm(false);
        setForm({ vendor_name: '', vendor_id: '', amount: '', method: 'bank_transfer', reference_number: '', advance_date: new Date().toISOString().split('T')[0], notes: '' });
      }
    } catch {
      setError('Failed to save advance');
    }
    setPending(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          {showForm ? 'Cancel' : '+ Record Advance'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="font-medium">Record Vendor Advance</h2>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Vendor Name *</label>
              <input
                list="vendor-list"
                value={form.vendor_name}
                onChange={(e) => {
                  const v = vendors.find((vd) => vd.name === e.target.value);
                  set('vendor_name', e.target.value);
                  if (v) set('vendor_id', v.id);
                }}
                placeholder="Type or select vendor"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <datalist id="vendor-list">
                {vendors.map((v) => <option key={v.id} value={v.name} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Amount (₹) *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Payment Method</label>
              <select value={form.method} onChange={(e) => set('method', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
                {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Date</label>
              <input type="date" value={form.advance_date} onChange={(e) => set('advance_date', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Reference / UTR</label>
              <input type="text" value={form.reference_number} onChange={(e) => set('reference_number', e.target.value)}
                placeholder="UTR / cheque no"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Notes</label>
              <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSubmit} disabled={pending}
              className="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
              {pending ? 'Saving…' : 'Record Advance'}
            </button>
          </div>
        </div>
      )}

      {advances.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-neutral-500">No vendor advances recorded yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Vendor</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {advances.map((a) => (
                <tr key={a.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-500">{a.advance_date}</td>
                  <td className="px-4 py-3 font-medium">{a.vendor_name}</td>
                  <td className="px-4 py-3 text-neutral-500">{METHOD_LABELS[a.method] ?? a.method}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-400">{a.reference_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[a.status] ?? ''}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(Number(a.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
