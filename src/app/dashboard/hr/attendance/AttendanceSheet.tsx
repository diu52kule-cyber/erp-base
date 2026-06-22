'use client';

import { useState } from 'react';
import { ATTENDANCE_STATUSES, ATTENDANCE_LABELS, ATTENDANCE_COLORS } from '@/lib/types/hr';
import type { Employee, AttendanceStatus } from '@/lib/types/hr';

type Row = {
  employee: Employee;
  status: AttendanceStatus;
  check_in: string;
  check_out: string;
  overtime_hours: string;
};

const STANDARD_HOURS = 8;

function calcOvertime(checkIn: string, checkOut: string): string {
  if (!checkIn || !checkOut) return '0';
  const [ih, im] = checkIn.split(':').map(Number);
  const [oh, om] = checkOut.split(':').map(Number);
  const worked = (oh * 60 + om) - (ih * 60 + im);
  if (worked <= 0) return '0';
  const ot = (worked / 60) - STANDARD_HOURS;
  return ot > 0 ? ot.toFixed(2) : '0';
}

export default function AttendanceSheet({
  employees,
  existing,
  date,
  showPunchTimes = false,
}: {
  employees: Employee[];
  existing: Record<string, AttendanceStatus>;
  date: string;
  showPunchTimes?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(
    employees.map((emp) => ({
      employee: emp,
      status: existing[emp.id] ?? 'present',
      check_in: '',
      check_out: '',
      overtime_hours: '0',
    }))
  );
  const [punchMode, setPunchMode] = useState(showPunchTimes);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setStatus(empId: string, status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => r.employee.id === empId ? { ...r, status } : r));
    setSaved(false);
  }

  function setTime(empId: string, field: 'check_in' | 'check_out', value: string) {
    setRows((prev) => prev.map((r) => {
      if (r.employee.id !== empId) return r;
      const updated = { ...r, [field]: value };
      updated.overtime_hours = calcOvertime(
        field === 'check_in' ? value : updated.check_in,
        field === 'check_out' ? value : updated.check_out
      );
      return updated;
    }));
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
      const payload = rows.map((r) => ({
        employee_id: r.employee.id,
        date,
        status: r.status,
        check_in: punchMode && r.check_in ? `${date}T${r.check_in}:00` : null,
        check_out: punchMode && r.check_out ? `${date}T${r.check_out}:00` : null,
        overtime_hours: punchMode ? parseFloat(r.overtime_hours || '0') : 0,
      }));
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const totalOvertime = rows.reduce((s, r) => s + parseFloat(r.overtime_hours || '0'), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <button
          onClick={() => setPunchMode((p) => !p)}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${punchMode ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-neutral-200 hover:bg-neutral-50'}`}
        >
          {punchMode ? '⏱ Punch times ON' : '⏱ Add punch times'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">Employee</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              {punchMode && <>
                <th className="px-4 py-3 text-center font-medium">Check In</th>
                <th className="px-4 py-3 text-center font-medium">Check Out</th>
                <th className="px-4 py-3 text-center font-medium">Overtime (h)</th>
              </>}
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
                  <div className="flex flex-wrap gap-1.5">
                    {ATTENDANCE_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(row.employee.id, s)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
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
                {punchMode && <>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="time"
                      value={row.check_in}
                      onChange={(e) => setTime(row.employee.id, 'check_in', e.target.value)}
                      disabled={row.status !== 'present' && row.status !== 'half-day'}
                      className="rounded border border-neutral-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="time"
                      value={row.check_out}
                      onChange={(e) => setTime(row.employee.id, 'check_out', e.target.value)}
                      disabled={row.status !== 'present' && row.status !== 'half-day'}
                      className="rounded border border-neutral-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={parseFloat(row.overtime_hours) > 0 ? 'font-semibold text-amber-600' : 'text-neutral-400'}>
                      {parseFloat(row.overtime_hours) > 0 ? `+${row.overtime_hours}h` : '—'}
                    </span>
                  </td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
        {punchMode && totalOvertime > 0 && (
          <div className="border-t border-neutral-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            Total overtime today: <strong>{totalOvertime.toFixed(2)} hours</strong> across {rows.filter((r) => parseFloat(r.overtime_hours) > 0).length} employees
          </div>
        )}
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
