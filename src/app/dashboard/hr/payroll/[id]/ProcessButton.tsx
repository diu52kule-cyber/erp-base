'use client';

import { useState } from 'react';

export default function ProcessButton({ runId, status }: { runId: string; status: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(newStatus: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/payroll/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { window.location.reload(); }
    } catch {
      setError('Failed to update');
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {status === 'draft' ? (
        <button onClick={() => handle('processed')} disabled={pending}
          className="rounded-md bg-green-700 px-5 py-2 text-sm text-white hover:bg-green-800 disabled:opacity-50">
          {pending ? 'Processing…' : 'Mark as Processed'}
        </button>
      ) : (
        <button onClick={() => handle('draft')} disabled={pending}
          className="rounded-md border border-neutral-200 px-5 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50">
          {pending ? '…' : 'Revert to Draft'}
        </button>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
