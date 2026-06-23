'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

type Meeting = {
  id: string; title: string; meeting_date: string;
  agenda: string | null; notes: string | null;
  attendees: string[] | null; is_recurring: boolean; recurrence_rule: string | null;
};
type Item = { id: string; text: string; assignee_id: string | null; done: boolean; task_id: string | null };
type Member = { id: string; name: string };

const RECURRENCE_OPTIONS = [
  { val: '', label: 'One-time' },
  { val: 'daily', label: 'Daily' },
  { val: 'weekly', label: 'Weekly' },
  { val: 'biweekly', label: 'Bi-weekly' },
  { val: 'monthly', label: 'Monthly' },
];

export default function MeetingDetail({ meeting, initialItems, members }:
  { meeting: Meeting; initialItems: Item[]; members: Member[] }) {

  const [notes, setNotes] = useState(meeting.notes ?? '');
  const [agenda, setAgenda] = useState(meeting.agenda ?? '');
  const [items, setItems] = useState<Item[]>(initialItems);
  const [newItem, setNewItem] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [saved, setSaved] = useState(false);
  const [attendees, setAttendees] = useState<string[]>(meeting.attendees ?? []);
  const [isRecurring, setIsRecurring] = useState(meeting.is_recurring ?? false);
  const [recurrenceRule, setRecurrenceRule] = useState(meeting.recurrence_rule ?? '');
  const [showAttendees, setShowAttendees] = useState(false);

  const name = (id: string | null) => members.find((m) => m.id === id)?.name ?? 'Unassigned';

  function toggleAttendee(userId: string) {
    setAttendees(a => a.includes(userId) ? a.filter(x => x !== userId) : [...a, userId]);
  }

  async function saveNotes() {
    await fetch(`/api/meetings/${meeting.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, agenda, attendees, is_recurring: isRecurring, recurrence_rule: recurrenceRule || null }),
    });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    toast('Meeting saved');
  }

  async function addItem() {
    if (!newItem.trim()) return;
    const res = await fetch('/api/action-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting_id: meeting.id, text: newItem, assignee_id: newAssignee || null }),
    });
    const data = await res.json();
    if (data.id) {
      setItems(x => [...x, { id: data.id, text: newItem, assignee_id: newAssignee || null, done: false, task_id: null }]);
      setNewItem(''); setNewAssignee('');
    }
  }

  async function toggle(id: string, done: boolean) {
    setItems(x => x.map(i => i.id === id ? { ...i, done } : i));
    await fetch('/api/action-items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, done }) });
  }

  async function convert(id: string, text: string) {
    const res = await fetch('/api/action-items', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, convert: true }),
    });
    const data = await res.json();
    if (data.task_id) { setItems(x => x.map(i => i.id === id ? { ...i, task_id: data.task_id } : i)); toast('Task created from action item'); }
    else toast('Error creating task', 'error');
  }

  const doneCount = items.filter(i => i.done).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{meeting.title}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-neutral-400">
              {new Date(meeting.meeting_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {meeting.is_recurring && (
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">↻ {meeting.recurrence_rule ?? 'recurring'}</span>
            )}
          </div>
        </div>

        {/* Attendees chip */}
        <button onClick={() => setShowAttendees(o => !o)}
          className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50">
          <span className="text-neutral-500">👥 {attendees.length || 'No'} attendee{attendees.length !== 1 ? 's' : ''}</span>
          {attendees.length > 0 && (
            <div className="flex -space-x-1">
              {attendees.slice(0, 4).map(uid => (
                <div key={uid} className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-semibold ring-2 ring-white">
                  {name(uid)[0]?.toUpperCase()}
                </div>
              ))}
              {attendees.length > 4 && <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-300 text-[10px] font-semibold ring-2 ring-white">+{attendees.length - 4}</div>}
            </div>
          )}
        </button>
      </div>

      {/* Attendees panel */}
      {showAttendees && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Attendees</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                Recurring
              </label>
              {isRecurring && (
                <select value={recurrenceRule} onChange={e => setRecurrenceRule(e.target.value)} className="rounded-lg border border-neutral-200 px-2 py-1 text-xs">
                  {RECURRENCE_OPTIONS.slice(1).map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {members.map(m => (
              <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${attendees.includes(m.id) ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                <input type="checkbox" checked={attendees.includes(m.id)} onChange={() => toggleAttendee(m.id)} className="sr-only" />
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${attendees.includes(m.id) ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`}>
                  {m.name[0]?.toUpperCase()}
                </div>
                <span>{m.name}</span>
                {attendees.includes(m.id) && <span className="ml-auto text-green-600 text-xs">✓</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {/* Notes */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Agenda & notes</h2>
            <button onClick={saveNotes}
              className="rounded-md bg-neutral-900 px-3 py-1 text-xs text-white hover:bg-neutral-700">
              {saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
          <textarea value={agenda} onChange={e => setAgenda(e.target.value)} rows={3}
            placeholder="Agenda…" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={8}
            placeholder="Notes, decisions, context…" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>

        {/* Action items */}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Action items</h2>
            {items.length > 0 && (
              <span className="text-xs text-neutral-400">{doneCount}/{items.length} done</span>
            )}
          </div>

          {items.length > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
            </div>
          )}

          <div className="flex gap-2">
            <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Add an action item…" className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
            <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} className="rounded-xl border border-neutral-200 px-2 py-2 text-sm">
              <option value="">Owner</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={addItem} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-700">Add</button>
          </div>

          <ul className="space-y-2">
            {items.map(i => (
              <li key={i.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${i.done ? 'bg-neutral-50' : 'bg-white'}`}>
                <input type="checkbox" checked={i.done} onChange={e => toggle(i.id, e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-neutral-900" />
                <span className={`flex-1 ${i.done ? 'line-through text-neutral-400' : ''}`}>{i.text}</span>
                <span className="text-xs text-neutral-400">{name(i.assignee_id)}</span>
                {i.task_id ? (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] text-green-700">→ task ✓</span>
                ) : (
                  <button onClick={() => convert(i.id, i.text)} className="rounded-md border border-neutral-200 px-2 py-0.5 text-[10px] hover:bg-neutral-50">→ task</button>
                )}
              </li>
            ))}
            {items.length === 0 && <li className="py-2 text-xs text-neutral-400">No action items yet. Add one above.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
