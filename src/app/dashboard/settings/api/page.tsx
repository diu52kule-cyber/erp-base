'use client';
import { useEffect, useState } from 'react';

type ApiKey = { id: string; name: string; key_prefix: string; active: boolean; created_at: string; key?: string };

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch('/api/settings/api-keys').then((r) => r.json()).then(setKeys); }, []);

  async function generate() {
    if (!name) return;
    setSaving(true);
    const res = await fetch('/api/settings/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const data = await res.json();
    if (data.key) { setNewKey(data.key); setKeys((k) => [data, ...k]); setName(''); }
    setSaving(false);
  }

  async function revoke(id: string) {
    await fetch('/api/settings/api-keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setKeys((k) => k.map((key) => key.id === id ? { ...key, active: false } : key));
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">API Keys</h1>
        <p className="mt-1 text-sm text-neutral-500">Use API keys to access <code className="font-mono text-xs">/api/v1/</code> endpoints programmatically.</p>
      </div>

      {newKey && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">New API key created — copy it now, it won&apos;t be shown again.</p>
          <code className="mt-2 block break-all font-mono text-sm text-green-900">{newKey}</code>
          <button onClick={() => { navigator.clipboard.writeText(newKey); }} className="mt-2 text-xs text-green-700 underline">Copy to clipboard</button>
        </div>
      )}

      <div className="flex gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name (e.g. Zapier Integration)"
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm" onKeyDown={(e) => e.key === 'Enter' && generate()} />
        <button onClick={generate} disabled={saving || !name}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          {saving ? 'Generating…' : 'Generate Key'}
        </button>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-left font-medium">Prefix</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Created</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {keys.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No API keys yet</td></tr>
            ) : keys.map((k) => (
              <tr key={k.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">{k.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{k.key_prefix}…</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${k.active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}>
                    {k.active ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500 text-xs">{new Date(k.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  {k.active && (
                    <button onClick={() => revoke(k.id)} className="text-xs text-red-600 hover:underline">Revoke</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <h3 className="text-sm font-medium">API Reference</h3>
        <div className="mt-2 space-y-1 text-xs font-mono text-neutral-600">
          <div>GET /api/v1/invoices</div>
          <div>GET /api/v1/contacts</div>
          <div>GET /api/v1/products</div>
        </div>
        <p className="mt-2 text-xs text-neutral-500">Pass your key as: <code className="font-mono">Authorization: Bearer erpk_...</code></p>
      </div>
    </div>
  );
}
