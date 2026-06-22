'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Employee = { id: string; name: string; designation: string | null; department: string | null };
type Shift = { id: string; employee_id: string; date: string; start_time: string; end_time: string; notes: string | null };

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDates(weekStart: string): string[] {
  const dates: string[] = [];
  const d = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function prevWeek(weekStart: string) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

function nextWeek(weekStart: string) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export default function ShiftsClient({ weekStart, weekEnd, employees, initialShifts }: {
  weekStart: string; weekEnd: string;
  employees: Employee[]; initialShifts: Shift[];
}) {
  const router                  = useRouter();
  const [shifts, setShifts]     = useState<Shift[]>(initialShifts);
  const [adding, setAdding]     = useState<{ empId: string; date: string } | null>(null);
  const [form, setForm]         = useState({ start_time: '09:00', end_time: '17:00', notes: '' });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const dates = getDates(weekStart);

  function getShift(empId: string, date: string) {
    return shifts.find((s) => s.employee_id === empId && s.date === date);
  }

  async function saveShift() {
    if (!adding) return;
    setSaving(true); setError(null);
    const res = await fetch('/api/hr/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: adding.empId, date: adding.date, start_time: form.start_time, end_time: form.end_time, notes: form.notes || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) { setError(data.error); return; }
    setShifts((prev) => {
      const filtered = prev.filter((s) => !(s.employee_id === adding.empId && s.date === adding.date));
      return [...filtered, data];
    });
    setAdding(null);
  }

  async function deleteShift(id: string) {
    await fetch('/api/hr/shifts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setShifts((prev) => prev.filter((s) => s.id !== id));
  }

  const totalHours = shifts.reduce((acc, s) => {
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    return acc + (eh * 60 + em - sh * 60 - sm) / 60;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Week nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/dashboard/hr/shifts?week_of=${prevWeek(weekStart)}`)}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">← Prev</button>
        <span className="text-sm font-medium">{weekStart} — {weekEnd}</span>
        <button onClick={() => router.push(`/dashboard/hr/shifts?week_of=${nextWeek(weekStart)}`)}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">Next →</button>
        <button onClick={() => router.push('/dashboard/hr/shifts')}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">This Week</button>
        <span className="ml-auto text-sm text-neutral-500">{shifts.length} shifts · {totalHours.toFixed(1)}h total</span>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center text-neutral-400">
          <p className="text-sm">No active employees found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 w-40">Employee</th>
                {dates.map((date, i) => (
                  <th key={date} className="px-2 py-3 text-center text-xs font-medium text-neutral-500 min-w-[110px]">
                    <div>{DAY_NAMES[i]}</div>
                    <div className="text-neutral-300">{date.slice(5)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <p className="font-medium text-xs">{emp.name}</p>
                    {emp.designation && <p className="text-[10px] text-neutral-400">{emp.designation}</p>}
                  </td>
                  {dates.map((date) => {
                    const shift = getShift(emp.id, date);
                    return (
                      <td key={date} className="px-2 py-2 text-center">
                        {shift ? (
                          <div className="rounded-md bg-blue-50 px-1.5 py-1 text-xs relative group">
                            <p className="font-medium text-blue-800">{shift.start_time.slice(0,5)}–{shift.end_time.slice(0,5)}</p>
                            {shift.notes && <p className="text-blue-500 text-[10px] truncate">{shift.notes}</p>}
                            <button
                              onClick={() => deleteShift(shift.id)}
                              className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px]"
                            >×</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAdding({ empId: emp.id, date }); setForm({ start_time: '09:00', end_time: '17:00', notes: '' }); setError(null); }}
                            className="text-neutral-200 hover:text-neutral-600 text-lg leading-none"
                          >+</button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add shift modal */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-80 rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="font-semibold">Add Shift</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {employees.find((e) => e.id === adding.empId)?.name} · {adding.date}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-neutral-500">Start</label>
                <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-neutral-500">End</label>
                <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Notes (optional)</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Morning shift"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setAdding(null)}
                className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm hover:bg-neutral-50">Cancel</button>
              <button onClick={saveShift} disabled={saving}
                className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Click <strong>+</strong> on any cell to schedule a shift. Hover a shift to delete it. Run migration 0045 to activate.
      </p>
    </div>
  );
}
