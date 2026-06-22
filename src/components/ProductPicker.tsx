'use client';
import { useState } from 'react';

export type PickProduct = { id: string; name: string; sku?: string | null; unit_price: number; gst_rate: number; stock_qty?: number | null };

// A line-item description input with product autocomplete. Typing filters the
// catalog; picking a product fills description/price/GST. Free text still allowed.
export default function ProductPicker({
  value, onChange, onPick, products, placeholder = 'Item / product…', className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (p: PickProduct) => void;
  products: PickProduct[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const matches = q
    ? products.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)).slice(0, 8)
    : products.slice(0, 8);

  return (
    <div className="relative">
      <input
        type="text" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={className || 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900'}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 z-30 mt-1 max-h-56 w-full min-w-[220px] overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
          {matches.map((p) => (
            <button key={p.id} type="button"
              onMouseDown={(e) => { e.preventDefault(); onPick(p); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50">
              <span className="truncate">{p.name}{p.sku ? <span className="text-neutral-400"> · {p.sku}</span> : null}</span>
              <span className="shrink-0 text-neutral-400">₹{Number(p.unit_price).toLocaleString('en-IN')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
