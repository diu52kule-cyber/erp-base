'use client';
import { useEffect, useState } from 'react';

type Webhook = { id: string; url: string; events: string[]; active: boolean; created_at: string; secret?: string };

const ALL_EVENTS = ['invoice.created', 'invoice.paid', 'invoice.sent', 'stock.low', 'employee.added', 'payment.recorded'];

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch('/api/settings/webhooks').then((r) => r.json()).then(setHooks); }, []);

  function toggleEvent(ev: string) {
    setEvents((e) => e.includes(ev) ? e.filter((x) => x !== ev) : [...e, ev]);
  }

  async function create() {
    if (!url || !events.length) return;
    setSaving(true);
    const res = await fetch('/api/settings/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, events }) });
    const data = await res.json();
    if (data.secret) { setNewSecret(data.secret); setHooks((h) => [data, ...h]); setUrl(''); setEvents([]); }
    setSaving(false);
  }

  async function remove(id: string) {
    await fetch('/api/settings/webhooks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setHooks((h) => h.filter((w) => w.id !== id));
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="mt-1 text-sm text-neutral-500">Receive real-time event notifications to your endpoint.</p>
      </div>

      {newSecret && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">Webhook created. Signing secret — save it now:</p>
          <code className="mt-2 block break-all font-mono text-sm text-blue-900">{newSecret}</code>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
        <div><label className="text-sm text-neutral-600">Endpoint URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-server.com/webhook"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></div>
        <div>
          <label className="text-sm text-neutral-600">Events to subscribe</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {ALL_EVENTS.map((ev) => (
              <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={events.includes(ev)} onChange={() => toggleEvent(ev)} />
                <code className="text-xs">{ev}</code>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={create} disabled={saving || !url || !events.length}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Webhook'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
            <th className="px-4 py-3 text-left font-medium">URL</th>
            <th className="px-4 py-3 text-left font-medium">Events</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {hooks.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-neutral-400">No webhooks yet</td></tr>
            ) : hooks.map((h) => (
              <tr key={h.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 font-mono text-xs truncate max-w-xs">{h.url}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">
                  {h.events.map((ev) => <span key={ev} className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{ev}</span>)}
                </div></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(h.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
