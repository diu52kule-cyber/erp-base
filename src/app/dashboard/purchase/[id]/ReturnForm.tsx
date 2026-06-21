'use client';

import { useState } from 'react';

type POLine = {
  id: string;
  description: string;
  quantity: number;
  received_qty: number;
  unit_price: number;
  gst_rate: number;
  product_id?: string | null;
  po_line_id?: string;
};

export default function ReturnForm({ poId, vendorName, lines }: {
  poId: string;
  vendorName: string;
  lines: POLine[];
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const receivedLines = lines.filter((l) => (l.received_qty ?? 0) > 0);

  function setQty(lineId: string, val: string) {
    setQtys((q) => ({ ...q, [lineId]: val }));
  }

  async function handleSubmit() {
    const returnLines = receivedLines
      .map((l) => {
        const qty = parseFloat(qtys[l.id] || '0');
        if (!qty || qty <= 0) return null;
        const amount = qty * l.unit_price;
        return {
          po_line_id: l.id,
          product_id: l.product_id || null,
          description: l.description,
          quantity: qty,
          unit_price: l.unit_price,
          gst_rate: l.gst_rate,
          amount,
        };
      })
      .filter(Boolean);

    if (!returnLines.length) { setError('Enter quantity for at least one line'); return; }

    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/purchase-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_id: poId,
          vendor_name: vendorName,
          return_date: returnDate,
          reason,
          lines: returnLines,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else window.location.reload();
    } catch {
      setError('Failed to create return');
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
      >
        Return Goods (Debit Note)
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-red-700">Return Goods to Vendor</h2>
        <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-700 text-sm">Cancel</button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Return Date</label>
          <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Reason</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Damaged, wrong item, etc."
            className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-xs text-neutral-500">
              <th className="pb-2 text-left font-medium">Item</th>
              <th className="pb-2 text-right font-medium">Received</th>
              <th className="pb-2 text-right font-medium">Return Qty</th>
              <th className="pb-2 text-right font-medium">Unit Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {receivedLines.map((l) => (
              <tr key={l.id}>
                <td className="py-2">{l.description}</td>
                <td className="py-2 text-right text-neutral-500">{l.received_qty}</td>
                <td className="py-2 text-right">
                  <input
                    type="number"
                    min="0"
                    max={l.received_qty}
                    step="any"
                    value={qtys[l.id] ?? ''}
                    onChange={(e) => setQty(l.id, e.target.value)}
                    className="w-24 rounded border border-neutral-200 px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    placeholder="0"
                  />
                </td>
                <td className="py-2 text-right text-neutral-500">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(l.unit_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {receivedLines.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-400">No received lines to return</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={pending}
          className="rounded-lg bg-red-600 px-5 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? 'Creating…' : 'Create Debit Note'}
        </button>
      </div>
    </div>
  );
}
