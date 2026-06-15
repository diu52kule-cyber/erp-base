'use client';

import { useState } from 'react';
import type { SubscriptionStatus } from '@/lib/types/subscriptions';
import { SUBSCRIPTION_STATUS_LABELS } from '@/lib/types/subscriptions';

const TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  trial: ['active', 'cancelled'],
  active: ['cancelled', 'expired'],
  cancelled: ['active'],
  expired: ['active'],
};

export default function StatusButton({ subId, currentStatus }: { subId: string; currentStatus: SubscriptionStatus }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const next = TRANSITIONS[currentStatus] ?? [];

  async function setStatus(status: SubscriptionStatus) {
    setPending(status);
    setError(null);
    try {
      const res = await fetch(`/api/subscriptions/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(null); }
      else { window.location.reload(); }
    } catch { setError('Failed to update status'); setPending(null); }
  }

  if (next.length === 0) return <p className="text-sm text-neutral-400">No status transitions available.</p>;

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <button key={s} onClick={() => setStatus(s)} disabled={!!pending}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50">
            {pending === s ? 'Updating…' : `Set ${SUBSCRIPTION_STATUS_LABELS[s]}`}
          </button>
        ))}
      </div>
    </div>
  );
}
