'use client';
import { useState } from 'react';

type Claim = { id: string; date: string; amount: number; description: string; status: string; category?: { name: string } | null; notes?: string };
type Category = { id: string; name: string };

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-600', submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-600',
  reimbursed: 'bg-purple-50 text-purple-700',
};

const TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted'], submitted: ['approved', 'rejected'], approved: ['reimbursed'], rejected: [], reimbursed: [],
};

function fmt(n: number) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

export default function ExpensesClient({ claims: init, categories, myRole, orgId }: { claims: Claim[]; categories: Category[]; myRole: string; orgId: string }) {
  const [claims, setClaims] = useState<Claim[]>(init);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', description: '', category_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canApprove = ['owner', 'manager', 'accountant'].includes(myRole);

  async function submitClaim() {
    if (!form.amount || !form.description) { setError('Amount and description required'); return; }
    setSaving(true);
    const res  = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: form.date, amount: parseFloat(form.amount), description: form.description,
        category_id: form.category_id || null, status: 'submitted' }) });
    const data = await res.json();
    if (data.error) { setError(data.error); setSaving(false); }
    else { setClaims((c) => [data, ...c]); setShowNew(false); setForm((f) => ({ ...f, amount: '', description: '', category_id: '' })); setSaving(false); }
  }

  async function changeStatus(id: string, status: string) {
    const res = await fetch(`/api/expenses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (res.ok) setClaims((c) => c.map((cl) => cl.id === id ? { ...cl, status } : cl));
  }

  const totalPending = claims.filter((c) => c.status === 'submitted').reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[['Total', claims.length], ['Pending Approval', claims.filter((c) => c.status === 'submitted').length],
          ['Approved', claims.filter((c) => c.status === 'approved').length], ['Pending Amount', fmt(totalPending)]
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-400">{l}</p><p className="mt-1 text-xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowNew((s) => !s)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
          + New Claim
        </button>
      </div>

      {showNew && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-sm text-neutral-600">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></div>
            <div><label className="text-sm text-neutral-600">Amount (₹)</label>
              <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" placeholder="0.00" /></div>
            <div><label className="text-sm text-neutral-600">Category</label>
              <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
          </div>
          <div><label className="text-sm text-neutral-600">Description</label>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" placeholder="What was this expense for?" /></div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Cancel</button>
            <button onClick={submitClaim} disabled={saving} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
              {saving ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Description</th>
            <th className="px-4 py-3 text-left font-medium">Category</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            {canApprove && <th className="px-4 py-3 text-right font-medium">Actions</th>}
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {claims.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-400">No expense claims yet</td></tr>
            ) : claims.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 tabular-nums">{c.date}</td>
                <td className="px-4 py-3">{c.description}</td>
                <td className="px-4 py-3 text-neutral-500">{c.category?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(Number(c.amount))}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                </td>
                {canApprove && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {TRANSITIONS[c.status]?.map((next) => (
                        <button key={next} onClick={() => changeStatus(c.id, next)}
                          className={`rounded-lg px-2 py-1 text-xs font-medium ${next === 'rejected' ? 'text-red-600 hover:bg-red-50' : 'text-neutral-700 hover:bg-neutral-100'}`}>
                          {next.charAt(0).toUpperCase() + next.slice(1)}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
