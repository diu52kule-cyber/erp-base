'use client';

import { useState } from 'react';

type Props = { productId: string; currentQty: number; unit: string };

export default function StockAdjuster({ productId, currentQty, unit }: Props) {
  const [pending, setPending] = useState(false);
  const [qty, setQty] = useState(currentQty);
  const [error, setError] = useState<string | null>(null);

  async function adjust(delta: number, type: 'in' | 'out') {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, type }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setQty(data.newQty);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to adjust stock');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => adjust(-1, 'out')}
        disabled={pending || qty <= 0}
        className="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 text-sm hover:bg-neutral-100 disabled:opacity-30"
        title="Remove 1"
      >
        −
      </button>
      <span className="min-w-[3rem] text-center text-sm tabular-nums">
        {qty} {unit}
      </span>
      <button
        onClick={() => adjust(1, 'in')}
        disabled={pending}
        className="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 text-sm hover:bg-neutral-100 disabled:opacity-30"
        title="Add 1"
      >
        +
      </button>
      {error && (
        <span className="ml-1 text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}
