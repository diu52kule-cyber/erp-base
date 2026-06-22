'use client';

import { useEffect, useState } from 'react';

type Comment = {
  id: string;
  body: string;
  created_by: string;
  created_at: string;
};

type Props = {
  entityType: string;
  entityId: string;
  currentUserId: string;
  canDelete?: boolean;
};

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
    else { setBody(''); setComments((prev) => [...prev, data]); }
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
