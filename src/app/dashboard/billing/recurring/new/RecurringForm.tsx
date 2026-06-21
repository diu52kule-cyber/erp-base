'use client';

import { useState } from 'react';
import { GST_RATES } from '@/lib/types/billing';
import { INDIAN_STATES } from '@/lib/types/accounting';
import ProductPicker, { type PickProduct } from '@/components/ProductPicker';
import ContactPicker, { type PickContact } from '@/components/ContactPicker';
import { computeInvoiceTotals } from '@/lib/invoice/calc';
import { fmtMoney, CURRENCY_SYMBOLS } from '@/lib/invoice/format';
import { FREQUENCIES } from '@/lib/invoice/recurring';

type LineItem = { description: string; hsn_code: string; quantity: number; unit_price: number; gst_rate: number; discount_pct: number };
const today = () => new Date().toISOString().split('T')[0];
const emptyItem = (gst = 18): LineItem => ({ description: '', hsn_code: '', quantity: 1, unit_price: 0, gst_rate: gst, discount_pct: 0 });
const CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

export default function RecurringForm({ defaultGst = 18, products = [], contacts = [] }: { defaultGst?: number; products?: PickProduct[]; contacts?: PickContact[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', customer_name: '', customer_email: '', customer_gstin: '', billing_address: '',
    place_of_supply: '', currency: 'INR', notes: '', terms: '',
    frequency: 'monthly', interval_count: 1, start_date: today(), end_date: '',
  });
  const [items, setItems] = useState<LineItem[]>([emptyItem(defaultGst)]);

  const totals = computeInvoiceTotals(
    items.map((i) => ({ quantity: i.quantity, unit_price: i.unit_price, gst_rate: i.gst_rate, discount_type: i.discount_pct > 0 ? 'percent' : undefined, discount_value: i.discount_pct })),
    { roundOffEnabled: true },
  );
  const money = (n: number) => fmtMoney(n, form.currency);

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, [field]: value } : it)));
  }

  async function submit() {
    if (!form.customer_name.trim()) { setError('Customer name is required'); return; }
    if (items.some((i) => !i.description.trim())) { setError('Every line item needs a description'); return; }
    setError(null); setPending(true);
    const res = await fetch('/api/recurring', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form, customer_id: customerId,
        items: items.map((i) => ({ description: i.description, hsn_code: i.hsn_code.trim() || null, quantity: i.quantity, unit_price: i.unit_price, gst_rate: i.gst_rate, discount_pct: i.discount_pct })),
      }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setPending(false); return; }
    window.location.href = '/dashboard/billing/recurring';
  }

  const input = 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900';
  const label = 'mb-1 block text-sm text-neutral-600';

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">Customer</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Customer Name *</label>
            <ContactPicker value={form.customer_name} contacts={contacts}
              onChange={(v) => { setForm((f) => ({ ...f, customer_name: v })); setCustomerId(null); }}
              onPick={(c) => { setCustomerId(c.id); setForm((f) => ({ ...f, customer_name: c.name, customer_email: c.email ?? f.customer_email, customer_gstin: c.gstin ?? f.customer_gstin, billing_address: c.address ?? f.billing_address, place_of_supply: c.gstin && /^\d{2}/.test(c.gstin) ? c.gstin.slice(0, 2) : f.place_of_supply })); }}
              placeholder="Search a customer or type a name" />
          </div>
          <div><label className={label}>Email</label><input className={input} value={form.customer_email} onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))} /></div>
          <div><label className={label}>GSTIN</label><input className={`${input} font-mono`} value={form.customer_gstin} onChange={(e) => setForm((f) => ({ ...f, customer_gstin: e.target.value.toUpperCase() }))} maxLength={15} /></div>
          <div><label className={label}>Place of Supply</label>
            <select className={input} value={form.place_of_supply} onChange={(e) => setForm((f) => ({ ...f, place_of_supply: e.target.value }))}>
              <option value="">— Select state —</option>
              {INDIAN_STATES.map((s) => <option key={s.code} value={s.code}>{s.code} – {s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">Schedule</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3"><label className={label}>Title (internal)</label><input className={input} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Monthly retainer — Acme" /></div>
          <div><label className={label}>Frequency</label>
            <select className={input} value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}>
              {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div><label className={label}>Every (interval)</label><input type="number" min="1" className={input} value={form.interval_count} onChange={(e) => setForm((f) => ({ ...f, interval_count: parseInt(e.target.value) || 1 }))} /></div>
          <div><label className={label}>Currency</label>
            <select className={input} value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div><label className={label}>Start date</label><input type="date" className={input} value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} /></div>
          <div><label className={label}>End date (optional)</label><input type="date" className={input} value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} /></div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">Line Items</h2>
        <div className="space-y-3">
          <div className="hidden grid-cols-[1fr_80px_64px_96px_64px_80px_96px_28px] gap-2 text-xs text-neutral-500 sm:grid">
            <span>Description</span><span>HSN</span><span>Qty</span><span>Rate</span><span>Disc %</span><span>GST %</span><span className="text-right">Amount</span><span />
          </div>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_80px_64px_96px_64px_80px_96px_28px] items-center gap-2">
              <ProductPicker value={item.description} products={products}
                onChange={(v) => updateItem(index, 'description', v)}
                onPick={(p) => setItems((prev) => prev.map((it, j) => j === index ? { ...it, description: p.name, unit_price: p.unit_price, gst_rate: p.gst_rate } : it))}
                placeholder="Item description" />
              <input type="text" value={item.hsn_code} onChange={(e) => updateItem(index, 'hsn_code', e.target.value.replace(/\D/g, ''))} maxLength={8} className="rounded-lg border border-neutral-200 px-2 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              <input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} min="0" step="0.001" className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              <input type="number" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} min="0" step="0.01" className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              <input type="number" value={item.discount_pct} onChange={(e) => updateItem(index, 'discount_pct', Math.min(100, parseFloat(e.target.value) || 0))} min="0" max="100" className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
              <select value={item.gst_rate} onChange={(e) => updateItem(index, 'gst_rate', parseInt(e.target.value))} className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
                {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
              <div className="text-right text-sm font-medium">{money(totals.lines[index]?.amount ?? 0)}</div>
              <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} disabled={items.length === 1} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 disabled:opacity-30" aria-label="Remove">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setItems((prev) => [...prev, emptyItem(defaultGst)])} className="mt-3 text-sm text-neutral-500 hover:text-neutral-900">+ Add line item</button>
        <div className="mt-4 flex justify-end text-sm"><div className="w-56 space-y-1">
          <div className="flex justify-between text-neutral-600"><span>Taxable</span><span>{money(totals.taxableTotal)}</span></div>
          <div className="flex justify-between text-neutral-600"><span>GST</span><span>{money(totals.gstTotal)}</span></div>
          <div className="flex justify-between border-t border-neutral-200 pt-1 font-semibold"><span>Total / cycle</span><span>{money(totals.total)}</span></div>
        </div></div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        <div><label className={label}>Notes</label><input className={input} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
        <div><label className={label}>Terms</label><textarea rows={2} className={input} value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} /></div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={submit} disabled={pending} className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">{pending ? 'Saving…' : 'Save Recurring Invoice'}</button>
      </div>
    </div>
  );
}
