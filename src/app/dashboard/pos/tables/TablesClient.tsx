'use client';

import { useState } from 'react';

type PosTable = { id: string; name: string; status: 'free' | 'occupied'; qr_token?: string | null };

export default function TablesClient({ initialTables }: { initialTables: PosTable[] }) {
  const [tables, setTables] = useState<PosTable[]>(initialTables);
  const [newName, setNewName] = useState('');
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState<string | null>(null);

  async function add() {
    if (!newName.trim()) return;
    setAdding(true); setError(null);
    const res  = await fetch('/api/pos/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    setAdding(false);
    if (data.error) { setError(data.error); return; }
    setTables((t) => [...t, data]);
    setNewName('');
  }

  async function remove(id: string) {
    if (!confirm('Delete this table?')) return;
    await fetch('/api/pos/tables', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setTables((t) => t.filter((x) => x.id !== id));
  }

  async function rename(id: string, current: string) {
    const name = prompt('New table name:', current);
    if (!name || name === current) return;
    const res  = await fetch('/api/pos/tables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
    const data = await res.json();
    if (!data.error) setTables((t) => t.map((x) => x.id === id ? { ...x, name: data.name } : x));
  }

  function copyQRLink(token: string, tableId: string) {
    const url = `${window.location.origin}/order/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(tableId);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function openQRLink(token: string) {
    window.open(`/order/${token}`, '_blank');
  }

  return (
    <div className="space-y-6">
      {/* Add table */}
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Table name (e.g. Table 1, Counter, T3)"
          className="flex-1 max-w-xs rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <button
          onClick={add}
          disabled={adding || !newName.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {adding ? 'Adding…' : '+ Add Table'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {tables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center text-neutral-400">
          <p className="text-sm">No tables set up yet.</p>
          <p className="mt-1 text-xs">Add tables above to enable table selection in POS.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {tables.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border p-4 text-center ${
                t.status === 'occupied'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <p className="font-medium">{t.name}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                t.status === 'occupied' ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-700'
              }`}>
                {t.status === 'occupied' ? 'Occupied' : 'Free'}
              </span>

              {/* QR ordering link */}
              {t.qr_token && (
                <div className="mt-2 flex justify-center gap-1">
                  <button
                    onClick={() => openQRLink(t.qr_token!)}
                    title="Open customer order page"
                    className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                  >
                    🔗 Menu
                  </button>
                  <button
                    onClick={() => copyQRLink(t.qr_token!, t.id)}
                    title="Copy link for QR code"
                    className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                  >
                    {copied === t.id ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              )}

              <div className="mt-2 flex justify-center gap-2">
                <button onClick={() => rename(t.id, t.name)} className="text-xs text-neutral-400 hover:text-neutral-700">
                  Rename
                </button>
                <button onClick={() => remove(t.id)} className="text-xs text-neutral-400 hover:text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Table status (Free / Occupied) is updated automatically when orders are placed in POS.
        Each table has a unique customer ordering URL — share it as a QR code at the table.
        Run migration 0044 in Supabase to activate table management.
      </p>
    </div>
  );
}
