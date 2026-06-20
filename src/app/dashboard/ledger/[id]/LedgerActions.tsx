'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

export default function LedgerActions({ contactId, creditLimit }: { contactId: string; creditLimit: number | null }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(creditLimit != null ? String(creditLimit) : '');

  async function add(type: 'credit' | 'payment') {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast('Enter an amount', 'error'); return; }
    setBusy(true);
    const res = await fetch('/api/ledger', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId, type, amount: amt, note, entry_date: date }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { toast(data.error ?? 'Failed', 'error'); return; }
    toast(type === 'credit' ? 'Credit recorded' : 'Payment recorded');
    setTimeout(() => window.location.reload(), 500);
  }

  async function saveLimit() {
    await fetch('/api/ledger', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId, credit_limit: limit === '' ? null : Number(limit) }),
    });
    toast('Credit limit saved');
    setTimeout(() => window.location.reload(), 400);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
      <h2 className="font-semibold text-sm">Record entry</h2>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount ₹"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => add('credit')} disabled={busy}
          className="rounded-lg border border-amber-200 bg-amber-50 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50">
          + Credit given
        </button>
        <button onClick={() => add('payment')} disabled={busy}
          className="rounded-lg border border-green-200 bg-green-50 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50">
          − Payment received
        </button>
      </div>
      <div className="border-t border-neutral-100 pt-3">
        <label className="text-xs text-neutral-500">Credit limit</label>
        <div className="mt-1 flex gap-2">
          <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="No limit"
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <button onClick={saveLimit} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">Save</button>
        </div>
      </div>
    </div>
  );
}
