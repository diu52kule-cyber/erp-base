'use client';

import { useState } from 'react';

export default function RemindersButton({ overdueCount }: { overdueCount: number }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch('/api/payments/reminders', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setResult(`Error: ${data.error}`);
      } else if (!data.emailConfigured) {
        setResult(`Marked ${data.total} overdue invoice${data.total !== 1 ? 's' : ''} (RESEND_API_KEY not set — emails not sent)`);
      } else {
        setResult(`Sent ${data.sent} of ${data.total} reminder${data.total !== 1 ? 's' : ''}`);
      }
    } catch (e: any) {
      setResult(`Error: ${e?.message ?? 'failed'}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-xs text-neutral-500">{result}</span>}
      <button
        onClick={send}
        disabled={pending}
        className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700 hover:bg-amber-100 disabled:opacity-50"
      >
        {pending ? 'Sending…' : `Send Reminders (${overdueCount} overdue)`}
      </button>
    </div>
  );
}
