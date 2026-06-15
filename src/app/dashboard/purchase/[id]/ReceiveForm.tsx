'use client';

import { useState } from 'react';
import type { POLine } from '@/lib/types/purchase';

export default function ReceiveForm({ poId, lines }: { poId: string; lines: POLine[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(lines.map((l) => [l.id, Math.max(0, l.quantity - (l.received_qty ?? 0))]))
  );

  const receivableLines = lines.filter((l) => (l.quantity - (l.received_qty ?? 0)) > 0);

  async function handleReceive() {
    const toReceive = receivableLines
      .map((l) => ({ po_line_id: l.id, quantity_received: qtys[l.id] ?? 0 }))
      .filter((l) => l.quantity_received > 0);

    if (!toReceive.length) { setError('Enter at least one quantity to receive'); return; }
    setPending(true); setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ received_date: receivedDate, notes, lines: toReceive }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { window.location.reload(); }
    } catch { setError('Failed to record receipt'); setPending(false); }
  }

  if (receivableLines.length === 0) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Record Receipt (GRN)</h2>
        <button onClick={() => setOpen((o) => !o)}
          className="text-sm text-neutral-500 hover:text-neutral-900">
          {open ? 'Cancel' : 'Record Receipt →'}
        </button>
      </div>

      {open && (
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Receipt Date</label>
              <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Notes</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. partial delivery"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Ordered</th>
                <th className="px-3 py-2 text-right font-medium">Received so far</th>
                <th className="px-3 py-2 text-right font-medium">Receiving now</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {receivableLines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">{l.description}</td>
                    <td className="px-3 py-2 text-right">{l.quantity}</td>
                    <td className="px-3 py-2 text-right text-neutral-500">{l.received_qty ?? 0}</td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" value={qtys[l.id] ?? 0}
                        min="0" max={l.quantity - (l.received_qty ?? 0)} step="0.001"
                        onChange={(e) => setQtys((q) => ({ ...q, [l.id]: parseFloat(e.target.value) || 0 }))}
                        className="w-24 rounded-lg border border-neutral-200 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button onClick={handleReceive} disabled={pending}
              className="rounded-md bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
              {pending ? 'Saving…' : 'Confirm Receipt'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
