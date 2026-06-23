'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from '@/lib/toast';

type Task = {
  id: string; title: string; status: string; priority: string;
  assignee_id: string | null; due_date: string | null; sprint_id: string | null;
  estimated_hours: number | null; parent_task_id: string | null;
};
type Sprint = { id: string; name: string; status: string; start_date: string | null; end_date: string | null };
type Member = { id: string; name: string };
type SubTask = { id: string; title: string; status: string; priority: string; assignee_id: string | null };
type DepItem = {
  id: string; dep_type: string;
  depends_on_id?: string; task_id?: string;
  tasks?: { title: string; status: string };
};
type Deps = { blocking: DepItem[]; blocked_by: DepItem[] };

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: 'bg-neutral-100' },
  { key: 'todo', label: 'To Do', color: 'bg-blue-50' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-amber-50' },
  { key: 'review', label: 'Review', color: 'bg-purple-50' },
  { key: 'done', label: 'Done', color: 'bg-green-50' },
  { key: 'blocked', label: 'Blocked', color: 'bg-red-50' },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700', high: 'bg-amber-100 text-amber-700',
  medium: 'bg-blue-100 text-blue-700', low: 'bg-neutral-100 text-neutral-500',
};
const STATUS_COLORS: Record<string, string> = {
  backlog: 'text-neutral-400', todo: 'text-blue-600', in_progress: 'text-amber-600',
  review: 'text-purple-600', done: 'text-green-600', blocked: 'text-red-600',
};
const CONF_COLORS: Record<string, string> = {
  on_track: 'bg-green-50 text-green-700', at_risk: 'bg-amber-50 text-amber-700', off_track: 'bg-red-50 text-red-700',
};

