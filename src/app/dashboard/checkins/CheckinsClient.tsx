'use client';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

type Checkin = { yesterday: string | null; today: string | null; blockers: string | null; mood?: number | null };
type FeedItem = Checkin & { name: string; user_id: string; created_at: string };
type HistoryItem = FeedItem & { checkin_date: string };

const MOODS: { val: number; emoji: string; label: string }[] = [
  { val: 1, emoji: '😫', label: 'Exhausted' },
  { val: 2, emoji: '😕', label: 'Low' },
  { val: 3, emoji: '😐', label: 'OK' },
  { val: 4, emoji: '😊', label: 'Good' },
  { val: 5, emoji: '🚀', label: 'Energised' },
];

function MoodPicker({ value, onChange }: { value: number | null | undefined; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-500">How are you feeling today?</label>
      <div className="mt-1.5 flex gap-2">
        {MOODS.map(m => (
          <button key={m.val} onClick={() => onChange(m.val)} title={m.label}
            className={`flex-1 rounded-xl border py-2 text-xl transition-all ${value === m.val ? 'border-neutral-900 bg-neutral-50 scale-110' : 'border-neutral-200 hover:border-neutral-400'}`}>
            {m.emoji}
          </button>
        ))}
      </div>
      {value && (
        <p className="mt-1 text-center text-xs text-neutral-400">
          {MOODS.find(m => m.val === value)?.label}
        </p>
      )}
    </div>
  );
}

function moodEmoji(val: number | null | undefined) {
  if (!val) return null;
  return MOODS.find(m => m.val === val)?.emoji ?? null;
}

