'use client';

import { useEffect, useState } from 'react';

type Outlet = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  code: string | null;
  status: 'active' | 'inactive';
  created_at: string;
};

type FormState = { name: string; address: string; phone: string; code: string; status: 'active' | 'inactive' };
const EMPTY: FormState = { name: '', address: '', phone: '', code: '', status: 'active' };

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Outlet | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/outlets');
      const data = await res.json();
      setOutlets(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setShowForm(true);
  }

  function openEdit(o: Outlet) {
    setEditing(o);
    setForm({ name: o.name, address: o.address ?? '', phone: o.phone ?? '', code: o.code ?? '', status: o.status });
    setError(null);
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError(null);
    try {
      const url = editing ? `/api/outlets/${editing.id}` : '/api/outlets';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSaving(false); return; }
      await load();
      setShowForm(false);
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm('Delete this outlet? This cannot be undone.')) return;
    await fetch(`/api/outlets/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Outlets</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage your business locations / branches</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
          + Add Outlet
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : outlets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-neutral-500">No outlets yet</p>
          <p className="mt-1 text-sm text-neutral-400">Add locations to track inventory and revenue per branch</p>
          <button onClick={openCreate} className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
            Add your first outlet
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Outlet</th>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Address</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {outlets.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium">{o.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">{o.code ?? '—'}</td>
                  <td className="px-4 py-3 text-neutral-600">{o.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-neutral-500 max-w-xs truncate">{o.address ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(o)} className="text-xs text-neutral-500 hover:text-neutral-900">Edit</button>
                      <button onClick={() => remove(o.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">{editing ? 'Edit Outlet' : 'Add Outlet'}</h2>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            {[
              { label: 'Outlet Name *', key: 'name', placeholder: 'e.g. Koregaon Park Branch' },
              { label: 'Short Code', key: 'code', placeholder: 'e.g. KP-1' },
              { label: 'Phone', key: 'phone', placeholder: '' },
              { label: 'Address', key: 'address', placeholder: '' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-neutral-500 mb-1">{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm">
                Cancel
              </button>
              <button onClick={save} disabled={saving} className="flex-[2] rounded-xl bg-neutral-900 py-2.5 text-sm text-white disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Outlet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
