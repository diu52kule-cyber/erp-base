'use client';

import { useState } from 'react';
import { DEAL_STAGES, DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from '@/lib/types/crm';
import type { DealStage } from '@/lib/types/crm';

export default function StageButton({ dealId, currentStage }: { dealId: string; currentStage: DealStage }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function moveTo(stage: DealStage) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { window.location.reload(); }
    } catch {
      setError('Failed to update stage');
      setPending(false);
    }
  }

  const currentIdx = DEAL_STAGES.indexOf(currentStage);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {DEAL_STAGES.map((s, i) => (
          <button
            key={s}
            onClick={() => moveTo(s)}
            disabled={pending || s === currentStage}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-opacity disabled:cursor-default ${
              s === currentStage
                ? DEAL_STAGE_COLORS[s] + ' ring-2 ring-offset-1 ring-neutral-400'
                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:opacity-100'
            }`}
          >
            {DEAL_STAGE_LABELS[s]}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
