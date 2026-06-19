'use client';

import { useState } from 'react';
import { GST_RATES } from '@/lib/types/billing';
import { INDIAN_STATES } from '@/lib/types/accounting';
import { useFormDraft } from '@/lib/useFormDraft';

type LineItem = {
  description: string;
  hsn_code: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
};

const emptyItem = (): LineItem => ({
  description: '',
  hsn_code: '',
  quantity: 1,
  unit_price: 0,
  gst_rate: 18,
});

const today = () => new Date().toISOString().split('T')[0];

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

export default function InvoiceForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_gstin: '',
    billing_address: '',
    place_of_supply: '',
    issue_date: today(),
    due_date: '',
    notes: '',
  });

  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  // Auto-save the whole invoice (header + line items) so switching tabs doesn't lose work.
  const { clearDraft, draftRestored } = useFormDraft(
    'invoice-new',
    { form, items },
    (v: { form: typeof form; items: LineItem[] }) => { if (v.form) setForm(v.form); if (v.items) setItems(v.items); },
  );

  const calculated = items.map((item) => {
    const amount = Math.round(item.quantity * item.unit_price * 100) / 100;
    const gst_amount = Math.round(amount * item.gst_rate) / 100;
    return { ...item, amount, gst_amount };
  });

  const subtotal = calculated.reduce((s, i) => s + i.amount, 0);
  const gstTotal = calculated.reduce((s, i) => s + i.gst_amount, 0);
  const total = subtotal + gstTotal;

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit() {
    if (!form.customer_name.trim()) { setError('Customer name is required'); return; }
    if (!items.length || items.some((i) => !i.description.trim())) {
      setError('All line items must have a description'); return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: items.map(({ description, hsn_code, quantity, unit_price, gst_rate }) => ({
            description, hsn_code: hsn_code.trim() || null, quantity, unit_price, gst_rate,
          })),
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); }
      else { clearDraft(); window.location.href = `/dashboard/billing/${data.id}`; }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save invoice');
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {draftRestored && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <span>Restored your unsaved invoice draft.</span>
          <button type="button" onClick={() => { clearDraft(); window.location.reload(); }} className="font-medium underline-offset-2 hover:underline">Discard</button>
        </div>
      )}

      {/* Customer details */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">Customer Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Customer Name *</label>
            <input type="text" value={form.customer_name}
              onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
              placeholder="Business or person name"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Email</label>
            <input type="email" value={form.customer_email}
              onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
              placeholder="customer@example.com"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Customer GSTIN</label>
            <input type="text" value={form.customer_gstin}
              onChange={(e) => setForm((f) => ({ ...f, customer_gstin: e.target.value.toUpperCase() }))}
              placeholder="22AAAAA0000A1Z5" maxLength={15}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Place of Supply</label>
            <select value={form.place_of_supply}
              onChange={(e) => setForm((f) => ({ ...f, place_of_supply: e.target.value }))}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
              <option value="">— Select state —</option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.code} – {s.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Billing Address</label>
            <input type="text" value={form.billing_address}
              onChange={(e) => setForm((f) => ({ ...f, billing_address: e.target.value }))}
              placeholder="Street, City, State, PIN"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
        </div>
      </div>

      {/* Invoice details */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">Invoice Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Issue Date *</label>
            <input type="date" value={form.issue_date}
              onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Due Date</label>
            <input type="date" value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Notes</label>
            <textarea value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Payment terms, thank you note, etc."
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">Line Items</h2>
        <div className="space-y-3">
          {/* Header row */}
          <div className="hidden grid-cols-[1fr_90px_72px_110px_90px_96px_32px] gap-2 text-xs text-neutral-500 sm:grid">
            <span>Description</span>
            <span>HSN/SAC</span>
            <span>Qty</span>
            <span>Unit Price (₹)</span>
            <span>GST %</span>
            <span className="text-right">Amount</span>
            <span />
          </div>

          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_90px_72px_110px_90px_96px_32px] items-center gap-2">
              <input type="text" value={item.description}
                onChange={(e) => updateItem(index, 'description', e.target.value)}
                placeholder="Item description"
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              <input type="text" value={item.hsn_code}
                onChange={(e) => updateItem(index, 'hsn_code', e.target.value.replace(/\D/g, ''))}
                placeholder="9983" maxLength={8}
                className="rounded-lg border border-neutral-200 px-2 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              <input type="number" value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                min="0" step="0.001"
                className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              <input type="number" value={item.unit_price}
                onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                min="0" step="0.01"
                className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              <select value={item.gst_rate}
                onChange={(e) => updateItem(index, 'gst_rate', parseInt(e.target.value))}
                className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
                {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
              <div className="text-right text-sm font-medium">{fmt(item.quantity * item.unit_price)}</div>
              <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                disabled={items.length === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30"
                aria-label="Remove item">×</button>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="mt-3 text-sm text-neutral-500 hover:text-neutral-900">
          + Add line item
        </button>

        {/* Totals */}
        <div className="mt-6 border-t border-neutral-100 pt-4">
          <div className="ml-auto w-64 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>GST</span><span>{fmt(gstTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
              <span>Total</span><span>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={pending}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Saving…' : 'Save Invoice'}
        </button>
      </div>
    </div>
  );
}
