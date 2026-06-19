'use client';
import { useState } from 'react';

type Release = { id: string; version: string; title: string | null; notes: string | null; status: string; released_at: string | null; created_at: string };

const STATUS = ['planned', 'released', 'rolled_back'];
const COLORS: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-700', released: 'bg-green-50 text-green-700', rolled_back: 'bg-red-50 text-red-700',
};

export default function ReleasesClient({ initial }: { initial: Release[] }) {
  const [items, setItems] = useState<Release[]>(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ version: '', title: '', notes: '' });
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!form.version.trim()) return;
    setBusy(true);
    const res = await fetch('/api/releases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json(); setBusy(false);
    if (data.id) {
      setItems((x) => [{ id: data.id, version: form.version, title: form.title, notes: form.notes, status: 'planned', released_at: null, created_at: new Date().toISOString() }, ...x]);
      setForm({ version: '', title: '', notes: '' }); setOpen(false);
    }
  }
  async function setStatus(id: string, status: string) {
    setItems((x) => x.map((r) => r.id === id ? { ...r, status } : r));
    await fetch('/api/releases', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Releases</h1>
          <p className="text-neutral-500 mt-1 text-sm">Version log, ship notes, rollback tracking.</p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">+ New release</button>
      </div>

      {open && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="v2.4.1" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-mono" />
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (optional)" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4}
            placeholder={"What shipped?\n- Fixed POS printer bug\n- Added GST report export"} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm">Cancel</button>
            <button onClick={add} disabled={busy || !form.version.trim()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 ? <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-400">No releases yet.</div> :
          items.map((r) => (
            <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold">{r.version}</span>
                {r.title && <span className="text-sm text-neutral-600">{r.title}</span>}
                <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}
                  className={`ml-auto rounded-full border-0 px-2 py-0.5 text-xs font-medium ${COLORS[r.status]}`}>
                  {STATUS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              {r.notes && <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-neutral-600">{r.notes}</pre>}
              {r.released_at && <p className="mt-2 text-xs text-neutral-400">Released {new Date(r.released_at).toLocaleDateString('en-IN')}</p>}
            </div>
          ))}
      </div>
    </div>
  );
}
