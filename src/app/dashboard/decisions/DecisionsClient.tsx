'use client';
import { useState } from 'react';

type Decision = { id: string; title: string; context: string | null; decision: string | null; alternatives: string | null; decided_on: string };

export default function DecisionsClient({ initial }: { initial: Decision[] }) {
  const [items, setItems] = useState<Decision[]>(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', context: '', decision: '', alternatives: '' });
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!form.title.trim()) return;
    setBusy(true);
    const res = await fetch('/api/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json(); setBusy(false);
    if (data.id) {
      setItems((x) => [{ id: data.id, ...form, decided_on: new Date().toISOString().split('T')[0] }, ...x]);
      setForm({ title: '', context: '', decision: '', alternatives: '' }); setOpen(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Decision Log</h1>
          <p className="text-neutral-500 mt-1 text-sm">Record why decisions were made — avoid re-litigating later.</p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">+ Log decision</button>
      </div>

      {open && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Decision (e.g. Use Supabase over Mongo)" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium" />
          <textarea value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} rows={2} placeholder="Context — what prompted this?" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <textarea value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })} rows={2} placeholder="The decision & reasoning" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <textarea value={form.alternatives} onChange={(e) => setForm({ ...form, alternatives: e.target.value })} rows={2} placeholder="Alternatives rejected & why" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm">Cancel</button>
            <button onClick={add} disabled={busy || !form.title.trim()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 ? <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-400">No decisions logged yet.</div> :
          items.map((d) => (
            <div key={d.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{d.title}</h3>
                <span className="text-xs text-neutral-400">{new Date(d.decided_on).toLocaleDateString('en-IN')}</span>
              </div>
              {d.context && <p className="mt-2 text-sm text-neutral-500"><span className="font-medium text-neutral-600">Context:</span> {d.context}</p>}
              {d.decision && <p className="mt-1 text-sm text-neutral-500"><span className="font-medium text-neutral-600">Decision:</span> {d.decision}</p>}
              {d.alternatives && <p className="mt-1 text-sm text-neutral-500"><span className="font-medium text-neutral-600">Rejected:</span> {d.alternatives}</p>}
            </div>
          ))}
      </div>
    </div>
  );
}
