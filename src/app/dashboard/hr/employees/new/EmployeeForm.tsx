'use client';

import { useState } from 'react';
import { EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS } from '@/lib/types/hr';

const today = () => new Date().toISOString().split('T')[0];

export default function EmployeeForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    employment_type: 'full-time',
    joining_date: today(),
    monthly_salary: '',
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { window.location.href = `/dashboard/hr/employees/${data.id}`; }
    } catch {
      setError('Failed to save employee');
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Personal Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Full Name *</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="Employee full name"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Email</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              placeholder="employee@example.com"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Job Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Department</label>
            <input type="text" value={form.department} onChange={(e) => set('department', e.target.value)}
              placeholder="e.g. Engineering, Sales"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Designation</label>
            <input type="text" value={form.designation} onChange={(e) => set('designation', e.target.value)}
              placeholder="e.g. Software Engineer"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Employment Type</label>
            <select value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Joining Date</label>
            <input type="date" value={form.joining_date} onChange={(e) => set('joining_date', e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Monthly Salary (₹)</label>
            <input type="number" value={form.monthly_salary} onChange={(e) => set('monthly_salary', e.target.value)}
              min="0" step="100" placeholder="0"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={pending}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Saving…' : 'Add Employee'}
        </button>
      </div>
    </div>
  );
}
