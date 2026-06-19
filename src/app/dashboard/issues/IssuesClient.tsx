'use client';
import { useState } from 'react';

type Issue = { id: string; title: string; severity: string; status: string; module: string | null; assignee_id: string | null; created_at: string };
type Member = { id: string; name: string };

const SEV: Record<string, string> = {
  critical: 'bg-red-50 text-red-700', high: 'bg-amber-50 text-amber-700',
  medium: 'bg-blue-50 text-blue-700', low: 'bg-neutral-100 text-neutral-500',
};
const STATUS = ['open', 'in_progress', 'resolved', 'closed'];
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-50 text-red-700', in_progress: 'bg-amber-50 text-amber-700',
  resolved: 'bg-green-50 text-green-700', closed: 'bg-neutral-100 text-neutral-500',
};

export default function IssuesClient({ initial, members }: { initial: Issue[]; members: Member[] }) {
  const [issues, setIssues] = useState<Issue[]>(initial);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState(false);

  const name = (id: string | null) => members.find((m) => m.id === id)?.name ?? '—';

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch('/api/issues', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, severity, assignee_id: assignee || null }) });
    const data = await res.json(); setBusy(false);
    if (data.id) { setIssues((x) => [{ id: data.id, title, severity, status: 'open', module: null, assignee_id: assignee || null, created_at: new Date().toISOString() }, ...x]); setTitle(''); }
  }
  async function setStatus(id: string, status: string) {
    setIssues((x) => x.map((i) => i.id === id ? { ...i, status } : i));
    await fetch(`/api/issues/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  }

  const open = issues.filter((i) => i.status !== 'closed' && i.status !== 'resolved').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Issues & Bugs</h1>
        <p className="text-neutral-500 mt-1 text-sm">{open} open · {issues.length} total</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 flex-wrap">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Report an issue…" className="flex-1 min-w-[200px] rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
          <option value="critical">Critical</option><option value="high">High</option>
          <option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button onClick={add} disabled={busy || !title.trim()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">Report</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {issues.length === 0 ? <div className="p-10 text-center text-sm text-neutral-400">No issues. 🎉</div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
              <th className="px-4 py-2.5 text-left font-medium">Issue</th>
              <th className="px-4 py-2.5 text-left font-medium">Severity</th>
              <th className="px-4 py-2.5 text-left font-medium">Assignee</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {issues.map((i) => (
                <tr key={i.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2.5 font-medium">{i.title}</td>
                  <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEV[i.severity]}`}>{i.severity}</span></td>
                  <td className="px-4 py-2.5 text-neutral-500">{name(i.assignee_id)}</td>
                  <td className="px-4 py-2.5">
                    <select value={i.status} onChange={(e) => setStatus(i.id, e.target.value)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 ${STATUS_COLORS[i.status]}`}>
                      {STATUS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
