'use client';
import { useState } from 'react';

function fmt(n: number) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

export default function CloseSessionForm({ sessionId, expectedCash }: { sessionId: string; expectedCash: number }) {
  const [cash, setCash] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const counted = parseFloat(cash) || 0;
  const variance = counted - expectedCash;

  async function close() {
    setBusy(true); setErr(null);
    const res = await fetch(`/api/pos/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closing_cash: counted, status: 'closed' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(data.error || 'Failed to close session'); setBusy(false); return; }
    window.location.href = '/dashboard/pos';
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
      <h2 className="font-semibold">Close session</h2>
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500">Expected cash in drawer</span>
        <span className="font-medium">{fmt(expectedCash)}</span>
      </div>
      <div>
        <label className="text-sm text-neutral-600">Counted cash</label>
        <input type="number" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0.00"
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-right text-lg focus:outline-none focus:ring-2 focus:ring-neutral-900" />
      </div>
      {cash !== '' && (
        <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
          Math.abs(variance) < 0.01 ? 'bg-green-50 text-green-700' : variance > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
        }`}>
          <span>{Math.abs(variance) < 0.01 ? 'Balanced' : variance > 0 ? 'Over' : 'Short'}</span>
          <span className="font-medium">{fmt(Math.abs(variance))}</span>
        </div>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <a href="/dashboard/pos" className="flex-1 rounded-lg border border-neutral-200 py-2.5 text-center text-sm hover:bg-neutral-50">Back to POS</a>
        <button onClick={close} disabled={busy}
          className="flex-[2] rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50">
          {busy ? 'Closing…' : 'Close session'}
        </button>
      </div>
    </div>
  );
}
