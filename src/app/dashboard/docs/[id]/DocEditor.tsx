'use client';
import { useState } from 'react';

type Doc = { id: string; title: string; content: string; icon: string; status: string };
type Version = { id: string; title: string; created_at: string };

export default function DocEditor({ doc, versions }: { doc: Doc; versions: Version[] }) {
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content ?? '');
  const [status, setStatus] = useState(doc.status);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  async function save() {
    setSaving(true); setSaved(false);
    await fetch(`/api/docs/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, status, snapshot: true }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function remove() {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    await fetch(`/api/docs/${doc.id}`, { method: 'DELETE' });
    window.location.href = '/dashboard/docs';
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-neutral-200 px-2 py-1 text-xs">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <button onClick={() => setPreview((p) => !p)}
          className="rounded-md border border-neutral-200 px-3 py-1 text-xs hover:bg-neutral-50">
          {preview ? 'Edit' : 'Preview'}
        </button>
        <button onClick={() => setShowHistory((h) => !h)}
          className="rounded-md border border-neutral-200 px-3 py-1 text-xs hover:bg-neutral-50">
          History ({versions.length})
        </button>
        <div className="ml-auto flex items-center gap-2">
          {saved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
          <button onClick={remove} className="rounded-md border border-neutral-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
          <button onClick={save} disabled={saving}
            className="rounded-md bg-neutral-900 px-4 py-1 text-xs text-white hover:bg-neutral-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex">
        <div className="flex-1 p-6">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full border-0 p-0 text-2xl font-bold focus:outline-none focus:ring-0 bg-transparent" />
          {preview ? (
            <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{content || 'Nothing to preview.'}</div>
          ) : (
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing… (Markdown supported)"
              className="mt-4 min-h-[55vh] w-full resize-none border-0 p-0 font-mono text-sm leading-relaxed focus:outline-none focus:ring-0 bg-transparent" />
          )}
        </div>

        {showHistory && (
          <aside className="w-64 shrink-0 border-l border-neutral-100 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Version history</h3>
            {versions.length === 0 ? (
              <p className="text-xs text-neutral-400">No previous versions yet. Each save creates a snapshot.</p>
            ) : (
              <ul className="space-y-2">
                {versions.map((v) => (
                  <li key={v.id} className="text-xs">
                    <div className="font-medium truncate">{v.title}</div>
                    <div className="text-neutral-400">{new Date(v.created_at).toLocaleString('en-IN')}</div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
