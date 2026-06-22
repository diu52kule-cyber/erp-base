'use client';

import { useState } from 'react';

type LeaveType = { id: string; name: string; color: string; paid: boolean; days_per_year: number };
type Employee = { id: string; name: string; department?: string };
type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  employee?: { name: string; department?: string };
  leave_type?: { name: string; color: string; paid: boolean };
};

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

function countWorkdays(start: string, end: string): number {
  let count = 0;
  const d = new Date(start);
  const e = new Date(end);
  while (d <= e) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export default function LeavesClient({
  initialLeaves,
  leaveTypes,
  employees,
}: {
  initialLeaves: LeaveRequest[];
  leaveTypes: LeaveType[];
  employees: Employee[];
}) {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    notes: '',
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.employee_id || !form.leave_type_id || !form.start_date || !form.end_date) {
      setError('All fields required'); return;
    }
    const days = countWorkdays(form.start_date, form.end_date);
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, days }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); return; }
      const emp = employees.find((e) => e.id === form.employee_id);
      const lt = leaveTypes.find((t) => t.id === form.leave_type_id);
      const newLeave: LeaveRequest = {
        id: data.id,
        ...form,
        days,
        status: 'pending',
        created_at: new Date().toISOString(),
        employee: emp ? { name: emp.name, department: emp.department } : undefined,
        leave_type: lt ? { name: lt.name, color: lt.color, paid: lt.paid } : undefined,
      };
      setLeaves((l) => [newLeave, ...l]);
      setShowForm(false);
      setForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', notes: '' });
    } catch {
      setError('Failed to submit');
    }
    setPending(false);
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    const res = await fetch(`/api/leaves/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!data.error) {
      setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          {showForm ? 'Cancel' : '+ Apply Leave'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="font-medium">Apply for Leave</h2>
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
              <label className="mb-1 block text-xs text-neutral-500">Leave Type *</label>
              <select value={form.leave_type_id} onChange={(e) => set('leave_type_id', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
                <option value="">Select type…</option>
                {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name} {!t.paid ? '(Unpaid)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">From *</label>
              <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">To *</label>
              <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)}
                min={form.start_date}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            {form.start_date && form.end_date && (
              <div className="sm:col-span-2">
                <p className="text-xs text-neutral-500">
                  Working days: <strong>{countWorkdays(form.start_date, form.end_date)}</strong>
                </p>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Reason</label>
              <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)}
                placeholder="Optional reason / notes"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSubmit} disabled={pending}
              className="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
              {pending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}

      {leaves.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-neutral-500">
          No leave requests yet
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Employee</th>
                <th className="px-4 py-3 text-left font-medium">Leave Type</th>
                <th className="px-4 py-3 text-left font-medium">Dates</th>
                <th className="px-4 py-3 text-center font-medium">Days</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{l.employee?.name ?? '—'}</p>
                    {l.employee?.department && <p className="text-xs text-neutral-400">{l.employee.department}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {l.leave_type ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${l.leave_type.color}`}>
                        {l.leave_type.name}
                        {!l.leave_type.paid && ' (Unpaid)'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">
                    {l.start_date === l.end_date ? l.start_date : `${l.start_date} → ${l.end_date}`}
                    {l.notes && <p className="text-neutral-400 mt-0.5 truncate max-w-40">{l.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{l.days}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[l.status]}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {l.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateStatus(l.id, 'approved')}
                          className="rounded-md bg-green-600 px-2.5 py-1 text-xs text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(l.id, 'rejected')}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
