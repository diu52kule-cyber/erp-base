'use client';
import { useState } from 'react';

export default function NewMeeting() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', meeting_date: new Date().toISOString().split('T')[0], agenda: '' });
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!form.title.trim()) return;
    setBusy(true);
    const res = await fetch('/api/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.id) { window.location.href = `/dashboard/meetings/${data.id}`; return; }
    setBusy(false);
  }

  if (!open) return <button onClick={() => setOpen(true)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">+ New meeting</button>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold">New meeting</h2>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. Weekly standup)" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        <input type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        <textarea value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} rows={3} placeholder="Agenda" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        <div className="flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm">Cancel</button>
          <button onClick={create} disabled={busy || !form.title.trim()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? 'Creating…' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}
