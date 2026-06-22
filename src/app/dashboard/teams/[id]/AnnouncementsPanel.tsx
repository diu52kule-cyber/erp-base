'use client';

import { useEffect, useState } from 'react';

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
};

export default function AnnouncementsPanel({ teamId, canPost }: { teamId: string; canPost: boolean }) {
  const [items, setItems]   = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ title: '', body: '', pinned: false });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/announcements?team_id=${teamId}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [teamId]);

  async function handlePost() {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, team_id: teamId }),
    });
    setSaving(false);
    setForm({ title: '', body: '', pinned: false });
    setAdding(false);
    load();
  }

  async function togglePin(item: Announcement) {
    await fetch('/api/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, pinned: !item.pinned }),
    });
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this announcement?')) return;
    await fetch('/api/announcements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const pinned = items.filter((a) => a.pinned);
  const rest   = items.filter((a) => !a.pinned);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Announcements</h2>
        {canPost && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            {adding ? 'Cancel' : '+ Post'}
          </button>
        )}
      </div>

      {adding && (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <textarea
            placeholder="Body (optional)"
            rows={3}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
              Pin to top
            </label>
            <button
              onClick={handlePost}
              disabled={saving || !form.title.trim()}
              className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-400">No announcements yet.{canPost ? ' Post one to keep the team informed.' : ''}</p>
      ) : (
        <div className="space-y-3">
          {[...pinned, ...rest].map((item) => (
            <div key={item.id} className={`rounded-xl border p-4 ${item.pinned ? 'border-amber-200 bg-amber-50' : 'border-neutral-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {item.pinned && <span className="text-amber-500 text-sm">📌</span>}
                  <p className="font-medium text-sm">{item.title}</p>
                </div>
                {canPost && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => togglePin(item)} className="text-xs text-neutral-400 hover:text-amber-600 px-1" title={item.pinned ? 'Unpin' : 'Pin'}>
                      {item.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="text-xs text-neutral-400 hover:text-red-600 px-1">Delete</button>
                  </div>
                )}
              </div>
              {item.body && <p className="mt-1.5 text-sm text-neutral-600 whitespace-pre-line">{item.body}</p>}
              <p className="mt-2 text-xs text-neutral-400">{new Date(item.created_at).toLocaleDateString('en-IN')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
