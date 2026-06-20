'use client';

import { useState } from 'react';
import { GST_RATES } from '@/lib/types/billing';
import type { Contact } from '@/lib/types/crm';
import ProductPicker, { type PickProduct } from '@/components/ProductPicker';

type LineItem = { description: string; product_id: string; quantity: number; unit_price: number; gst_rate: number };

const emptyLine = (): LineItem => ({ description: '', product_id: '', quantity: 1, unit_price: 0, gst_rate: 18 });

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

export default function PurchaseOrderForm({ vendors, products = [] }: { vendors: Contact[]; products?: PickProduct[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [vendorId, setVendorId]       = useState('');
  const [vendorName, setVendorName]   = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [address, setAddress]         = useState('');
  const [issueDate, setIssueDate]     = useState(new Date().toISOString().split('T')[0]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes]             = useState('');
  const [items, setItems]             = useState<LineItem[]>([emptyLine()]);

  function pickVendor(id: string) {
    const v = vendors.find((v) => v.id === id);
    if (v) { setVendorId(v.id); setVendorName(v.name); setVendorGstin(v.gstin ?? ''); }
    else   { setVendorId(''); }
  }

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((item, j) => j === i ? { ...item, [field]: value } : item));
  }

  const calculated = items.map((item) => {
    const amount = Math.round(item.quantity * item.unit_price * 100) / 100;
    return { ...item, amount, gst_amount: Math.round(amount * item.gst_rate) / 100 };
  });
  const subtotal = calculated.reduce((s, i) => s + i.amount, 0);
  const gstTotal = calculated.reduce((s, i) => s + i.gst_amount, 0);

  async function handleSubmit() {
    if (!vendorName.trim()) { setError('Vendor name is required'); return; }
    if (items.some((i) => !i.description.trim())) { setError('All items need a description'); return; }
    setError(null); setPending(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId || null, vendor_name: vendorName, vendor_gstin: vendorGstin,
          billing_address: address, issue_date: issueDate, expected_delivery: expectedDelivery || null,
          notes,
          items: items.map(({ description, product_id, quantity, unit_price, gst_rate }) => ({
            description, product_id: product_id || null, quantity, unit_price, gst_rate,
          })),
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { window.location.href = `/dashboard/purchase/${data.id}`; }
    } catch { setError('Failed to save'); setPending(false); }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Vendor */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Vendor</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {vendors.length > 0 && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-neutral-600">Select existing vendor</label>
              <select value={vendorId} onChange={(e) => pickVendor(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
                <option value="">— Type manually below —</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}{v.company ? ` (${v.company})` : ''}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Vendor Name *</label>
            <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)}
              placeholder="Supplier business name"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Vendor GSTIN</label>
            <input type="text" value={vendorGstin} onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
              placeholder="22AAAAA0000A1Z5" maxLength={15}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Billing Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="Vendor address"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
        </div>
      </div>

      {/* PO Details */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-medium">Order Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Issue Date *</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Expected Delivery</label>
            <input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Delivery instructions, payment terms, etc."
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
        <h2 className="font-medium">Items to Order</h2>
        <div className="hidden grid-cols-[1fr_72px_110px_90px_96px_32px] gap-2 text-xs text-neutral-500 sm:grid">
          <span>Description</span><span>Qty</span><span>Unit Price (₹)</span><span>GST %</span><span className="text-right">Amount</span><span />
        </div>
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_72px_110px_90px_96px_32px] items-center gap-2">
            <ProductPicker
              value={item.description}
              products={products}
              onChange={(v) => updateItem(i, 'description', v)}
              onPick={(p) => setItems((prev) => prev.map((it, j) => j === i ? { ...it, description: p.name, product_id: p.id, unit_price: p.unit_price, gst_rate: p.gst_rate } : it))}
              placeholder="Item / product description" />
            <input type="number" value={item.quantity} min="0" step="0.001"
              onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
              className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            <input type="number" value={item.unit_price} min="0" step="0.01"
              onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
              className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            <select value={item.gst_rate} onChange={(e) => updateItem(i, 'gst_rate', parseInt(e.target.value))}
              className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
              {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
            <div className="text-right text-sm font-medium">{fmt(item.quantity * item.unit_price)}</div>
            <button type="button" onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
              disabled={items.length === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 disabled:opacity-30">×</button>
          </div>
        ))}
        <button type="button" onClick={() => setItems((p) => [...p, emptyLine()])}
          className="text-sm text-neutral-500 hover:text-neutral-900">+ Add item</button>
        <div className="border-t border-neutral-100 pt-4">
          <div className="ml-auto w-56 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between text-neutral-600"><span>GST</span><span>{fmt(gstTotal)}</span></div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
              <span>Total</span><span>{fmt(subtotal + gstTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={pending}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Saving…' : 'Create Purchase Order'}
        </button>
      </div>
    </div>
  );
}
