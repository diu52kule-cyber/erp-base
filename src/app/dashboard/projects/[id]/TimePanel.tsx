'use client';
import { useState } from 'react';

type TimeEntry = { id: string; date: string; minutes: number; description?: string; billable: boolean; billed: boolean };
type Task = { id: string; title: string; status: string };

export default function TimePanel({ projectId, initialEntries, tasks }: { projectId: string; initialEntries: TimeEntry[]; tasks: Task[] }) {
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], hours: '', minutes: '0', description: '', task_id: '', billable: true });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function logTime() {
    const mins = (parseInt(form.hours || '0') * 60) + parseInt(form.minutes || '0');
    if (!mins) return;
    setSaving(true);
    const res  = await fetch(`/api/projects/${projectId}/time`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: form.date, minutes: mins, description: form.description || null, task_id: form.task_id || null, billable: form.billable }),
    });
    const data = await res.json();
    if (data.id) { setEntries((e) => [data, ...e]); setAdding(false); setForm((f) => ({ ...f, hours: '', minutes: '0', description: '', task_id: '' })); }
    setSaving(false);
  }

  const totalH = entries.reduce((s, e) => s + e.minutes, 0) / 60;
  const billH  = entries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0) / 60;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Time Log <span className="ml-2 text-sm font-normal text-neutral-400">{totalH.toFixed(1)}h total · {billH.toFixed(1)}h billable</span></h2>
        <button onClick={() => setAdding((a) => !a)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">
          + Log Time
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-neutral-500">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></div>
            <div><label className="text-xs text-neutral-500">Hours</label>
              <input type="number" min="0" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" placeholder="0" /></div>
            <div><label className="text-xs text-neutral-500">Minutes</label>
              <select value={form.minutes} onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                {['0','15','30','45'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-neutral-500">Task (optional)</label>
              <select value={form.task_id} onChange={(e) => setForm((f) => ({ ...f, task_id: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                <option value="">No specific task</option>
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select></div>
            <div><label className="text-xs text-neutral-500">Description</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" placeholder="What did you work on?" /></div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.billable} onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))} />
              Billable
            </label>
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">Cancel</button>
              <button onClick={logTime} disabled={saving} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
                {saving ? 'Saving…' : 'Log Time'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Description</th>
            <th className="px-4 py-3 text-right font-medium">Duration</th>
            <th className="px-4 py-3 text-center font-medium">Billable</th>
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {entries.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-400">No time logged yet</td></tr>
            ) : entries.map((e) => (
              <tr key={e.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 tabular-nums">{e.date}</td>
                <td className="px-4 py-3 text-neutral-600">{e.description ?? '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{Math.floor(e.minutes / 60)}h {e.minutes % 60}m</td>
                <td className="px-4 py-3 text-center">{e.billable ? <span className="text-green-600">✓</span> : <span className="text-neutral-300">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
