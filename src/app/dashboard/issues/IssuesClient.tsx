'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

type Issue = {
  id: string; title: string; severity: string; status: string; module: string | null;
  assignee_id: string | null; created_at: string; description: string | null;
  environment: string; priority: string; due_date: string | null;
};
type Member = { id: string; name: string };

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700', high: 'bg-amber-100 text-amber-700',
  medium: 'bg-blue-100 text-blue-700', low: 'bg-neutral-100 text-neutral-500',
};
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-50 text-red-700', in_progress: 'bg-amber-50 text-amber-700',
  resolved: 'bg-green-50 text-green-700', closed: 'bg-neutral-100 text-neutral-500',
};
const ENV_COLORS: Record<string, string> = {
  production: 'bg-red-50 text-red-600', staging: 'bg-amber-50 text-amber-600',
  dev: 'bg-blue-50 text-blue-600', all: 'bg-neutral-50 text-neutral-500',
};

const TEMPLATES: { label: string; icon: string; severity: string; priority: string; fill: { title: string; description: string } }[] = [
  {
    label: 'Bug', icon: '🐛', severity: 'high', priority: 'high',
    fill: { title: '[Bug] ', description: '**Steps to reproduce:**\n1. \n2. \n\n**Expected:** \n\n**Actual:** \n\n**Environment:** ' },
  },
  {
    label: 'Feature', icon: '✨', severity: 'low', priority: 'medium',
    fill: { title: '[Feature] ', description: '**Problem it solves:**\n\n**Proposed solution:**\n\n**Acceptance criteria:**\n- [ ] ' },
  },
  {
    label: 'UX', icon: '🎨', severity: 'medium', priority: 'medium',
    fill: { title: '[UX] ', description: '**What\'s confusing or broken:**\n\n**User impact:**\n\n**Suggested fix:**' },
  },
  {
    label: 'Security', icon: '🔒', severity: 'critical', priority: 'critical',
    fill: { title: '[Security] ', description: '**Vulnerability type:**\n\n**Impact:**\n\n**Steps to reproduce (if safe to share):**\n\n**Suggested mitigation:**' },
  },
];

type FormState = {
  title: string; description: string; severity: string; priority: string;
  assignee_id: string; environment: string; due_date: string;
};

const EMPTY: FormState = { title: '', description: '', severity: 'medium', priority: 'medium', assignee_id: '', environment: 'all', due_date: '' };

