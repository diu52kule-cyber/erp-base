'use client';
import { useState } from 'react';

type Feature = { id: string; title: string; description: string | null; stage: string };

const STAGES = [
  { key: 'idea', label: 'Idea' },
  { key: 'research', label: 'Research' },
  { key: 'prd', label: 'PRD' },
  { key: 'design', label: 'Design' },
  { key: 'dev', label: 'Dev' },
  { key: 'qa', label: 'QA' },
  { key: 'launch', label: 'Launch' },
  { key: 'feedback', label: 'Feedback' },
];

export default function FeaturesBoard({ initial }: { initial: Feature[] }) {
  const [features, setFeatures] = useState<Feature[]>(initial);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch('/api/features', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
    const data = await res.json(); setBusy(false);
    if (data.id) { setFeatures((f) => [{ id: data.id, title, description: null, stage: 'idea' }, ...f]); setTitle(''); }
  }
  async function moveStage(id: string, stage: string) {
    setFeatures((f) => f.map((x) => x.id === id ? { ...x, stage } : x));
    await fetch('/api/features', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stage }) });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Product Pipeline</h1>
        <p className="text-neutral-500 mt-1 text-sm">Idea → Research → PRD → Design → Dev → QA → Launch → Feedback</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="New feature idea…" className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        <button onClick={add} disabled={busy || !title.trim()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">Add</button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((s) => {
          const items = features.filter((f) => f.stage === s.key);
          return (
            <div key={s.key} className="w-56 shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-semibold text-neutral-600">{s.label}</span>
                <span className="text-xs text-neutral-400">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((f) => (
                  <div key={f.id} className="rounded-lg border border-neutral-200 bg-white p-2.5">
                    <div className="text-sm font-medium">{f.title}</div>
                    <select value={f.stage} onChange={(e) => moveStage(f.id, e.target.value)}
                      className="mt-2 w-full rounded-md border border-neutral-200 px-1.5 py-1 text-[11px] text-neutral-500">
                      {STAGES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                ))}
                {items.length === 0 && <div className="px-2 py-3 text-center text-[11px] text-neutral-300">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