function SprintBurndown({ tasks, sprint }: { tasks: Task[]; sprint: Sprint | null }) {
  if (!sprint || !sprint.start_date || !sprint.end_date) return null;
  const start = new Date(sprint.start_date);
  const end = new Date(sprint.end_date);
  const today = new Date();
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const elapsed = Math.max(0, Math.min(totalDays, Math.ceil((today.getTime() - start.getTime()) / 86400000)));
  const sprintTasks = tasks.filter((t) => t.sprint_id === sprint.id);
  const done = sprintTasks.filter((t) => t.status === 'done').length;
  const total = sprintTasks.length;
  const idealPct = elapsed / totalDays;
  const actualPct = total === 0 ? 0 : done / total;
  const daysLeft = Math.max(0, totalDays - elapsed);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{sprint.name}</h3>
        <span className="text-xs text-neutral-400">{daysLeft}d left</span>
      </div>
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-neutral-500">
              <span>Ideal progress</span><span>{Math.round(idealPct * 100)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-100">
              <div className="h-1.5 rounded-full bg-neutral-300" style={{ width: `${idealPct * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-neutral-500">
              <span>Actual done</span><span>{done}/{total} tasks</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-100">
              <div className={`h-1.5 rounded-full transition-all ${actualPct >= idealPct ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${actualPct * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${actualPct >= idealPct ? 'text-green-600' : 'text-amber-600'}`}>
            {Math.round(actualPct * 100)}%
          </div>
          <div className="text-[10px] text-neutral-400">complete</div>
        </div>
      </div>
    </div>
  );
}

function TaskDetail({
  task, members, onClose, onUpdate, onDelete,
}: {
  task: Task; members: Member[]; onClose: () => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const [tab, setTab] = useState<'detail' | 'subtasks' | 'deps'>('detail');
  const [form, setForm] = useState({ ...task });
  const [saving, setSaving] = useState(false);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [deps, setDeps] = useState<Deps>({ blocking: [], blocked_by: [] });
  const [subInput, setSubInput] = useState('');
  const [depInput, setDepInput] = useState('');
  const [loadingSub, setLoadingSub] = useState(false);
  const [loadingDep, setLoadingDep] = useState(false);

  useEffect(() => {
    if (tab === 'subtasks' && subtasks.length === 0) {
      setLoadingSub(true);
      fetch(`/api/tasks/${task.id}/subtasks`).then(r => r.json()).then(d => { setSubtasks(d); setLoadingSub(false); });
    }
    if (tab === 'deps' && deps.blocking.length === 0 && deps.blocked_by.length === 0) {
      setLoadingDep(true);
      fetch(`/api/tasks/${task.id}/dependencies`).then(r => r.json()).then(d => { setDeps(d); setLoadingDep(false); });
    }
  }, [tab]);

  async function save() {
    setSaving(true);
    const patch: Record<string, unknown> = {};
    for (const k of ['title', 'status', 'priority', 'assignee_id', 'due_date', 'estimated_hours'] as const) {
      patch[k] = (form as any)[k] || null;
    }
    if (form.title) patch.title = form.title;
    await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    onUpdate(task.id, form);
    setSaving(false);
    toast('Saved');
  }

  async function addSubtask() {
    if (!subInput.trim()) return;
    const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: subInput }),
    });
    const data = await res.json();
    if (data.id) { setSubtasks(s => [...s, { id: data.id, title: subInput, status: 'todo', priority: 'medium', assignee_id: null }]); setSubInput(''); }
  }

  async function toggleSubtask(id: string, done: boolean) {
    setSubtasks(s => s.map(x => x.id === id ? { ...x, status: done ? 'done' : 'todo' } : x));
    await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: done ? 'done' : 'todo' }) });
  }

  const subDone = subtasks.filter(s => s.status === 'done').length;
  const memberName = (id: string | null) => members.find(m => m.id === id)?.name ?? 'Unassigned';

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
          <span className={`text-xs font-medium ${STATUS_COLORS[form.status]}`}>{form.status.replace('_', ' ')}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => { onDelete(task.id); onClose(); }}
              className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50">Delete</button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-neutral-100">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 px-5">
          {(['detail', 'subtasks', 'deps'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'}`}>
              {t === 'detail' ? 'Details' : t === 'subtasks' ? `Sub-tasks${subtasks.length ? ` (${subDone}/${subtasks.length})` : ''}` : 'Dependencies'}
            </button>
          ))}
        </div>

        <div className="flex-1 p-5 space-y-4">
          {tab === 'detail' && (
            <>
              <div>
                <label className="text-xs font-medium text-neutral-500">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-500">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                    {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                    <option value="urgent">Urgent</option><option value="high">High</option>
                    <option value="medium">Medium</option><option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Assignee</label>
                  <select value={form.assignee_id ?? ''} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value || null }))}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Due date</label>
                  <input type="date" value={form.due_date ?? ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value || null }))}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Estimated hours</label>
                  <input type="number" min={0} step={0.5} value={form.estimated_hours ?? ''} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="e.g. 4" className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
                </div>
              </div>
              <button onClick={save} disabled={saving}
                className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          )}

          {tab === 'subtasks' && (
            <div className="space-y-3">
              {subtasks.length > 0 && (
                <div className="h-1.5 w-full rounded-full bg-neutral-100">
                  <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${subtasks.length ? (subDone / subtasks.length) * 100 : 0}%` }} />
                </div>
              )}
              {loadingSub && <p className="text-sm text-neutral-400">Loading…</p>}
              <div className="space-y-2">
                {subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
                    <input type="checkbox" checked={s.status === 'done'} onChange={e => toggleSubtask(s.id, e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900" />
                    <span className={`flex-1 text-sm ${s.status === 'done' ? 'line-through text-neutral-400' : ''}`}>{s.title}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[s.priority]}`}>{s.priority}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={subInput} onChange={e => setSubInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask()}
                  placeholder="Add a sub-task…" className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
                <button onClick={addSubtask} disabled={!subInput.trim()}
                  className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50">Add</button>
              </div>
            </div>
          )}

          {tab === 'deps' && (
            <div className="space-y-4">
              {loadingDep && <p className="text-sm text-neutral-400">Loading…</p>}

              {deps.blocked_by.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-red-600">Blocked by</p>
                  <div className="space-y-1.5">
                    {deps.blocked_by.map(d => (
                      <div key={d.id} className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm">
                        <span className="text-red-500">⛔</span>
                        <span className="flex-1">{(d as any).tasks?.title ?? d.task_id}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${STATUS_COLORS[(d as any).tasks?.status ?? 'todo']}`}>{(d as any).tasks?.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deps.blocking.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-amber-600">Blocking</p>
                  <div className="space-y-1.5">
                    {deps.blocking.map(d => (
                      <div key={d.id} className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm">
                        <span className="text-amber-500">⚠️</span>
                        <span className="flex-1">{(d as any).tasks?.title ?? d.depends_on_id}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${STATUS_COLORS[(d as any).tasks?.status ?? 'todo']}`}>{(d as any).tasks?.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1.5 text-xs font-medium text-neutral-500">Add dependency (task ID or title search coming soon)</p>
                <div className="flex gap-2">
                  <input value={depInput} onChange={e => setDepInput(e.target.value)}
                    placeholder="Paste task ID…" className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono" />
                  <button onClick={async () => {
                    if (!depInput.trim()) return;
                    await fetch(`/api/tasks/${task.id}/dependencies`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ depends_on_id: depInput, dep_type: 'blocks' }),
                    });
                    setDepInput('');
                    const d = await fetch(`/api/tasks/${task.id}/dependencies`).then(r => r.json());
                    setDeps(d);
                  }} disabled={!depInput.trim()} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50">Link</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TasksBoard({ initialTasks, sprints, members, activeSprint }:
  { initialTasks: Task[]; sprints: Sprint[]; members: Member[]; activeSprint: string | null }) {

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState('');
  const [sprint, setSprint] = useState(activeSprint ?? '');
  const [adding, setAdding] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name ?? null;
  const filtered = sprint ? tasks.filter((t) => t.sprint_id === sprint && !t.parent_task_id) : tasks.filter(t => !t.parent_task_id);
  const currentSprint = sprints.find(s => s.id === sprint) ?? null;

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
      setTasks(t => [{ id: data.id, title, status: 'todo', priority, assignee_id: assignee || null, due_date: null, sprint_id: sprint || null, estimated_hours: null, parent_task_id: null }, ...t]);
      setTitle('');
    }
  }

  async function move(id: string, status: string) {
    setTasks(t => t.map(x => x.id === id ? { ...x, status } : x));
    await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  }

  async function deleteTask(id: string) {
    setTasks(t => t.filter(x => x.id !== id));
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  }

  async function newSprint() {
    const name = prompt('Sprint name (e.g. Sprint 1, June W3):');
    if (!name) return;
    const res = await fetch('/api/sprints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (data.id) { toast('Sprint created'); window.location.href = `/dashboard/tasks?sprint=${data.id}`; }
    else toast(data.error ?? 'Could not create sprint', 'error');
  }

  // Velocity: last 3 completed sprints' done task counts
  const completedSprints = sprints.filter(s => s.status === 'completed').slice(-3);
  const velocityData = completedSprints.map(s => ({
    name: s.name,
    done: tasks.filter(t => t.sprint_id === s.id && t.status === 'done').length,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Tasks & Sprints</h1>
          <p className="text-neutral-500 mt-1 text-sm">{filtered.length} tasks · {filtered.filter(t => t.status === 'done').length} done</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
            <button onClick={() => setView('board')} className={`px-3 py-1.5 text-xs font-medium ${view === 'board' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`}>Board</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs font-medium ${view === 'list' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`}>List</button>
          </div>
          <select value={sprint} onChange={e => setSprint(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
            <option value="">All tasks</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name} {s.status === 'active' ? '●' : ''}</option>)}
          </select>
          <button onClick={newSprint} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">+ Sprint</button>
        </div>
      </div>

      {/* Sprint burndown */}
      {currentSprint && <SprintBurndown tasks={tasks} sprint={currentSprint} />}

      {/* Velocity (only when no sprint filter) */}
      {!sprint && velocityData.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">Sprint velocity</h3>
          <div className="flex items-end gap-3 h-16">
            {velocityData.map(v => (
              <div key={v.name} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-neutral-700">{v.done}</span>
                <div className="w-full rounded-t bg-neutral-900" style={{ height: `${Math.max(8, (v.done / Math.max(...velocityData.map(x => x.done), 1)) * 40)}px` }} />
                <span className="text-[10px] text-neutral-400 truncate max-w-full">{v.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick add */}
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 flex-wrap">
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task…" className="flex-1 min-w-[200px] rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        <select value={priority} onChange={e => setPriority(e.target.value)} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
          <option value="urgent">Urgent</option><option value="high">High</option>
          <option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select value={assignee} onChange={e => setAssignee(e.target.value)} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
          <option value="">Unassigned</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button onClick={addTask} disabled={adding || !title.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>

      {/* Board view */}
      {view === 'board' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {COLUMNS.map(col => {
            const items = filtered.filter(t => t.status === col.key);
            return (
              <div key={col.key} className={`rounded-xl border border-neutral-200 ${col.color} p-2`}>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-semibold text-neutral-600">{col.label}</span>
                  <span className="text-xs text-neutral-400">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map(t => (
                    <div key={t.id} onClick={() => setSelectedTask(t)}
                      className="cursor-pointer rounded-lg border border-neutral-200 bg-white p-2.5 hover:border-neutral-400 transition-colors">
                      <div className="text-sm">{t.title}</div>
                      {t.estimated_hours && <div className="mt-1 text-[10px] text-neutral-400">⏱ {t.estimated_hours}h</div>}
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                        {memberName(t.assignee_id) && (
                          <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">{memberName(t.assignee_id)}</span>
                        )}
                        {t.due_date && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${new Date(t.due_date) < new Date() ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-500'}`}>
                            {new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div className="px-2 py-4 text-center text-[11px] text-neutral-300">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {filtered.length === 0 ? <div className="p-10 text-center text-sm text-neutral-400">No tasks.</div> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-2.5 text-left font-medium">Task</th>
                <th className="px-4 py-2.5 text-left font-medium">Priority</th>
                <th className="px-4 py-2.5 text-left font-medium">Assignee</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Est.</th>
                <th className="px-4 py-2.5 text-left font-medium">Due</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map(t => (
                  <tr key={t.id} onClick={() => setSelectedTask(t)} className="cursor-pointer hover:bg-neutral-50">
                    <td className="px-4 py-2.5 font-medium">{t.title}</td>
                    <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span></td>
                    <td className="px-4 py-2.5 text-neutral-500">{memberName(t.assignee_id) ?? '—'}</td>
                    <td className="px-4 py-2.5"><span className={`text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status.replace('_', ' ')}</span></td>
                    <td className="px-4 py-2.5 text-neutral-400 text-xs">{t.estimated_hours ? `${t.estimated_hours}h` : '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-400 text-xs">{t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Task detail slide-over */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          members={members}
          onClose={() => setSelectedTask(null)}
          onUpdate={(id, patch) => setTasks(t => t.map(x => x.id === id ? { ...x, ...patch } : x))}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}
