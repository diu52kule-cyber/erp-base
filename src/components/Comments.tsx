'use client';

import { useEffect, useState } from 'react';

type Reaction = { emoji: string; user_id: string };

type Comment = {
  id: string;
  body: string;
  created_by: string;
  created_at: string;
  reactions?: Reaction[];
};

type Props = {
  entityType: string;
  entityId: string;
  currentUserId: string;
  canDelete?: boolean;
};

const EMOJIS = ['👍', '✅', '👀', '❤️', '🎉'];

function ReactionBar({ comment, currentUserId }: { comment: Comment; currentUserId: string }) {
  const [reactions, setReactions] = useState<Reaction[]>(comment.reactions ?? []);

  async function toggle(emoji: string) {
    const res = await fetch(`/api/comments/${comment.id}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    });
    const data = await res.json();
    if (data.error) return;
    setReactions((prev) =>
      data.toggled
        ? [...prev, { emoji, user_id: currentUserId }]
        : prev.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId))
    );
  }

  // Count per emoji
  const counts: Record<string, { count: number; mine: boolean }> = {};
  for (const r of reactions) {
    if (!counts[r.emoji]) counts[r.emoji] = { count: 0, mine: false };
    counts[r.emoji].count++;
    if (r.user_id === currentUserId) counts[r.emoji].mine = true;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {/* Active reactions */}
      {Object.entries(counts).map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          onClick={() => toggle(emoji)}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
            mine ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          {emoji} {count}
        </button>
      ))}
      {/* Emoji picker */}
      <div className="relative group">
        <button className="inline-flex items-center justify-center w-6 h-6 rounded-full text-neutral-300 hover:text-neutral-500 hover:bg-neutral-100 text-xs">
          +
        </button>
        <div className="absolute bottom-7 left-0 z-10 hidden group-hover:flex gap-0.5 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => toggle(emoji)}
              className="rounded px-1 py-0.5 text-sm hover:bg-neutral-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Comments({ entityType, entityId, currentUserId, canDelete = false }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/comments?entity_type=${entityType}&entity_id=${entityId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch { /* table may not exist yet */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, [entityType, entityId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true); setError(null);
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, body }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); }
    else { setBody(''); setComments((prev) => [...prev, { ...data, reactions: [] }]); }
    setSubmitting(false);
  }

  async function deleteComment(id: string) {
    if (!confirm('Delete this comment?')) return;
    await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
      <h2 className="font-medium">Comments</h2>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : (
        <div className="space-y-3">
          {comments.length === 0 && (
            <p className="text-sm text-neutral-400">No comments yet. Be the first.</p>
          )}
          {comments.map((c) => {
            const isOwn = c.created_by === currentUserId;
            return (
              <div key={c.id} className="flex gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600">
                  {isOwn ? 'Y' : '?'}
                </div>
                <div className="flex-1 rounded-lg bg-neutral-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-600">{isOwn ? 'You' : 'Team member'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">
                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {(isOwn || canDelete) && (
                        <button onClick={() => deleteComment(c.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 text-sm text-neutral-800 whitespace-pre-wrap">{c.body}</p>
                  <ReactionBar comment={c} currentUserId={currentUserId} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={submit} className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e as any);
          }}
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="self-end rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          {submitting ? '…' : 'Post'}
        </button>
      </form>
      <p className="text-xs text-neutral-400">Ctrl+Enter to post · visible to all org members</p>
    </div>
  );
}
