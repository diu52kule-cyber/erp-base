'use client';

import { useState } from 'react';

export default function OpenSessionForm() {
  const [float, setFloat]   = useState('');
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    const res = await fetch('/api/pos/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opening_float: parseFloat(float) || 0 }),
    });
    if (res.ok) window.location.reload();
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="rounded-2xl border border-neutral-200 bg-white p-10 w-full max-w-sm space-y-6 text-center">
        <div className="text-5xl">🖥</div>
        <h2 className="text-xl font-semibold">Open POS Session</h2>
        <p className="text-sm text-neutral-500">Enter the opening cash float in the till before starting.</p>
        <div className="text-left">
          <label className="text-sm text-neutral-600">Opening Cash Float (₹)</label>
          <input type="number" value={float} onChange={(e) => setFloat(e.target.value)} placeholder="0.00"
            className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-right text-lg focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <button onClick={open} disabled={loading}
          className="w-full rounded-xl bg-neutral-900 py-3 text-white font-medium hover:bg-neutral-700 disabled:opacity-50">
          {loading ? 'Opening…' : 'Open Session & Start Selling'}
        </button>
      </div>
    </div>
  );
}