export default function CheckinsClient({ mine, feed, checkedIn, teamSize }:
  { mine: Checkin | null; feed: FeedItem[]; checkedIn: number; teamSize: number }) {

  const [form, setForm] = useState<Checkin & { mood?: number | null }>({
    yesterday: mine?.yesterday ?? '', today: mine?.today ?? '', blockers: mine?.blockers ?? '', mood: (mine as any)?.mood ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!mine);
  const [tab, setTab] = useState<'today' | 'history'>('today');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [creatingTask, setCreatingTask] = useState<string | null>(null);

  async function loadHistory() {
    if (history.length > 0) return;
    setLoadingHistory(true);
    try {
      const data = await fetch('/api/checkins/history?days=14').then(r => r.json());
      setHistory(data);
    } catch { /* table not yet run */ }
    setLoadingHistory(false);
  }

  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab]);

  async function submit() {
    setSaving(true);
    await fetch('/api/checkins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false); setSaved(true);
    toast(saved ? 'Check-in updated' : 'Check-in submitted! 🎉');
    setTimeout(() => window.location.reload(), 800);
  }

  async function createTaskFromBlocker(blocker: string) {
    setCreatingTask(blocker);
    const res = await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `[Blocker] ${blocker}`, priority: 'high', status: 'blocked' }),
    });
    const data = await res.json();
    setCreatingTask(null);
    if (data.id) toast('Task created from blocker');
    else toast('Error creating task', 'error');
  }

  const avgMood = feed.filter(f => f.mood).length > 0
    ? (feed.reduce((s, f) => s + (f.mood ?? 0), 0) / feed.filter(f => f.mood).length).toFixed(1)
    : null;

  // Group history by date
  const byDate = history.reduce<Record<string, HistoryItem[]>>((acc, c) => {
    const d = c.checkin_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Daily Check-ins</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-neutral-500 text-sm">{checkedIn}/{teamSize} checked in today</p>
            {avgMood && <span className="text-sm text-neutral-400">Team mood: {moodEmoji(Number(avgMood))} {avgMood}/5</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-36 overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${teamSize ? (checkedIn / teamSize) * 100 : 0}%` }} />
          </div>
          <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
            <button onClick={() => setTab('today')} className={`px-3 py-1.5 text-xs font-medium ${tab === 'today' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`}>Today</button>
            <button onClick={() => setTab('history')} className={`px-3 py-1.5 text-xs font-medium ${tab === 'history' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50'}`}>History</button>
          </div>
        </div>
      </div>

      {tab === 'today' && (
        <>
          {/* My check-in form */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              Your check-in
              {saved && <span className="text-xs text-green-600 font-normal">✓ submitted</span>}
            </h2>

            <MoodPicker value={form.mood} onChange={v => setForm(f => ({ ...f, mood: v }))} />

            <div>
              <label className="text-xs font-medium text-neutral-500">What did you do yesterday?</label>
              <textarea value={form.yesterday ?? ''} onChange={e => setForm(f => ({ ...f, yesterday: e.target.value }))} rows={2}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">What will you do today?</label>
              <textarea value={form.today ?? ''} onChange={e => setForm(f => ({ ...f, today: e.target.value }))} rows={2}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Any blockers?</label>
              <input value={form.blockers ?? ''} onChange={e => setForm(f => ({ ...f, blockers: e.target.value }))} placeholder="None"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              {form.blockers && form.blockers.trim() && (
                <button onClick={() => createTaskFromBlocker(form.blockers!)}
                  disabled={creatingTask === form.blockers}
                  className="mt-1.5 text-xs text-amber-600 hover:text-amber-800">
                  {creatingTask === form.blockers ? 'Creating…' : '⚡ Create task from this blocker'}
                </button>
              )}
            </div>
            <button onClick={submit} disabled={saving}
              className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
              {saving ? 'Saving…' : saved ? 'Update check-in' : 'Submit check-in'}
            </button>
          </div>

          {/* Team feed */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Team — today</h2>
            <div className="space-y-3">
              {feed.length === 0
                ? <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-400">No check-ins yet today.</div>
                : feed.map(c => (
                  <div key={c.user_id} className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold uppercase">{c.name[0]}</div>
                      <span className="font-medium text-sm capitalize">{c.name}</span>
                      {c.mood && <span className="text-base" title={MOODS.find(m => m.val === c.mood)?.label}>{moodEmoji(c.mood)}</span>}
                      {c.blockers && <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">⚠ blocked</span>}
                    </div>
                    {c.today && <p className="mt-2 text-sm text-neutral-600"><span className="text-xs text-neutral-400">Today: </span>{c.today}</p>}
                    {c.blockers && (
                      <div className="mt-1 flex items-start gap-2">
                        <p className="flex-1 text-sm text-red-600"><span className="text-xs text-neutral-400">Blocker: </span>{c.blockers}</p>
                        <button onClick={() => createTaskFromBlocker(c.blockers!)} disabled={creatingTask === c.blockers}
                          className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                          {creatingTask === c.blockers ? '…' : '→ Task'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {loadingHistory && <p className="text-sm text-neutral-400">Loading history…</p>}
          {!loadingHistory && Object.keys(byDate).length === 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-400">No history yet.</div>
          )}
          {Object.entries(byDate).map(([date, items]) => (
            <div key={date}>
              <h3 className="mb-2 text-xs font-semibold text-neutral-400">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                <span className="ml-2 font-normal text-neutral-300">{items.length} check-in{items.length > 1 ? 's' : ''}</span>
              </h3>
              <div className="space-y-2">
                {items.map(c => (
                  <div key={c.user_id + date} className="rounded-xl border border-neutral-100 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold uppercase">{c.name?.[0]}</div>
                      <span className="font-medium text-sm">{c.name}</span>
                      {c.mood && <span className="text-base">{moodEmoji(c.mood)}</span>}
                      {c.blockers && <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">⚠ blocked</span>}
                    </div>
                    {c.today && <p className="mt-1.5 text-sm text-neutral-600">{c.today}</p>}
                    {c.blockers && <p className="mt-1 text-xs text-red-500">{c.blockers}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
