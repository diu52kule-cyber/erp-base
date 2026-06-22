'use client';

import { useState } from 'react';

type Loan = {
  id: string;
  employee_id: string;
  amount: number;
  emi_amount: number;
  balance: number;
  disbursed_date: string;
  status: 'active' | 'closed';
  notes: string | null;
  employee?: { name: string; department?: string };
  repayments?: { id: string; amount: number; paid_date: string }[];
};

type Employee = { id: string; name: string; department?: string };

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function LoansClient({
  initialLoans,
  employees,
}: {
  initialLoans: Loan[];
  employees: Employee[];
}) {
  const [loans, setLoans] = useState(initialLoans);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: '',
    amount: '',
    emi_amount: '',
    disbursed_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.employee_id || !form.amount || !form.emi_amount) {
      setError('Employee, loan amount and EMI required'); return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/employee-loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount), emi_amount: Number(form.emi_amount) }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        const emp = employees.find((e) => e.id === form.employee_id);
        const newLoan: Loan = {
          id: data.id,
          employee_id: form.employee_id,
          amount: Number(form.amount),
          emi_amount: Number(form.emi_amount),
          balance: Number(form.amount),
          disbursed_date: form.disbursed_date,
          status: 'active',
          notes: form.notes || null,
          employee: emp,
          repayments: [],
        };
        setLoans((l) => [newLoan, ...l]);
        setShowForm(false);
        setForm({ employee_id: '', amount: '', emi_amount: '', disbursed_date: new Date().toISOString().split('T')[0], notes: '' });
      }
    } catch { setError('Failed to save'); }
    setPending(false);
  }

  const months = form.amount && form.emi_amount
    ? Math.ceil(Number(form.amount) / Number(form.emi_amount))
    : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          {showForm ? 'Cancel' : '+ Disburse Loan'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="font-medium">Disburse Loan / Advance</h2>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Employee *</label>
              <select value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
                <option value="">Select employee…</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Loan Amount (₹) *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Monthly EMI (₹) *</label>
              <input type="number" min="0" step="0.01" value={form.emi_amount} onChange={(e) => set('emi_amount', e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              {months && <p className="mt-1 text-xs text-neutral-400">{months} monthly deductions to close</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Disbursed Date</label>
              <input type="date" value={form.disbursed_date} onChange={(e) => set('disbursed_date', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Notes</label>
              <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSubmit} disabled={pending}
              className="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
              {pending ? 'Saving…' : 'Disburse'}
            </button>
          </div>
        </div>
      )}

      {loans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-neutral-500">
          No loans disbursed yet
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Employee</th>
                <th className="px-4 py-3 text-right font-medium">Loan</th>
                <th className="px-4 py-3 text-right font-medium">Monthly EMI</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
                <th className="px-4 py-3 text-left font-medium">Disbursed</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loans.map((l) => {
                const progress = l.amount > 0 ? ((l.amount - l.balance) / l.amount) * 100 : 0;
                return (
                  <>
                    <tr key={l.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{l.employee?.name ?? '—'}</p>
                        {l.employee?.department && <p className="text-xs text-neutral-400">{l.employee.department}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(l.amount)}</td>
                      <td className="px-4 py-3 text-right">{fmt(l.emi_amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <span className={l.balance > 0 ? 'text-amber-600 font-semibold' : 'text-green-600 font-semibold'}>
                            {fmt(l.balance)}
                          </span>
                          <div className="mt-1 h-1 w-full rounded-full bg-neutral-100">
                            <div className="h-1 rounded-full bg-green-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{l.disbursed_date}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${l.status === 'active' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                          className="text-xs text-neutral-400 hover:text-neutral-700">
                          {expanded === l.id ? '▲ Hide' : '▼ History'}
                        </button>
                      </td>
                    </tr>
                    {expanded === l.id && (
                      <tr key={`${l.id}-hist`}>
                        <td colSpan={7} className="px-4 pb-3 pt-0">
                          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-xs">
                            {(!l.repayments || l.repayments.length === 0) ? (
                              <p className="text-neutral-400">No repayments recorded yet. EMI of {fmt(l.emi_amount)} will be deducted each payroll run.</p>
                            ) : (
                              <table className="w-full">
                                <thead><tr className="text-neutral-400"><th className="text-left pb-1">Date</th><th className="text-right pb-1">Amount</th></tr></thead>
                                <tbody className="divide-y divide-neutral-100">
                                  {l.repayments.map((r: any) => (
                                    <tr key={r.id}><td className="py-1 text-neutral-600">{r.paid_date}</td><td className="py-1 text-right font-medium">{fmt(r.amount)}</td></tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
