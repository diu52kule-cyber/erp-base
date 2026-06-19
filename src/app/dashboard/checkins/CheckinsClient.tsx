'use client';
import { useState } from 'react';

type Checkin = { yesterday: string | null; today: string | null; blockers: string | null };
type FeedItem = Checkin & { name: string; user_id: string; created_at: string };

export default function CheckinsClient({ mine, feed, checkedIn, teamSize }:
  { mine: Checkin | null; feed: FeedItem[]; checkedIn: number; teamSize: number }) {

  const [form, setForm] = useState<Checkin>({ yesterday: mine?.yesterday ?? '', today: mine?.today ?? '', blockers: mine?.blockers ?? '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!mine);

  async function submit() {
    setSaving(true);
    await fetch('/api/checkins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false); setSaved(true);
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily Check-ins</h1>
          <p className="text-neutral-500 mt-1 text-sm">{checkedIn}/{teamSize} checked in today</p>
        </div>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-green-500" style={{ width: `${teamSize ? (checkedIn / teamSize) * 100 : 0}%` }} />
        </div>
      </div>

      {/* My check-in */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">Your check-in {saved && <span className="text-xs text-green-600">✓ submitted</span>}</h2>
        <div>
          <label className="text-xs font-medium text-neutral-500">What did you do yesterday?</label>
          <textarea value={form.yesterday ?? ''} onChange={(e) => setForm({ ...form, yesterday: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500">What will you do today?</label>
          <textarea value={form.today ?? ''} onChange={(e) => setForm({ ...form, today: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500">Any blockers?</label>
          <input value={form.blockers ?? ''} onChange={(e) => setForm({ ...form, blockers: e.target.value })} placeholder="None" className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        </div>
        <button onClick={submit} disabled={saving} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {saving ? 'Saving…' : saved ? 'Update check-in' : 'Submit check-in'}
        </button>
      </div>

      {/* Team feed */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">Team — today</h2>
        <div className="space-y-3">
          {feed.length === 0 ? <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-400">No check-ins yet today.</div> :
            feed.map((c) => (
              <div key={c.user_id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold uppercase">{c.name[0]}</div>
                  <span className="font-medium text-sm capitalize">{c.name}</span>
                  {c.blockers && <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">⚠ blocked</span>}
                </div>
                {c.today && <p className="mt-2 text-sm text-neutral-600"><span className="text-neutral-400">Today:</span> {c.today}</p>}
                {c.blockers && <p className="mt-1 text-sm text-red-600"><span className="text-neutral-400">Blocker:</span> {c.blockers}</p>}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
