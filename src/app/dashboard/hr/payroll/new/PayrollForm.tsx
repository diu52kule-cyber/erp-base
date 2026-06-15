'use client';

import { useState } from 'react';

export default function PayrollForm({ employeeCount }: { employeeCount: number }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);
  const [workingDays, setWorkingDays] = useState('26');

  async function handleRun() {
    if (!month) { setError('Select a month'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, working_days: parseInt(workingDays) || 26 }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { window.location.href = `/dashboard/hr/payroll/${data.id}`; }
    } catch {
      setError('Failed to run payroll');
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Payroll Settings</h2>
        <p className="text-sm text-neutral-500">
          This will generate payroll for <span className="font-medium text-neutral-800">{employeeCount} active employee{employeeCount !== 1 ? 's' : ''}</span> based on their attendance records for the selected month.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Month *</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Working Days in Month</label>
            <input type="number" value={workingDays} onChange={(e) => setWorkingDays(e.target.value)}
              min="1" max="31"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            <p className="mt-1 text-xs text-neutral-400">Used to pro-rate salary based on attendance</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Employees with no attendance records this month will receive their full salary ({workingDays} / {workingDays} days).
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={handleRun} disabled={pending || employeeCount === 0}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Generating…' : 'Generate Payroll'}
        </button>
      </div>
    </div>
  );
}
