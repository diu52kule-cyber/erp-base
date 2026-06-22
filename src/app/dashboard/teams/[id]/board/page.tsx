'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Task = {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: string | null;
  assignee_id: string | null;
  project_id: string | null;
  due_date: string | null;
};

const COLUMNS = [
  { status: 'todo',        label: 'To Do',       color: 'bg-neutral-100 text-neutral-600' },
  { status: 'in_progress', label: 'In Progress',  color: 'bg-blue-50 text-blue-700' },
  { status: 'review',      label: 'Review',       color: 'bg-amber-50 text-amber-700' },
  { status: 'done',        label: 'Done',         color: 'bg-green-50 text-green-700' },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  high:   'text-red-500',
  medium: 'text-amber-500',
  low:    'text-neutral-400',
};

export default function TeamBoardPage() {
  const params = useParams<{ id: string }>();
  const teamId = params.id;

  const [tasks, setTasks]       = useState<Task[]>([]);
  const [loading, setLoading]   = useState(true);
  const [moving, setMoving]     = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/tasks`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch { setTasks([]); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [teamId]);

  async function moveTask(taskId: string, newStatus: string) {
    setMoving(taskId);
    try {
      await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t));
    } catch { /* ignore */ }
    setMoving(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/teams/${teamId}`} className="text-sm text-neutral-500 hover:text-neutral-900">← Team</Link>
          <h1 className="text-xl font-semibold">Team Board</h1>
        </div>
        <p className="text-sm text-neutral-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/teams/${teamId}`} className="text-sm text-neutral-500 hover:text-neutral-900">← Team</Link>
          <h1 className="text-xl font-semibold">Team Board</h1>
        </div>
        <Link
          href="/dashboard/tasks"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
        >
          All Tasks
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400">No tasks assigned to team members yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="text-xs text-neutral-400">{colTasks.length}</span>
                </div>

                <div className="space-y-2 min-h-[120px]">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-xl border border-neutral-200 bg-white p-3 space-y-2 shadow-sm ${moving === task.id ? 'opacity-50' : ''}`}
                    >
                      <p className="text-sm font-medium leading-tight">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-neutral-400">Due {new Date(task.due_date).toLocaleDateString('en-IN')}</p>
                      )}
                      {task.priority && (
                        <p className={`text-xs font-medium ${PRIORITY_COLORS[task.priority] ?? ''}`}>
                          {task.priority}
                        </p>
                      )}
                      {/* Move buttons */}
                      <div className="flex gap-1 pt-1 border-t border-neutral-100">
                        {COLUMNS.filter((c) => c.status !== col.status).map((target) => (
                          <button
                            key={target.status}
                            onClick={() => moveTask(task.id, target.status)}
                            disabled={moving === task.id}
                            className={`rounded px-1.5 py-0.5 text-xs ${target.color} hover:opacity-80 disabled:opacity-40`}
                          >
                            {target.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
