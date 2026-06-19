'use client';
import { useState } from 'react';
import BarcodeLabel from '@/components/BarcodeLabel';

export default function LabelButton({ name, price, code }: { name: string; price: number; code: string }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);

  if (!code) {
    return <span className="text-xs text-neutral-300" title="Add a barcode or SKU to print a label">—</span>;
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs hover:bg-neutral-50">
        🏷 Label
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="no-print mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Print label</h2>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </div>

            <div className="no-print mb-4 flex items-center gap-2 text-sm">
              <label className="text-neutral-600">Copies</label>
              <input type="number" min={1} max={100} value={qty}
                onChange={(e) => setQty(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                className="w-20 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm" />
            </div>

            <div id="label-print-area" className="flex flex-wrap justify-center gap-2 rounded-lg border border-dashed border-neutral-200 p-3">
              {Array.from({ length: qty }).map((_, i) => (
                <BarcodeLabel key={i} name={name} price={price} code={code} />
              ))}
            </div>

            <div className="no-print mt-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm">Cancel</button>
              <button onClick={() => window.print()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">Print</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
