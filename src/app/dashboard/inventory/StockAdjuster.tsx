'use client';

import { useState } from 'react';

type Props = { productId: string; currentQty: number; unit: string; lowStockThreshold?: number };

export default function StockAdjuster({ productId, currentQty, unit, lowStockThreshold = 0 }: Props) {
  const [pending, setPending]   = useState(false);
  const [qty, setQty]           = useState(currentQty);
  const [error, setError]       = useState<string | null>(null);
  const [warning, setWarning]   = useState<string | null>(null);

  async function adjust(delta: number, type: 'in' | 'out') {
    const newQty = qty + delta;
    if (newQty < 0) {
      setWarning(`Warning: this will result in negative stock (${newQty} ${unit}). Stock can go below zero.`);
    } else {
      setWarning(null);
    }

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
        if (data.newQty < 0) {
          setWarning(`Stock is now negative (${data.newQty} ${unit})`);
        } else if (lowStockThreshold > 0 && data.newQty <= lowStockThreshold) {
          setWarning(`Low stock: only ${data.newQty} ${unit} remaining`);
        } else {
          setWarning(null);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to adjust stock');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => adjust(-1, 'out')}
          disabled={pending}
          className={`flex h-7 w-7 items-center justify-center rounded border text-sm disabled:opacity-30 ${qty <= 0 ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-neutral-200 hover:bg-neutral-100'}`}
          title={qty <= 0 ? 'Warning: stock will go negative' : 'Remove 1'}
        >
          −
        </button>
        <span className={`min-w-[3rem] text-center text-sm tabular-nums ${qty < 0 ? 'text-red-600 font-semibold' : ''}`}>
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
      </div>
      {warning && <p className="mt-0.5 text-center text-[10px] text-amber-600">{warning}</p>}
      {error   && <p className="mt-0.5 text-center text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
