'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

type Goal = {
  id: string; title: string; description: string | null;
  level: string; quarter: string | null; progress: number; status: string;
  parent_id: string | null;
};
type KR = { id: string; goal_id: string; title: string; target: number; current: number; unit: string | null; confidence: string };

const LEVEL_COLORS: Record<string, string> = {
  company: 'bg-purple-100 text-purple-700', team: 'bg-blue-100 text-blue-700', individual: 'bg-neutral-100 text-neutral-600',
};
const LEVEL_ICONS: Record<string, string> = { company: '🏢', team: '👥', individual: '👤' };
const STATUS_COLORS: Record<string, string> = {
  on_track: 'bg-green-50 text-green-700', at_risk: 'bg-amber-50 text-amber-700',
  off_track: 'bg-red-50 text-red-700', done: 'bg-neutral-100 text-neutral-500',
};
const CONF_COLORS: Record<string, string> = {
  on_track: 'bg-green-50 text-green-700 border-green-200',
  at_risk: 'bg-amber-50 text-amber-700 border-amber-200',
  off_track: 'bg-red-50 text-red-700 border-red-200',
};
const CONF_DOT: Record<string, string> = { on_track: 'bg-green-500', at_risk: 'bg-amber-500', off_track: 'bg-red-500' };

export default function GoalsClient({ initialGoals, initialKRs }: { initialGoals: Goal[]; initialKRs: KR[] }) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [krs, setKRs] = useState<KR[]>(initialKRs);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', level: 'company', quarter: '', parent_id: '' });
  const [view, setView] = useState<'flat' | 'tree'>('tree');
  const [filterLevel, setFilterLevel] = useState('all');

  async function addGoal() {
    if (!form.title.trim()) return;
    const res = await fetch('/api/goals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, parent_id: form.parent_id || null }),
    });
    const data = await res.json();
    if (data.id) {
      setGoals(g => [{ id: data.id, title: form.title, description: null, level: form.level, quarter: form.quarter || null, progress: 0, status: 'on_track', parent_id: form.parent_id || null }, ...g]);
      setForm({ title: '', level: 'company', quarter: '', parent_id: '' }); setOpen(false);
      toast('Objective created');
    }
  }

  async function setStatus(id: string, status: string) {
    setGoals(g => g.map(x => x.id === id ? { ...x, status } : x));
    await fetch('/api/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
  }

  async function setProgress(id: string, progress: number) {
    setGoals(g => g.map(x => x.id === id ? { ...x, progress } : x));
    await fetch('/api/goals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, progress }) });
  }

  async function addKR(goal_id: string) {
    const title = prompt('Key result title (e.g. Acquire 20 customers):');
    if (!title) return;
    const targetStr = prompt('Target number:', '100');
    const target = Number(targetStr) || 100;
    const res = await fetch('/api/key-results', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_id, title, target }),
    });
    const data = await res.json();
    if (data.id) { setKRs(k => [...k, { id: data.id, goal_id, title, target, current: 0, unit: null, confidence: 'on_track' }]); toast('Key result added'); }
    else toast(data.error ?? 'Error', 'error');
  }

  async function updateKR(id: string, field: 'current' | 'confidence', value: number | string) {
    setKRs(k => k.map(x => x.id === id ? { ...x, [field]: value } : x));
    await fetch('/api/key-results', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: value }),
    });
  }

  async function deleteGoal(id: string) {
    if (!confirm('Delete this objective and all its key results?')) return;
    setGoals(g => g.filter(x => x.id !== id));
    setKRs(k => k.filter(x => x.goal_id !== id));
    await fetch('/api/goals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
  }

  const filtered = filterLevel === 'all' ? goals : goals.filter(g => g.level === filterLevel);

  // Tree: company → team → individual
  function renderGoal(g: Goal, depth = 0) {
    const gKrs = krs.filter(k => k.goal_id === g.id);
    const children = goals.filter(x => x.parent_id === g.id);
    const krPct = gKrs.length === 0 ? g.progress : Math.round(gKrs.reduce((sum, k) => sum + (k.target > 0 ? (k.current / k.target) * 100 : 0), 0) / gKrs.length);
    const atRiskKRs = gKrs.filter(k => k.confidence === 'at_risk').length;
    const offTrackKRs = gKrs.filter(k => k.confidence === 'off_track').length;

    return (
      <div key={g.id} style={{ marginLeft: depth * 24 }}>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 mb-2">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-base">{LEVEL_ICONS[g.level]}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[g.level]}`}>{g.level}</span>
            <h3 className="font-semibold flex-1">{g.title}</h3>
            {g.quarter && <span className="text-xs text-neutral-400 font-mono">{g.quarter}</span>}
            <select value={g.status} onChange={e => setStatus(g.id, e.target.value)}
              className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[g.status]}`}>
              {['on_track', 'at_risk', 'off_track', 'done'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button onClick={() => deleteGoal(g.id)} className="text-neutral-300 hover:text-red-400 text-sm">✕</button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 overflow-hidden rounded-full bg-neutral-100 h-2">
              <div className={`h-2 rounded-full transition-all ${g.status === 'done' ? 'bg-green-500' : g.status === 'off_track' ? 'bg-red-400' : g.status === 'at_risk' ? 'bg-amber-400' : 'bg-neutral-800'}`}
                style={{ width: `${krPct}%` }} />
            </div>
            <span className="w-10 text-right text-sm font-semibold">{krPct}%</span>
            {gKrs.length > 0 && (offTrackKRs > 0 || atRiskKRs > 0) && (
              <span className={`text-xs rounded-full px-2 py-0.5 ${offTrackKRs > 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                {offTrackKRs > 0 ? `${offTrackKRs} off track` : `${atRiskKRs} at risk`}
              </span>
            )}
          </div>

          {/* Key Results */}
          {gKrs.length > 0 && (
            <div className="mt-3 space-y-2">
              {gKrs.map(k => {
                const pct = k.target > 0 ? Math.round((k.current / k.target) * 100) : 0;
                return (
                  <div key={k.id} className="rounded-lg bg-neutral-50 px-3 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-neutral-400 text-xs">◦</span>
                      <span className="flex-1 text-sm">{k.title}</span>
                      <select value={k.confidence} onChange={e => updateKR(k.id, 'confidence', e.target.value)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${CONF_COLORS[k.confidence]}`}>
                        <option value="on_track">On track</option>
                        <option value="at_risk">At risk</option>
                        <option value="off_track">Off track</option>
                      </select>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 overflow-hidden rounded-full bg-neutral-200 h-1">
                        <div className={`h-1 rounded-full ${CONF_DOT[k.confidence]}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <input type="number" value={k.current} onChange={e => updateKR(k.id, 'current', Number(e.target.value))}
                        className="w-14 rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-right" />
                      <span className="text-xs text-neutral-400">/ {k.target}{k.unit ? ` ${k.unit}` : ''}</span>
                      <span className="text-xs font-medium text-neutral-600">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={() => addKR(g.id)} className="mt-2 text-xs text-neutral-400 hover:text-neutral-700">+ Add key result</button>
        </div>

        {/* Children */}
        {view === 'tree' && children.map(c => renderGoal(c, depth + 1))}
      </div>
    );
  }

  // Render top-level goals in tree view (no parent), or all in flat view
  const topLevel = view === 'tree' ? filtered.filter(g => !g.parent_id) : filtered;

  // Summary stats
  const onTrack = goals.filter(g => g.status === 'on_track').length;
  const atRisk = goals.filter(g => g.status === 'at_risk').length;
  const offTrack = goals.filter(g => g.status === 'off_track').length;
  const done = goals.filter(g => g.status === 'done').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Goals & OKRs</h1>
          <p className="text-neutral-500 mt-1 text-sm">Company → team → individual objectives with measurable key results.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
            <button onClick={() => setView('tree')} className={`px-3 py-1.5 text-xs font-medium ${view === 'tree' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`}>Tree</button>
            <button onClick={() => setView('flat')} className={`px-3 py-1.5 text-xs font-medium ${view === 'flat' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`}>Flat</button>
          </div>
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs">
            <option value="all">All levels</option>
            <option value="company">Company</option>
            <option value="team">Team</option>
            <option value="individual">Individual</option>
          </select>
          <button onClick={() => setOpen(o => !o)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">+ New objective</button>
        </div>
      </div>

      {/* Stats bar */}
      {goals.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[{ label: 'On track', val: onTrack, cls: 'text-green-600 bg-green-50' }, { label: 'At risk', val: atRisk, cls: 'text-amber-600 bg-amber-50' },
            { label: 'Off track', val: offTrack, cls: 'text-red-600 bg-red-50' }, { label: 'Done', val: done, cls: 'text-neutral-500 bg-neutral-50' }].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.cls}`}>
              <div className="text-2xl font-bold">{s.val}</div>
              <div className="text-xs font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {open && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">New objective</h3>
          <div className="flex gap-2 flex-wrap">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Objective (e.g. Increase revenue 30%)" className="flex-1 min-w-[220px] rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              <option value="company">Company</option><option value="team">Team</option><option value="individual">Individual</option>
            </select>
            <input value={form.quarter} onChange={e => setForm({ ...form, quarter: e.target.value })} placeholder="Q1 2026" className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          {goals.length > 0 && (
            <div>
              <label className="text-xs text-neutral-500">Parent objective (optional)</label>
              <select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                <option value="">None (top level)</option>
                {goals.map(g => <option key={g.id} value={g.id}>{LEVEL_ICONS[g.level]} {g.title}</option>)}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm">Cancel</button>
            <button onClick={addGoal} disabled={!form.title.trim()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      {goals.length === 0
        ? <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-400">No objectives yet. Create your first OKR above.</div>
        : <div>{topLevel.map(g => renderGoal(g, 0))}</div>
      }
    </div>
  );
}
