'use client';

import { useState } from 'react';
import type { InvoiceStatus } from '@/lib/types/billing';

const TRANSITIONS: Record<InvoiceStatus, { label: string; next: InvoiceStatus }[]> = {
  draft: [{ label: 'Mark as Sent', next: 'sent' }],
  sent: [
    { label: 'Mark as Paid', next: 'paid' },
    { label: 'Cancel', next: 'cancelled' },
  ],
  paid: [],
  cancelled: [],
};

export default function StatusButton({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string;
  currentStatus: InvoiceStatus;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = TRANSITIONS[currentStatus] ?? [];
  if (!actions.length) return null;

  async function handleClick(next: InvoiceStatus) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setPending(false);
      } else {
        window.location.reload();
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update status');
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {actions.map(({ label, next }) => (
        <button
          key={next}
          onClick={() => handleClick(next)}
          disabled={pending}
          className="rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          {pending ? '…' : label}
        </button>
      ))}
    </div>
  );
}
