'use client';
import { useState } from 'react';

type Goal = { id: string; title: string; description: string | null; level: string; quarter: string | null; progress: number; status: string };
type KR = { id: string; goal_id: string; title: string; target: number; current: number; unit: string | null };

const LEVEL_COLORS: Record<string, string> = {
  company: 'bg-purple-50 text-purple-700', team: 'bg-blue-50 text-blue-700', individual: 'bg-neutral-100 text-neutral-600',
};
const STATUS = ['on_track', 'at_risk', 'off_track', 'done'];
const STATUS_COLORS: Record<string, string> = {
  on_track: 'bg-green-50 text-green-700', at_risk: 'bg-amber-50 text-amber-700',
  off_track: 'bg-red-50 text-red-700', done: 'bg-neutral-100 text-neutral-500',
};

export default function GoalsClient({ initialGoals, initialKRs }: { initialGoals: Goal[]; initialKRs: KR[] }) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [krs, setKRs] = useState<KR[]>(initialKRs);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', level: 'company', quarter: '' });

  async function addGoal() {
    if (!form.title.trim()) return;
    const res = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.id) {
      setGoals((g) => [{ id: data.id, title: form.title, description: null, level: form.level, quarter: form.quarter || null, progress: 0, status: 'on_track' }, ...g]);
      setForm({ title: '', level: 'company', quarter: '' }); setOpen(false);
    }
  }
  async function setStatus(id: string, status: string) {
    setGoals((g) => g.map((x) => x.id === id ? { ...x, status } : x));
    await fetch('/api/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
  }
  async function setProgress(id: string, progress: number) {
    setGoals((g) => g.map((x) => x.id === id ? { ...x, progress } : x));
    await fetch('/api/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, progress }) });
  }
  async function addKR(goal_id: string) {
    const title = prompt('Key result (e.g. Acquire 20 cafes)'); if (!title) return;
    const target = Number(prompt('Target number', '100') || '100');
    const res = await fetch('/api/key-results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal_id, title, target }) });
    const data = await res.json();
    if (data.id) setKRs((k) => [...k, { id: data.id, goal_id, title, target, current: 0, unit: null }]);
  }
  async function updateKR(id: string, current: number) {
    setKRs((k) => k.map((x) => x.id === id ? { ...x, current } : x));
    await fetch('/api/key-results', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, current }) });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Goals & OKRs</h1>
          <p className="text-neutral-500 mt-1 text-sm">Company → team → individual objectives with measurable key results.</p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">+ New objective</button>
      </div>

      {open && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 flex gap-2 flex-wrap">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Objective (e.g. Increase revenue 30%)" className="flex-1 min-w-[220px] rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
            <option value="company">Company</option><option value="team">Team</option><option value="individual">Individual</option>
          </select>
          <input value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })} placeholder="Q1 2026" className="w-28 rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <button onClick={addGoal} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">Add</button>
        </div>
      )}

      <div className="space-y-3">
        {goals.length === 0 ? <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-400">No goals yet.</div> :
          goals.map((g) => {
            const gKrs = krs.filter((k) => k.goal_id === g.id);
            return (
              <div key={g.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[g.level]}`}>{g.level}</span>
                  <h3 className="font-semibold">{g.title}</h3>
                  {g.quarter && <span className="text-xs text-neutral-400">{g.quarter}</span>}
                  <select value={g.status} onChange={(e) => setStatus(g.id, e.target.value)}
                    className={`ml-auto rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[g.status]}`}>
                    {STATUS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <input type="range" min={0} max={100} value={g.progress} onChange={(e) => setProgress(g.id, Number(e.target.value))} className="flex-1" />
                  <span className="w-10 text-right text-sm font-medium">{g.progress}%</span>
                </div>

                <div className="mt-3 space-y-1.5">
                  {gKrs.map((k) => (
                    <div key={k.id} className="flex items-center gap-2 text-sm">
                      <span className="text-neutral-400">◦</span>
                      <span className="flex-1">{k.title}</span>
                      <input type="number" value={k.current} onChange={(e) => updateKR(k.id, Number(e.target.value))} className="w-16 rounded border border-neutral-200 px-2 py-0.5 text-xs text-right" />
                      <span className="text-xs text-neutral-400">/ {k.target}{k.unit ? ` ${k.unit}` : ''}</span>
                    </div>
                  ))}
                  <button onClick={() => addKR(g.id)} className="text-xs text-neutral-500 hover:text-neutral-800">+ Add key result</button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
