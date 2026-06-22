'use client';
import { useState, useRef } from 'react';
import { promptDialog, toast } from '@/lib/toast';

type Task = { id: string; title: string; status: string; priority: string; assignee_id: string | null; due_date: string | null; sprint_id: string | null };
type Sprint = { id: string; name: string; status: string };
type Member = { id: string; name: string };

const COLUMNS = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
  { key: 'blocked', label: 'Blocked' },
];

const PRIORITY: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700',
  high: 'bg-amber-50 text-amber-700',
  medium: 'bg-blue-50 text-blue-700',
  low: 'bg-neutral-100 text-neutral-500',
};

export default function TasksBoard({ initialTasks, sprints, members, activeSprint }:
  { initialTasks: Task[]; sprints: Sprint[]; members: Member[]; activeSprint: string | null }) {

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState('');
  const [sprint, setSprint] = useState(activeSprint ?? '');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name ?? null;
  const filtered = sprint ? tasks.filter((t) => t.sprint_id === sprint) : tasks;

  async function addTask() {
    if (!title.trim()) return;
    setAdding(true);
    const res = await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, assignee_id: assignee || null, sprint_id: sprint || null, status: 'todo' }),
    });
    const data = await res.json();
    setAdding(false);
    if (data.id) {
      setTasks((t) => [{ id: data.id, title, status: 'todo', priority, assignee_id: assignee || null, due_date: null, sprint_id: sprint || null }, ...t]);
      setTitle('');
    }
  }

  function startEdit(t: Task) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setTimeout(() => editRef.current?.select(), 10);
  }

  async function saveEdit(id: string) {
    const t = editTitle.trim();
    if (!t || t === tasks.find((x) => x.id === id)?.title) { setEditingId(null); return; }
    setTasks((prev) => prev.map((x) => x.id === id ? { ...x, title: t } : x));
    setEditingId(null);
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t }),
    });
  }

  async function move(id: string, status: string) {
    setTasks((t) => t.map((x) => x.id === id ? { ...x, status } : x));
    await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  }

  async function newSprint() {
    const name = await promptDialog({ title: 'New sprint', placeholder: 'e.g. Sprint 1, June W3', confirmLabel: 'Create' });
    if (!name) return;
    const res = await fetch('/api/sprints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (data.id) { toast('Sprint created'); window.location.href = `/dashboard/tasks?sprint=${data.id}`; }
    else toast(data.error ?? 'Could not create sprint', 'error');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Tasks & Sprints</h1>
          <p className="text-neutral-500 mt-1 text-sm">Plan work, assign owners, track to done.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={sprint} onChange={(e) => setSprint(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
            <option value="">All tasks</option>
            {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={newSprint} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">+ Sprint</button>
        </div>
      </div>

      {/* Quick add */}
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 flex-wrap">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a task…" className="flex-1 min-w-[200px] rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
          <option value="urgent">Urgent</option><option value="high">High</option>
          <option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button onClick={addTask} disabled={adding || !title.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>

      {/* Board */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {COLUMNS.map((col) => {
          const items = filtered.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="rounded-xl border border-neutral-200 bg-neutral-50 p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-semibold text-neutral-600">{col.label}</span>
                <span className="text-xs text-neutral-400">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} className="rounded-lg border border-neutral-200 bg-white p-2.5">
                    {editingId === t.id ? (
                      <input
                        ref={editRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => saveEdit(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(t.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-full text-sm rounded border border-blue-300 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        autoFocus
                      />
                    ) : (
                      <div className="text-sm cursor-text" onDoubleClick={() => startEdit(t)} title="Double-click to edit">{t.title}</div>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY[t.priority]}`}>{t.priority}</span>
                      {memberName(t.assignee_id) && (
                        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">{memberName(t.assignee_id)}</span>
                      )}
                    </div>
                    <select value={t.status} onChange={(e) => move(t.id, e.target.value)}
                      className="mt-2 w-full rounded-md border border-neutral-200 px-1.5 py-1 text-[11px] text-neutral-500">
                      {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                ))}
                {items.length === 0 && <div className="px-2 py-4 text-center text-[11px] text-neutral-300">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
