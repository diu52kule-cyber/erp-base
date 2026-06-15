'use client';

import { useState } from 'react';
import { ATTENDANCE_STATUSES, ATTENDANCE_LABELS, ATTENDANCE_COLORS } from '@/lib/types/hr';
import type { Employee, AttendanceStatus } from '@/lib/types/hr';

type Row = { employee: Employee; status: AttendanceStatus };

export default function AttendanceSheet({
  employees,
  existing,
  date,
}: {
  employees: Employee[];
  existing: Record<string, AttendanceStatus>;
  date: string;
}) {
  const [rows, setRows] = useState<Row[]>(
    employees.map((emp) => ({ employee: emp, status: existing[emp.id] ?? 'present' }))
  );
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setStatus(empId: string, status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => r.employee.id === empId ? { ...r, status } : r));
    setSaved(false);
  }

  function markAll(status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => ({ ...r, status })));
    setSaved(false);
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows.map((r) => ({ employee_id: r.employee.id, date, status: r.status }))),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setSaved(true); }
    } catch {
      setError('Failed to save attendance');
    } finally {
      setPending(false);
    }
  }

  if (employees.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center text-neutral-500">
        No active employees to mark attendance for.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-neutral-500">Mark all:</span>
        {ATTENDANCE_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => markAll(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${ATTENDANCE_COLORS[s]}`}
          >
            {ATTENDANCE_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">Employee</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.employee.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.employee.name}</p>
                  {row.employee.designation && (
                    <p className="text-xs text-neutral-400">{row.employee.designation}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {ATTENDANCE_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(row.employee.id, s)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          row.status === s
                            ? ATTENDANCE_COLORS[s] + ' ring-2 ring-offset-1 ring-neutral-400'
                            : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                        }`}
                      >
                        {ATTENDANCE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-600">Saved!</span>}
        <button
          onClick={handleSave}
          disabled={pending}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save Attendance'}
        </button>
      </div>
    </div>
  );
}
