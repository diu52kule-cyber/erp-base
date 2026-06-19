'use client';
import { useState } from 'react';

type Meeting = { id: string; title: string; meeting_date: string; agenda: string | null; notes: string | null };
type Item = { id: string; text: string; assignee_id: string | null; done: boolean; task_id: string | null };
type Member = { id: string; name: string };

export default function MeetingDetail({ meeting, initialItems, members }:
  { meeting: Meeting; initialItems: Item[]; members: Member[] }) {

  const [notes, setNotes] = useState(meeting.notes ?? '');
  const [agenda, setAgenda] = useState(meeting.agenda ?? '');
  const [items, setItems] = useState<Item[]>(initialItems);
  const [newItem, setNewItem] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [saved, setSaved] = useState(false);

  const name = (id: string | null) => members.find((m) => m.id === id)?.name ?? 'Unassigned';

  async function saveNotes() {
    await fetch(`/api/meetings/${meeting.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes, agenda }) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }
  async function addItem() {
    if (!newItem.trim()) return;
    const res = await fetch('/api/action-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meeting_id: meeting.id, text: newItem, assignee_id: newAssignee || null }) });
    const data = await res.json();
    if (data.id) { setItems((x) => [...x, { id: data.id, text: newItem, assignee_id: newAssignee || null, done: false, task_id: null }]); setNewItem(''); setNewAssignee(''); }
  }
  async function toggle(id: string, done: boolean) {
    setItems((x) => x.map((i) => i.id === id ? { ...i, done } : i));
    await fetch('/api/action-items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, done }) });
  }
  async function convert(id: string) {
    const res = await fetch('/api/action-items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, convert: true }) });
    const data = await res.json();
    if (data.task_id) setItems((x) => x.map((i) => i.id === id ? { ...i, task_id: data.task_id } : i));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{meeting.title}</h1>
        <p className="text-sm text-neutral-400">{new Date(meeting.meeting_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Notes */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Agenda & notes</h2>
            <button onClick={saveNotes} className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white hover:bg-neutral-700">{saved ? 'Saved ✓' : 'Save'}</button>
          </div>
          <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={3} placeholder="Agenda…" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} placeholder="Notes…" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        </div>

        {/* Action items */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-sm">Action items</h2>
          <div className="flex gap-2">
            <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} placeholder="Add an action item…" className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className="rounded-lg border border-neutral-200 px-2 py-2 text-sm">
              <option value="">Owner</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={addItem} className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white">Add</button>
          </div>
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={i.done} onChange={(e) => toggle(i.id, e.target.checked)} className="h-4 w-4" />
                <span className={`flex-1 ${i.done ? 'line-through text-neutral-400' : ''}`}>{i.text}</span>
                <span className="text-xs text-neutral-400">{name(i.assignee_id)}</span>
                {i.task_id ? (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] text-green-700">→ task ✓</span>
                ) : (
                  <button onClick={() => convert(i.id)} className="rounded-md border border-neutral-200 px-2 py-0.5 text-[10px] hover:bg-neutral-50">→ task</button>
                )}
              </li>
            ))}
            {items.length === 0 && <li className="text-xs text-neutral-400">No action items yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
