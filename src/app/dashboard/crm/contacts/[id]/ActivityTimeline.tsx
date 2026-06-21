'use client';

import { useState } from 'react';

type Activity = {
  id: string;
  type: string;
  body: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

const TYPE_ICONS: Record<string, string> = {
  note: '📝',
  call: '📞',
  email: '✉️',
  whatsapp: '💬',
  meeting: '🤝',
  task: '✅',
};

const TYPE_LABELS: Record<string, string> = {
  note: 'Note', call: 'Call', email: 'Email',
  whatsapp: 'WhatsApp', meeting: 'Meeting', task: 'Task',
};

const ACTIVITY_TYPES = ['note', 'call', 'email', 'whatsapp', 'meeting', 'task'] as const;
type ActivityType = typeof ACTIVITY_TYPES[number];

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ActivityTimeline({
  contactId,
  initial,
}: {
  contactId: string;
  initial: Activity[];
}) {
  const [activities, setActivities] = useState(initial);
  const [type, setType] = useState<ActivityType>('note');
  const [body, setBody] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addActivity() {
    if (!body.trim()) { setError('Enter activity details'); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/contact-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          type,
          body: body.trim(),
          due_date: dueDate || null,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        const newAct: Activity = {
          id: data.id,
          type,
          body: body.trim(),
          due_date: dueDate || null,
          completed_at: null,
          created_at: new Date().toISOString(),
        };
        setActivities((a) => [newAct, ...a]);
        setBody('');
        setDueDate('');
      }
    } catch {
      setError('Failed to save');
    }
    setPending(false);
  }

  async function toggleComplete(act: Activity) {
    const completed_at = act.completed_at ? null : new Date().toISOString();
    setActivities((prev) =>
      prev.map((a) => a.id === act.id ? { ...a, completed_at } : a)
    );
    await fetch(`/api/contact-activities/${act.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_at }),
    });
  }

  async function deleteActivity(id: string) {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/contact-activities/${id}`, { method: 'DELETE' });
  }

  const upcoming = activities.filter((a) => a.due_date && !a.completed_at && new Date(a.due_date) > new Date());
  const overdue  = activities.filter((a) => a.due_date && !a.completed_at && new Date(a.due_date) <= new Date());

  return (
    <div className="space-y-4">
      {/* Upcoming reminders banner */}
      {overdue.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <strong>{overdue.length} overdue</strong> follow-up{overdue.length > 1 ? 's' : ''}:{' '}
          {overdue.map((a) => a.body).join(' · ')}
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <strong>{upcoming.length} upcoming</strong>:{' '}
          {upcoming.map((a) => `${a.body} (${new Date(a.due_date!).toLocaleDateString('en-IN')})`).join(' · ')}
        </div>
      )}

      {/* Add activity form */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
        <div className="flex gap-2">
          {ACTIVITY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                type === t
                  ? 'bg-neutral-900 text-white'
                  : 'border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {TYPE_ICONS[t]} {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addActivity(); }}
            rows={2}
            placeholder={`Log a ${TYPE_LABELS[type].toLowerCase()}…`}
            className="flex-1 resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-neutral-500 text-xs whitespace-nowrap">Follow-up by</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg border border-neutral-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>
          <div className="ml-auto">
            <button
              onClick={addActivity}
              disabled={pending}
              className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Log'}
            </button>
          </div>
        </div>
        <p className="text-xs text-neutral-400">Ctrl+Enter to save quickly</p>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-400">No activity logged yet</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div
              key={a.id}
              className={`group flex gap-3 rounded-xl border p-3 text-sm transition-colors ${
                a.completed_at
                  ? 'border-neutral-100 bg-neutral-50 opacity-60'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <span className="mt-0.5 text-lg leading-none">{TYPE_ICONS[a.type] ?? '•'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`leading-snug ${a.completed_at ? 'line-through text-neutral-400' : ''}`}>
                    {a.body}
                  </p>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {a.type === 'task' && (
                      <button
                        onClick={() => toggleComplete(a)}
                        className="rounded px-1.5 py-0.5 text-xs border border-neutral-200 hover:bg-neutral-50"
                        title={a.completed_at ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {a.completed_at ? 'Reopen' : 'Done'}
                      </button>
                    )}
                    <button
                      onClick={() => deleteActivity(a.id)}
                      className="rounded px-1 py-0.5 text-xs text-red-400 hover:text-red-600"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                  <span>{fmtDate(a.created_at)}</span>
                  {a.due_date && (
                    <span className={new Date(a.due_date) < new Date() && !a.completed_at ? 'text-red-500 font-medium' : 'text-blue-500'}>
                      Due {new Date(a.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
