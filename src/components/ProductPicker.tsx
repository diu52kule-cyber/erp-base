'use client';
import { useEffect, useRef, useState } from 'react';
import { moveFocus } from '@/lib/focusNav';

export type PickProduct = { id: string; name: string; sku?: string | null; barcode?: string | null; unit_price: number; gst_rate: number; stock_qty?: number | null; discount_pct?: number | null };

// A line-item description input with product autocomplete. Typing filters the
// catalog; picking a product fills description/price/GST. Fully keyboard-driven:
//   ↓/↑ move through suggestions · Enter picks & advances · Esc closes.
// Free text is still allowed (Enter with nothing highlighted keeps what you typed).
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
  const [hi, setHi] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = value.trim().toLowerCase();
  const matches = (q
    ? products.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q) || (p.barcode ?? '').toLowerCase().includes(q))
    : products).slice(0, 8);

  useEffect(() => { setHi(-1); }, [value]);

  function choose(p: PickProduct) {
    onPick(p);
    setOpen(false);
    setHi(-1);
    if (inputRef.current) moveFocus(inputRef.current, 1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave app shortcuts alone
    if (!open) {
      if (e.key === 'ArrowDown' && matches.length) { e.preventDefault(); e.stopPropagation(); setOpen(true); setHi(0); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setHi((h) => Math.min(matches.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setHi((h) => Math.max(-1, h - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      if (hi >= 0 && matches[hi]) { choose(matches[hi]); return; }
      // Barcode scanner types the code then Enter — auto-pick on an exact barcode/SKU match.
      const t = value.trim();
      const exact = t ? products.find((p) => (p.barcode && p.barcode === t) || (p.sku && p.sku.toLowerCase() === t.toLowerCase())) : undefined;
      if (exact) choose(exact);
      else { setOpen(false); if (inputRef.current) moveFocus(inputRef.current, 1); }
    }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef} type="text" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={className || 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900'}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 z-30 mt-1 max-h-56 w-full min-w-[220px] overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
          {matches.map((p, i) => (
            <button key={p.id} type="button"
              onMouseDown={(e) => { e.preventDefault(); choose(p); }}
              onMouseEnter={() => setHi(i)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${i === hi ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}>
              <span className="truncate">{p.name}{p.sku ? <span className="text-neutral-400"> · {p.sku}</span> : null}</span>
              <span className="shrink-0 text-neutral-400">₹{Number(p.unit_price).toLocaleString('en-IN')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
