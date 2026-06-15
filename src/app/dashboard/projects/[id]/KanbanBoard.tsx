'use client';
import { useState } from 'react';

const COLS = [
  { key: 'todo',        label: 'To Do',       color: 'bg-neutral-100' },
  { key: 'in_progress', label: 'In Progress',  color: 'bg-blue-50' },
  { key: 'review',      label: 'Review',       color: 'bg-amber-50' },
  { key: 'done',        label: 'Done',         color: 'bg-green-50' },
];

type Task = { id: string; title: string; description?: string; status: string; due_date?: string };

export default function KanbanBoard({ projectId, initialTasks }: { projectId: string; initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [adding, setAdding] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  async function addTask(status: string) {
    if (!newTitle.trim()) return;
    const res  = await fetch(`/api/projects/${projectId}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, status }),
    });
    const data = await res.json();
    if (data.id) { setTasks((t) => [...t, data]); setNewTitle(''); setAdding(null); }
  }

  async function moveTask(taskId: string, status: string) {
    setTasks((t) => t.map((task) => task.id === taskId ? { ...task, status } : task));
    await fetch(`/api/projects/${projectId}/tasks`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, status }),
    });
  }

  return (
    <div>
      <h2 className="font-semibold mb-3">Tasks</h2>
      <div className="grid grid-cols-4 gap-3">
        {COLS.map((col) => (
          <div key={col.key} className={`rounded-xl p-3 ${col.color} min-h-[200px]`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">{col.label}</p>
              <span className="text-xs text-neutral-400">{tasks.filter((t) => t.status === col.key).length}</span>
            </div>
            <div className="space-y-2">
              {tasks.filter((t) => t.status === col.key).map((task) => (
                <div key={task.id} className="rounded-lg bg-white border border-neutral-200 p-3 text-sm shadow-sm">
                  <p className="font-medium leading-tight">{task.title}</p>
                  {task.due_date && <p className="text-xs text-neutral-400 mt-1">Due {new Date(task.due_date).toLocaleDateString('en-IN')}</p>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {COLS.filter((c) => c.key !== col.key).map((c) => (
                      <button key={c.key} onClick={() => moveTask(task.id, c.key)}
                        className="rounded px-1.5 py-0.5 text-[10px] text-neutral-500 hover:bg-neutral-100">
                        → {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {adding === col.key ? (
                <div className="rounded-lg bg-white border border-neutral-200 p-2 space-y-2">
                  <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addTask(col.key); if (e.key === 'Escape') { setAdding(null); setNewTitle(''); } }}
                    placeholder="Task title…" className="w-full text-sm border-none outline-none" />
                  <div className="flex gap-1">
                    <button onClick={() => addTask(col.key)} className="rounded bg-neutral-900 px-2 py-1 text-xs text-white">Add</button>
                    <button onClick={() => { setAdding(null); setNewTitle(''); }} className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAdding(col.key)}
                  className="w-full rounded-lg border border-dashed border-neutral-300 py-2 text-xs text-neutral-400 hover:border-neutral-400 hover:text-neutral-600">
                  + Add task
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
