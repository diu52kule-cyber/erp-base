'use client';

import { useState } from 'react';

type TdsEntry = {
  id: string; entry_date: string; party_name: string; section: string;
  gross_amount: number; tds_rate: number; tds_amount: number;
  type: 'payable' | 'receivable'; status: 'pending' | 'deposited';
  challan_no: string | null; deposited_date: string | null; notes: string | null;
};

const TDS_SECTIONS = ['194A','194C','194H','194I','194J','192','194B','194D','194EE','194G'];

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function TdsClient({ initialEntries, type }: { initialEntries: TdsEntry[]; type: 'payable' | 'receivable' }) {
  const [entries, setEntries]     = useState(initialEntries);
  const [showForm, setShowForm]   = useState(false);
  const [markId, setMarkId]       = useState<string | null>(null);
  const [challan, setChallan]     = useState('');
  const [depDate, setDepDate]     = useState(new Date().toISOString().split('T')[0]);
  const [pending, setPending]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    party_name: '', section: '194J',
    gross_amount: '', tds_rate: '10', tds_amount: '', notes: '',
  });

  function set(f: string, v: string) {
    setForm((p) => {
      const next = { ...p, [f]: v };
      if (f === 'gross_amount' || f === 'tds_rate') {
        const gross = parseFloat(f === 'gross_amount' ? v : p.gross_amount) || 0;
        const rate  = parseFloat(f === 'tds_rate'     ? v : p.tds_rate)     || 0;
        next.tds_amount = ((gross * rate) / 100).toFixed(2);
      }
      return next;
    });
  }

  async function handleAdd() {
    if (!form.party_name || !form.gross_amount) { setError('Party name and gross amount required'); return; }
    setError(null); setPending(true);
    try {
      const res = await fetch('/api/accounting/tds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type, gross_amount: Number(form.gross_amount), tds_amount: Number(form.tds_amount), tds_rate: Number(form.tds_rate) }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setEntries((e) => [{
          id: data.id, entry_date: form.entry_date, party_name: form.party_name,
          section: form.section, gross_amount: Number(form.gross_amount),
          tds_rate: Number(form.tds_rate), tds_amount: Number(form.tds_amount),
          type, status: 'pending', challan_no: null, deposited_date: null, notes: form.notes || null,
        }, ...e]);
        setShowForm(false);
        setForm({ entry_date: new Date().toISOString().split('T')[0], party_name: '', section: '194J', gross_amount: '', tds_rate: '10', tds_amount: '', notes: '' });
      }
    } catch { setError('Failed'); }
    setPending(false);
  }

  async function handleDeposit(id: string) {
    setPending(true);
    try {
      const res = await fetch('/api/accounting/tds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'deposited', challan_no: challan || null, deposited_date: depDate }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setEntries((e) => e.map((en) => en.id === id ? { ...en, status: 'deposited', challan_no: challan || null, deposited_date: depDate } : en));
        setMarkId(null); setChallan(''); setDepDate(new Date().toISOString().split('T')[0]);
      }
    } catch { setError('Failed'); }
    setPending(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
          {showForm ? 'Cancel' : `+ Record TDS ${type === 'payable' ? 'Payable' : 'Receivable'}`}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="font-medium">Record TDS {type === 'payable' ? 'Payable' : 'Receivable'}</h2>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Date</label>
              <input type="date" value={form.entry_date} onChange={(e) => set('entry_date', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Party Name *</label>
              <input type="text" value={form.party_name} onChange={(e) => set('party_name', e.target.value)} placeholder="Vendor / Client"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">TDS Section</label>
              <select value={form.section} onChange={(e) => set('section', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
                {TDS_SECTIONS.map((s) => <option key={s} value={s}>Sec {s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Gross Amount (₹) *</label>
              <input type="number" min="0" value={form.gross_amount} onChange={(e) => set('gross_amount', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">TDS Rate (%)</label>
              <input type="number" min="0" step="0.01" value={form.tds_rate} onChange={(e) => set('tds_rate', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">TDS Amount (₹)</label>
              <input type="number" min="0" value={form.tds_amount} onChange={(e) => set('tds_amount', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs text-neutral-500">Notes</label>
              <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleAdd} disabled={pending}
              className="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-neutral-500">
          No TDS {type} entries yet
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Party</th>
                <th className="px-4 py-3 text-left font-medium">Section</th>
                <th className="px-4 py-3 text-right font-medium">Gross</th>
                <th className="px-4 py-3 text-right font-medium">Rate</th>
                <th className="px-4 py-3 text-right font-medium">TDS Amount</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                {type === 'payable' && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {entries.map((e) => (
                <>
                  <tr key={e.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-500">{e.entry_date}</td>
                    <td className="px-4 py-3 font-medium">{e.party_name}</td>
                    <td className="px-4 py-3"><span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">{e.section}</span></td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(e.gross_amount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{e.tds_rate}%</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(e.tds_amount)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${e.status === 'deposited' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {e.status}
                        </span>
                        {e.challan_no && <p className="mt-0.5 text-xs text-neutral-400">Challan: {e.challan_no}</p>}
                      </div>
                    </td>
                    {type === 'payable' && (
                      <td className="px-4 py-3 text-right">
                        {e.status === 'pending' && (
                          <button onClick={() => setMarkId(markId === e.id ? null : e.id)}
                            className="text-xs text-blue-600 hover:underline">Mark deposited</button>
                        )}
                      </td>
                    )}
                  </tr>
                  {markId === e.id && (
                    <tr key={`${e.id}-mark`}>
                      <td colSpan={8} className="px-4 pb-3 pt-0">
                        <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                          <div>
                            <label className="block text-xs text-neutral-500 mb-1">Challan No.</label>
                            <input type="text" value={challan} onChange={(e) => setChallan(e.target.value)} placeholder="Optional"
                              className="rounded border border-neutral-200 px-2 py-1 text-xs focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-500 mb-1">Deposit Date</label>
                            <input type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)}
                              className="rounded border border-neutral-200 px-2 py-1 text-xs focus:outline-none" />
                          </div>
                          <button onClick={() => handleDeposit(e.id)} disabled={pending}
                            className="mt-4 rounded-lg bg-green-700 px-4 py-1.5 text-xs text-white hover:bg-green-800 disabled:opacity-50">
                            Confirm
                          </button>
                          <button onClick={() => setMarkId(null)} className="mt-4 text-xs text-neutral-500 hover:text-neutral-700">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
