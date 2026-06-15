'use client';
import { useState } from 'react';

export default function NewProjectForm({ contacts }: { contacts: { id: string; name: string }[] }) {
  const [form, setForm] = useState({ name: '', client_id: '', budget: '', deadline: '', description: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    const res  = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, client_id: form.client_id || null, budget: form.budget || null,
        deadline: form.deadline || null, description: form.description || null, status: form.status }) });
    const data = await res.json();
    if (data.error) { setError(data.error); setSaving(false); }
    else window.location.href = `/dashboard/projects/${data.id}`;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {[['Project Name *', 'name', 'text'], ['Budget (₹)', 'budget', 'number'], ['Deadline', 'deadline', 'date']].map(([label, key, type]) => (
        <div key={key}>
          <label className="text-sm text-neutral-600">{label}</label>
          <input type={type} value={(form as any)[key]} onChange={(e) => set(key, e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
      ))}
      <div>
        <label className="text-sm text-neutral-600">Client</label>
        <select value={form.client_id} onChange={(e) => set('client_id', e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
          <option value="">No client</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm text-neutral-600">Description</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3}
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
      </div>
      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {saving ? 'Creating…' : 'Create Project'}
        </button>
      </div>
    </div>
  );
}
