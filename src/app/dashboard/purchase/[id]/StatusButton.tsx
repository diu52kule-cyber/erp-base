'use client';

import { useState } from 'react';
import { PO_STATUS_LABELS, PO_STATUS_TRANSITIONS } from '@/lib/types/purchase';
import type { POStatus } from '@/lib/types/purchase';

export default function StatusButton({ poId, status }: { poId: string; status: POStatus }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transitions = PO_STATUS_TRANSITIONS[status] ?? [];

  async function set(next: POStatus) {
    setPending(next); setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(null); }
      else { window.location.reload(); }
    } catch { setError('Failed'); setPending(null); }
  }

  if (!transitions.length) return null;

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <button key={t} onClick={() => set(t)} disabled={!!pending}
            className={`rounded-lg border px-4 py-2 text-sm disabled:opacity-50 ${t === 'cancelled' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
            {pending === t ? 'Updating…' : PO_STATUS_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