function IssueDetail({ issue, members, onClose, onUpdate }: {
  issue: Issue; members: Member[]; onClose: () => void; onUpdate: (id: string, patch: Partial<Issue>) => void;
}) {
  const [form, setForm] = useState<FormState>({
    title: issue.title, description: issue.description ?? '',
    severity: issue.severity, priority: issue.priority,
    assignee_id: issue.assignee_id ?? '', environment: issue.environment,
    due_date: issue.due_date ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/issues/${issue.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null, description: form.description || null }),
    });
    onUpdate(issue.id, { ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null });
    setSaving(false); toast('Saved');
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEV_COLORS[issue.severity]}`}>{issue.severity}</span>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-neutral-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-500">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="Describe the issue…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500">Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                {['critical', 'high', 'medium', 'low'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                {['critical', 'high', 'medium', 'low'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Environment</label>
              <select value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                <option value="all">All</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="dev">Dev</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500">Assignee</label>
              <select value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-neutral-500">Due date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={save} disabled={saving}
            className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save changes'}
          </button>

          <div className="border-t border-neutral-100 pt-3">
            <p className="text-xs text-neutral-400">Reported {new Date(issue.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IssuesClient({ initial, members }: { initial: Issue[]; members: Member[] }) {
  const [issues, setIssues] = useState<Issue[]>(initial);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [filterStatus, setFilterStatus] = useState('open');

  function applyTemplate(tpl: typeof TEMPLATES[0]) {
    setForm(f => ({ ...f, ...tpl.fill, severity: tpl.severity, priority: tpl.priority }));
    setShowForm(true);
  }

  async function add() {
    if (!form.title.trim()) return;
    setBusy(true);
    const res = await fetch('/api/issues', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null, description: form.description || null }),
    });
    const data = await res.json(); setBusy(false);
    if (data.id) {
      setIssues(x => [{ id: data.id, ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null, description: form.description || null, module: null, status: 'open', created_at: new Date().toISOString() }, ...x]);
      setForm(EMPTY); setShowForm(false); toast('Issue reported');
    } else toast(data.error ?? 'Error', 'error');
  }

  async function setStatus(id: string, status: string) {
    setIssues(x => x.map(i => i.id === id ? { ...i, status } : i));
    await fetch(`/api/issues/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  }

  const name = (id: string | null) => members.find(m => m.id === id)?.name ?? '—';
  const visible = filterStatus === 'all' ? issues : issues.filter(i => filterStatus === 'open' ? (i.status === 'open' || i.status === 'in_progress') : i.status === filterStatus);
  const openCount = issues.filter(i => i.status === 'open' || i.status === 'in_progress').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Issues & Bugs</h1>
          <p className="text-neutral-500 mt-1 text-sm">{openCount} open · {issues.length} total</p>
        </div>
        <button onClick={() => setShowForm(o => !o)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
          {showForm ? 'Cancel' : '+ Report issue'}
        </button>
      </div>

      {/* Templates */}
      <div>
        <p className="mb-2 text-xs font-medium text-neutral-500">Quick templates</p>
        <div className="flex gap-2 flex-wrap">
          {TEMPLATES.map(tpl => (
            <button key={tpl.label} onClick={() => applyTemplate(tpl)}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 transition-colors">
              <span>{tpl.icon}</span> {tpl.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${SEV_COLORS[tpl.severity]}`}>{tpl.severity}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Report form */}
      {showForm && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">Report issue</h3>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Issue title…" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" autoFocus />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4}
            placeholder="Description, steps to reproduce, expected vs actual…" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono" />
          <div className="flex gap-2 flex-wrap">
            <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              {['critical', 'high', 'medium', 'low'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              <option value="all">All envs</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="dev">Dev</option>
            </select>
            <select value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setForm(EMPTY); }} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm">Cancel</button>
            <button onClick={add} disabled={busy || !form.title.trim()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
              {busy ? 'Reporting…' : 'Report'}
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-2">
        {[{ val: 'open', label: 'Open' }, { val: 'resolved', label: 'Resolved' }, { val: 'closed', label: 'Closed' }, { val: 'all', label: 'All' }].map(f => (
          <button key={f.val} onClick={() => setFilterStatus(f.val)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterStatus === f.val ? 'bg-neutral-900 text-white' : 'border border-neutral-200 hover:bg-neutral-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Issues table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {visible.length === 0 ? <div className="p-10 text-center text-sm text-neutral-400">No issues here. 🎉</div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
              <th className="px-4 py-2.5 text-left font-medium">Issue</th>
              <th className="px-4 py-2.5 text-left font-medium">Severity</th>
              <th className="px-4 py-2.5 text-left font-medium">Env</th>
              <th className="px-4 py-2.5 text-left font-medium">Assignee</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-left font-medium">Due</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.map(i => (
                <tr key={i.id} onClick={() => setSelected(i)} className="cursor-pointer hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{i.title}</div>
                    {i.description && <div className="text-xs text-neutral-400 mt-0.5 truncate max-w-[280px]">{i.description.slice(0, 60)}…</div>}
                  </td>
                  <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEV_COLORS[i.severity]}`}>{i.severity}</span></td>
                  <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs ${ENV_COLORS[i.environment]}`}>{i.environment}</span></td>
                  <td className="px-4 py-2.5 text-neutral-500">{name(i.assignee_id)}</td>
                  <td className="px-4 py-2.5">
                    <select value={i.status} onChange={e => { e.stopPropagation(); setStatus(i.id, e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[i.status]}`}>
                      {['open', 'in_progress', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {i.due_date ? (
                      <span className={new Date(i.due_date) < new Date() && i.status !== 'resolved' && i.status !== 'closed' ? 'text-red-500' : 'text-neutral-400'}>
                        {new Date(i.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <IssueDetail
          issue={selected}
          members={members}
          onClose={() => setSelected(null)}
          onUpdate={(id, patch) => {
            setIssues(x => x.map(i => i.id === id ? { ...i, ...patch } : i));
            setSelected(s => s ? { ...s, ...patch } as Issue : null);
          }}
        />
      )}
    </div>
  );
}
