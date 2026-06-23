'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

type Release = { id: string; version: string; title: string | null; notes: string | null; status: string; released_at: string | null; created_at: string };
type LinkedItem = { id: string; entity_type: 'task' | 'issue'; entity_id: string; label: string; status: string };

const STATUS_OPTIONS = ['planned', 'in_progress', 'staged', 'released', 'rolled_back'];
const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-neutral-100 text-neutral-600',
  in_progress: 'bg-blue-50 text-blue-700',
  staged: 'bg-purple-50 text-purple-700',
  released: 'bg-green-50 text-green-700',
  rolled_back: 'bg-red-50 text-red-700',
};

type SearchResult = { id: string; entity_type: 'task' | 'issue'; title: string; status: string };

export default function ReleasesClient({ initial, tasks, issues }: {
  initial: Release[];
  tasks: { id: string; title: string; status: string }[];
  issues: { id: string; title: string; status: string }[];
}) {
  const [items, setItems] = useState<Release[]>(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ version: '', title: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [linkedItems, setLinkedItems] = useState<Record<string, LinkedItem[]>>({});
  const [linkSearch, setLinkSearch] = useState('');
  const [editNotes, setEditNotes] = useState<string | null>(null);

  async function add() {
    if (!form.version.trim()) return;
    setBusy(true);
    const res = await fetch('/api/releases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json(); setBusy(false);
    if (data.id) {
      setItems(x => [{ id: data.id, version: form.version, title: form.title || null, notes: form.notes || null, status: 'planned', released_at: null, created_at: new Date().toISOString() }, ...x]);
      setForm({ version: '', title: '', notes: '' }); setOpen(false); toast('Release created');
    }
  }

  async function setStatus(id: string, status: string) {
    setItems(x => x.map(r => r.id === id ? { ...r, status, released_at: status === 'released' ? new Date().toISOString().split('T')[0] : r.released_at } : r));
    await fetch('/api/releases', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
  }

  async function saveNotes(id: string, notes: string) {
    setItems(x => x.map(r => r.id === id ? { ...r, notes } : r));
    setEditNotes(null);
    await fetch('/api/releases', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, notes }) });
    toast('Notes saved');
  }

  async function loadLinkedItems(releaseId: string) {
    if (linkedItems[releaseId]) return;
    try {
      const data = await fetch(`/api/release-items?release_id=${releaseId}`).then(r => r.json());
      const enriched: LinkedItem[] = data.map((d: any) => {
        const source = d.entity_type === 'task' ? tasks : issues;
        const found = source.find(x => x.id === d.entity_id);
        return { id: d.id, entity_type: d.entity_type, entity_id: d.entity_id, label: found?.title ?? d.entity_id, status: found?.status ?? '—' };
      });
      setLinkedItems(prev => ({ ...prev, [releaseId]: enriched }));
    } catch { setLinkedItems(prev => ({ ...prev, [releaseId]: [] })); }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    await loadLinkedItems(id);
  }

  async function linkItem(releaseId: string, result: SearchResult) {
    await fetch('/api/release-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ release_id: releaseId, entity_type: result.entity_type, entity_id: result.id }),
    });
    setLinkedItems(prev => ({
      ...prev,
      [releaseId]: [...(prev[releaseId] ?? []), { id: Date.now().toString(), entity_type: result.entity_type, entity_id: result.id, label: result.title, status: result.status }],
    }));
    setLinkSearch('');
    toast('Linked');
  }

  async function unlinkItem(releaseId: string, itemId: string) {
    await fetch('/api/release-items', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: itemId }) });
    setLinkedItems(prev => ({ ...prev, [releaseId]: (prev[releaseId] ?? []).filter(x => x.id !== itemId) }));
  }

  function autoDraftNotes(releaseId: string) {
    const linked = linkedItems[releaseId] ?? [];
    if (linked.length === 0) { toast('No linked items — link tasks/issues first', 'error'); return; }
    const taskLines = linked.filter(x => x.entity_type === 'task').map(x => `- ${x.label}`).join('\n');
    const issueLines = linked.filter(x => x.entity_type === 'issue').map(x => `- ${x.label}`).join('\n');
    const draft = [taskLines && `### Tasks\n${taskLines}`, issueLines && `### Issues Fixed\n${issueLines}`].filter(Boolean).join('\n\n');
    setEditNotes(draft);
    toast('Draft generated — edit and save');
  }

  const allSearchable: SearchResult[] = [
    ...tasks.map(t => ({ id: t.id, entity_type: 'task' as const, title: t.title, status: t.status })),
    ...issues.map(i => ({ id: i.id, entity_type: 'issue' as const, title: i.title, status: i.status })),
  ];
  const searchResults = linkSearch.trim().length > 1
    ? allSearchable.filter(x => x.title.toLowerCase().includes(linkSearch.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Releases</h1>
          <p className="text-neutral-500 mt-1 text-sm">{items.filter(r => r.status === 'released').length} shipped · {items.filter(r => r.status === 'planned' || r.status === 'in_progress').length} in progress</p>
        </div>
        <button onClick={() => setOpen(o => !o)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">+ New release</button>
      </div>

      {open && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="v2.4.1" className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono" />
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title (optional)" className="rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={4}
            placeholder={"What shipped?\n- Fixed POS printer bug\n- Added GST report export"} className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm">Cancel</button>
            <button onClick={add} disabled={busy || !form.version.trim()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 ? <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-400">No releases yet.</div> :
          items.map(r => {
            const linked = linkedItems[r.id] ?? [];
            const isExpanded = expandedId === r.id;
            const editingNotes = editNotes !== null && isExpanded;

            return (
              <div key={r.id} className="rounded-xl border border-neutral-200 bg-white">
                {/* Header */}
                <div className="flex items-center gap-3 p-4">
                  <span className="font-mono font-bold text-lg">{r.version}</span>
                  {r.title && <span className="text-sm text-neutral-600">{r.title}</span>}
                  <select value={r.status} onChange={e => setStatus(r.id, e.target.value)}
                    className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? STATUS_COLORS['planned']}`}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  {r.released_at && <span className="text-xs text-neutral-400 ml-auto">Released {new Date(r.released_at).toLocaleDateString('en-IN')}</span>}
                  <button onClick={() => toggleExpand(r.id)} className="ml-auto rounded-lg border border-neutral-200 px-3 py-1 text-xs hover:bg-neutral-50">
                    {isExpanded ? 'Collapse' : `Items${linked.length ? ` (${linked.length})` : ''}`}
                  </button>
                </div>

                {/* Notes */}
                {r.notes && !isExpanded && <pre className="px-4 pb-4 whitespace-pre-wrap font-sans text-sm text-neutral-600">{r.notes}</pre>}

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 p-4 space-y-4">
                    {/* Notes editor */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-neutral-500">Release notes</h4>
                        <div className="flex gap-2">
                          <button onClick={() => autoDraftNotes(r.id)} className="text-xs text-blue-600 hover:text-blue-800">⚡ Auto-draft from linked</button>
                          {!editingNotes && <button onClick={() => setEditNotes(r.notes ?? '')} className="text-xs text-neutral-500 hover:text-neutral-700">Edit</button>}
                        </div>
                      </div>
                      {editingNotes ? (
                        <div className="space-y-2">
                          <textarea value={editNotes ?? ''} onChange={e => setEditNotes(e.target.value)} rows={6}
                            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono" />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditNotes(null)} className="text-xs text-neutral-500">Cancel</button>
                            <button onClick={() => saveNotes(r.id, editNotes ?? '')} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white">Save</button>
                          </div>
                        </div>
                      ) : (
                        r.notes ? <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-600">{r.notes}</pre>
                          : <p className="text-sm text-neutral-400 italic">No notes yet. Click Edit or Auto-draft.</p>
                      )}
                    </div>

                    {/* Linked items */}
                    <div>
                      <h4 className="mb-2 text-xs font-semibold text-neutral-500">Linked tasks & issues</h4>
                      {linked.length === 0 && <p className="text-sm text-neutral-400">No items linked yet.</p>}
                      <div className="space-y-1.5">
                        {linked.map(item => (
                          <div key={item.id} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                            <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${item.entity_type === 'task' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>{item.entity_type}</span>
                            <span className="flex-1">{item.label}</span>
                            <span className="text-xs text-neutral-400">{item.status}</span>
                            <button onClick={() => unlinkItem(r.id, item.id)} className="text-neutral-300 hover:text-red-400 text-xs">✕</button>
                          </div>
                        ))}
                      </div>

                      {/* Link search */}
                      <div className="relative mt-2">
                        <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)} placeholder="Search tasks or issues to link…"
                          className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
                        {searchResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full rounded-xl border border-neutral-200 bg-white shadow-lg">
                            {searchResults.map(result => (
                              <button key={result.id} onClick={() => linkItem(r.id, result)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 first:rounded-t-xl last:rounded-b-xl">
                                <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${result.entity_type === 'task' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>{result.entity_type}</span>
                                <span className="flex-1 text-left">{result.title}</span>
                                <span className="text-xs text-neutral-400">{result.status}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
