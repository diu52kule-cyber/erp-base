'use client';

import { useState } from 'react';
import { GST_RATES } from '@/lib/types/billing';
import { INDIAN_STATES } from '@/lib/types/accounting';
import { useFormDraft } from '@/lib/useFormDraft';
import ProductPicker, { type PickProduct } from '@/components/ProductPicker';
import ContactPicker, { type PickContact } from '@/components/ContactPicker';
import { computeInvoiceTotals } from '@/lib/invoice/calc';
import { amountInWords } from '@/lib/invoice/words';
import { fmtMoney, CURRENCY_SYMBOLS } from '@/lib/invoice/format';
import { DOC_TYPES, PAYMENT_TERMS, addDays, type DocType } from '@/lib/invoice/docTypes';

type LineItem = {
  product_id?: string | null;
  description: string;
  hsn_code: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  discount_pct: number;
  stock_qty?: number | null;
};

export type InvoiceFormInitial = {
  customer_id?: string | null;
  customer_name?: string;
  customer_email?: string;
  customer_gstin?: string;
  billing_address?: string;
  place_of_supply?: string;
  issue_date?: string;
  due_date?: string;
  reference_no?: string;
  notes?: string;
  terms?: string;
  currency?: string;
  discount_type?: 'percent' | 'amount' | null;
  discount_value?: number;
  round_off_enabled?: boolean;
  items?: {
    product_id?: string | null;
    description: string;
    hsn_code?: string | null;
    quantity: number;
    unit_price: number;
    gst_rate: number;
    discount_type?: 'percent' | 'amount' | null;
    discount_value?: number;
  }[];
};

type Props = {
  mode?: 'create' | 'edit' | 'credit_note';
  docType?: DocType;
  invoiceId?: string;
  sourceId?: string;
  initial?: InvoiceFormInitial;
  defaultGst?: number;
  defaultDueDays?: number;
  defaultTerms?: string;
  defaultNotes?: string;
  roundOffDefault?: boolean;
  products?: PickProduct[];
  contacts?: PickContact[];
};

const today = () => new Date().toISOString().split('T')[0];

const emptyItem = (gst = 18): LineItem => ({
  product_id: null, description: '', hsn_code: '', quantity: 1, unit_price: 0, gst_rate: gst, discount_pct: 0, stock_qty: null,
});

function initialItems(initial: InvoiceFormInitial | undefined, gst: number): LineItem[] {
  if (!initial?.items?.length) return [emptyItem(gst)];
  const mapped = initial.items.map((it) => ({
    product_id: it.product_id ?? null,
    description: it.description ?? '',
    hsn_code: it.hsn_code ?? '',
    quantity: it.quantity ?? 1,
    unit_price: it.unit_price ?? 0,
    gst_rate: it.gst_rate ?? gst,
    discount_pct: it.discount_type === 'percent' ? (it.discount_value ?? 0) : 0,
  }));
  return [...mapped, emptyItem(gst)]; // always keep a trailing empty row to type into
}

const CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

export default function InvoiceForm({
  mode = 'create', docType = 'invoice', invoiceId, sourceId, initial,
  defaultGst = 18, defaultDueDays = 0, defaultTerms = '', defaultNotes = '',
  roundOffDefault = true, products = [], contacts = [],
}: Props) {
  const effectiveDocType: DocType = mode === 'credit_note' ? 'credit_note' : docType;
  const cfg = DOC_TYPES[effectiveDocType];
  const isInvoice = effectiveDocType === 'invoice';

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(initial?.customer_id ?? null);
  const [contactCredit, setContactCredit] = useState<{ limit: number; outstanding: number } | null>(null);

  const [form, setForm] = useState({
    customer_name: initial?.customer_name ?? '',
    customer_email: initial?.customer_email ?? '',
    customer_gstin: initial?.customer_gstin ?? '',
    billing_address: initial?.billing_address ?? '',
    place_of_supply: initial?.place_of_supply ?? '',
    issue_date: initial?.issue_date ?? today(),
    due_date: initial?.due_date ?? (defaultDueDays ? addDays(today(), defaultDueDays) : ''),
    reference_no: initial?.reference_no ?? '',
    notes: initial?.notes ?? defaultNotes,
    terms: initial?.terms ?? defaultTerms,
    currency: initial?.currency ?? 'INR',
  });

  const [items, setItems] = useState<LineItem[]>(initialItems(initial, defaultGst));
  const [billDiscType, setBillDiscType] = useState<'' | 'percent' | 'amount'>(initial?.discount_type ?? '');
  const [billDiscValue, setBillDiscValue] = useState<number>(initial?.discount_value ?? 0);
  const [roundOff, setRoundOff] = useState<boolean>(initial?.round_off_enabled ?? roundOffDefault);

  // Payment captured at creation (real invoices only).
  const [payMethod, setPayMethod] = useState<'credit' | 'cash' | 'upi' | 'card' | 'bank_transfer'>('credit');
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');

  const draftKey =
    mode === 'edit' ? `invoice-edit-${invoiceId}` :
    mode === 'credit_note' ? `invoice-cn-${sourceId}` :
    `invoice-new-${docType}`;
  const { clearDraft, draftRestored } = useFormDraft(
    draftKey,
    { form, items, billDiscType, billDiscValue, roundOff, customerId },
    (v: { form: typeof form; items: LineItem[]; billDiscType: '' | 'percent' | 'amount'; billDiscValue: number; roundOff: boolean; customerId: string | null }) => {
      if (v.form) setForm(v.form);
      if (v.items) setItems(v.items);
      if (v.billDiscType !== undefined) setBillDiscType(v.billDiscType);
      if (typeof v.billDiscValue === 'number') setBillDiscValue(v.billDiscValue);
      if (typeof v.roundOff === 'boolean') setRoundOff(v.roundOff);
      if (v.customerId !== undefined) setCustomerId(v.customerId);
    },
  );

  const currency = form.currency;
  const money = (n: number) => fmtMoney(n, currency);

  const totals = computeInvoiceTotals(
    items.map((i) => ({
      quantity: i.quantity, unit_price: i.unit_price, gst_rate: i.gst_rate,
      discount_type: i.discount_pct > 0 ? 'percent' : undefined, discount_value: i.discount_pct,
    })),
    { discountType: billDiscType || undefined, discountValue: billDiscValue, roundOffEnabled: roundOff },
  );

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  // Keep exactly one empty row at the bottom so there's always somewhere to type
  // the next item (like Vyapar/Marg) — a fresh empty line appears as you fill one.
  const ensureTrailing = (list: LineItem[]): LineItem[] => {
    const last = list[list.length - 1];
    return last && last.description.trim() ? [...list, emptyItem(defaultGst)] : list;
  };

  function onFormKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit('save'); }
    else if (e.altKey && (e.key === 'n' || e.key === 'N') && mode === 'create') { e.preventDefault(); handleSubmit('new'); }
    else if (e.altKey && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); handleSubmit('print'); }
    else if (e.altKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); setItems((prev) => [...prev, emptyItem(defaultGst)]); }
  }

  function applyTerm(days: number) {
    setForm((f) => ({ ...f, due_date: addDays(f.issue_date || today(), days) }));
  }

  function resetForm() {
    setForm({
      customer_name: '', customer_email: '', customer_gstin: '', billing_address: '',
      place_of_supply: '', issue_date: today(), due_date: defaultDueDays ? addDays(today(), defaultDueDays) : '',
      reference_no: '', notes: defaultNotes, terms: defaultTerms, currency: 'INR',
    });
    setItems([emptyItem(defaultGst)]);
    setBillDiscType(''); setBillDiscValue(0); setRoundOff(roundOffDefault);
    setCustomerId(null); setPayMethod('credit'); setPayAmount(''); setPayRef('');
  }

  async function handleSubmit(action: 'save' | 'new' | 'print') {
    if (!form.customer_name.trim()) { setError('Customer name is required'); return; }
    const filled = items.filter((i) => i.description.trim()); // ignore the trailing empty row(s)
    if (!filled.length) { setError('Add at least one line item'); return; }
    setError(null);
    setPending(true);

    const payload = {
      doc_type: effectiveDocType,
      customer_id: customerId,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_gstin: form.customer_gstin,
      billing_address: form.billing_address,
      place_of_supply: form.place_of_supply,
      issue_date: form.issue_date,
      due_date: form.due_date || undefined,
      reference_no: form.reference_no,
      notes: form.notes,
      terms: form.terms,
      currency: form.currency,
      discount_type: billDiscType || null,
      discount_value: billDiscValue,
      round_off_enabled: roundOff,
      items: filled.map((i) => ({
        product_id: i.product_id ?? null,
        description: i.description,
        hsn_code: i.hsn_code.trim() || null,
        quantity: i.quantity,
        unit_price: i.unit_price,
        gst_rate: i.gst_rate,
        discount_type: i.discount_pct > 0 ? 'percent' : null,
        discount_value: i.discount_pct,
      })),
      payment: isInvoice && mode === 'create' && payMethod !== 'credit'
        ? { method: payMethod, amount: parseFloat(payAmount) || totals.total, reference: payRef.trim() || undefined }
        : null,
    };

    const url =
      mode === 'edit' ? `/api/invoices/${invoiceId}` :
      mode === 'credit_note' ? `/api/invoices/${sourceId}/credit-note` :
      '/api/invoices';
    const method = mode === 'edit' ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.error) { setError(data.error); setPending(false); return; }
      clearDraft();
      if (action === 'new') { resetForm(); setPending(false); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      const id = data.id ?? invoiceId;
      window.location.href = action === 'print' ? `/dashboard/billing/${id}?print=1` : `/dashboard/billing/${id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save'); setPending(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900';

  return (
    <div className="space-y-6" onKeyDown={onFormKeyDown}>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {contactCredit && (() => {
        const remaining = contactCredit.limit - contactCredit.outstanding;
        const overLimit = totals.total > remaining;
        return (
          <div className={`rounded-lg px-4 py-3 text-sm ${overLimit ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
            {overLimit
              ? `Credit limit exceeded — outstanding ₹${contactCredit.outstanding.toLocaleString('en-IN')} + this invoice ₹${Math.round(totals.total).toLocaleString('en-IN')} exceeds limit of ₹${contactCredit.limit.toLocaleString('en-IN')}`
              : `Credit limit: ₹${contactCredit.limit.toLocaleString('en-IN')} · Outstanding: ₹${contactCredit.outstanding.toLocaleString('en-IN')} · Available: ₹${remaining.toLocaleString('en-IN')}`
            }
          </div>
        );
      })()}
      {draftRestored && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <span>Restored your unsaved {cfg.short.toLowerCase()} draft.</span>
          <button type="button" onClick={() => { clearDraft(); window.location.reload(); }} className="font-medium underline-offset-2 hover:underline">Discard</button>
        </div>
      )}

      {/* Customer details */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">{effectiveDocType === 'credit_note' ? 'Customer (return to)' : 'Customer Details'}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Customer Name *</label>
            <ContactPicker
              value={form.customer_name}
              contacts={contacts}
              onChange={(v) => { setForm((f) => ({ ...f, customer_name: v })); setCustomerId(null); }}
              onPick={(c) => {
                setCustomerId(c.id);
                setForm((f) => ({
                  ...f,
                  customer_name: c.name,
                  customer_email: c.email ?? f.customer_email,
                  customer_gstin: c.gstin ?? f.customer_gstin,
                  billing_address: c.address ?? f.billing_address,
                  place_of_supply: c.gstin && /^\d{2}/.test(c.gstin) ? c.gstin.slice(0, 2) : f.place_of_supply,
                }));
                if (c.credit_limit && c.credit_limit > 0) {
                  setContactCredit({ limit: c.credit_limit, outstanding: c.outstanding ?? 0 });
                } else {
                  setContactCredit(null);
                }
              }}
              placeholder="Search a customer or type a new name" />
            {customerId && isInvoice && <p className="mt-1 text-xs text-green-600">● Linked to customer — will post to their ledger</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Email</label>
            <input type="email" value={form.customer_email} onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))} placeholder="customer@example.com" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Customer GSTIN</label>
            <input type="text" value={form.customer_gstin}
              onChange={(e) => { const v = e.target.value.toUpperCase(); setForm((f) => ({ ...f, customer_gstin: v, place_of_supply: /^\d{2}/.test(v) ? v.slice(0, 2) : f.place_of_supply })); }}
              placeholder="22AAAAA0000A1Z5" maxLength={15} className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Place of Supply</label>
            <select value={form.place_of_supply} onChange={(e) => setForm((f) => ({ ...f, place_of_supply: e.target.value }))} className={inputCls}>
              <option value="">— Select state —</option>
              {INDIAN_STATES.map((s) => <option key={s.code} value={s.code}>{s.code} – {s.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Billing Address</label>
            <input type="text" value={form.billing_address} onChange={(e) => setForm((f) => ({ ...f, billing_address: e.target.value }))} placeholder="Street, City, State, PIN" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Document details */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">{cfg.label} Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">{effectiveDocType === 'quotation' ? 'Quote Date' : 'Issue Date'} *</label>
            <input type="date" value={form.issue_date} onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">{effectiveDocType === 'quotation' ? 'Valid Until' : 'Due Date'}</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className={inputCls} />
            <div className="mt-1 flex flex-wrap gap-1">
              {PAYMENT_TERMS.map((t) => (
                <button key={t.days} type="button" onClick={() => applyTerm(t.days)} className="rounded border border-neutral-200 px-1.5 py-0.5 text-[11px] text-neutral-500 hover:bg-neutral-50">{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Currency</label>
            <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className={inputCls}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Reference / PO No.</label>
            <input type="text" value={form.reference_no} onChange={(e) => setForm((f) => ({ ...f, reference_no: e.target.value }))} placeholder="optional" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-600">Notes</label>
            <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Thank you note, delivery info, etc." className={inputCls} />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 font-medium">Line Items</h2>
        <div className="space-y-3">
          <div className="hidden grid-cols-[1fr_80px_64px_96px_64px_80px_96px_28px] gap-2 text-xs text-neutral-500 sm:grid">
            <span>Description</span><span>HSN/SAC</span><span>Qty</span><span>Rate</span><span>Disc %</span><span>GST %</span><span className="text-right">Amount</span><span />
          </div>
          {items.map((item, index) => {
            const stockWarn = item.stock_qty != null && item.quantity > item.stock_qty;
            return (
              <div key={index} className="space-y-1">
                <div className="grid grid-cols-[1fr_80px_64px_96px_64px_80px_96px_28px] items-center gap-2">
                  <ProductPicker value={item.description} products={products}
                    onChange={(v) => setItems((prev) => ensureTrailing(prev.map((it, j) => j === index ? { ...it, description: v, product_id: null, stock_qty: null } : it)))}
                    onPick={(p) => {
                      setItems((prev) => ensureTrailing(prev.map((it, j) => j === index ? { ...it, product_id: p.id, description: p.name, unit_price: p.unit_price, gst_rate: p.gst_rate, discount_pct: (p.discount_pct ?? 0) || it.discount_pct, stock_qty: p.stock_qty ?? null } : it)));
                      // Jump straight to the quantity for the item just added (barcode/keyboard flow).
                      setTimeout(() => { const el = document.querySelector<HTMLInputElement>(`[data-qty-idx="${index}"]`); el?.focus(); el?.select(); }, 0);
                    }}
                    placeholder="Item / scan barcode" />
                  <input type="text" value={item.hsn_code} onChange={(e) => updateItem(index, 'hsn_code', e.target.value.replace(/\D/g, ''))} placeholder="9983" maxLength={8} className="rounded-lg border border-neutral-200 px-2 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                  <div>
                    <input type="number" data-qty-idx={index} value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} min="0" step="0.001" className={`w-full rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 ${stockWarn ? 'border-amber-400' : 'border-neutral-200'}`} />
                  </div>
                  <input type="number" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} min="0" step="0.01" className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                  <input type="number" value={item.discount_pct} onChange={(e) => updateItem(index, 'discount_pct', Math.min(100, parseFloat(e.target.value) || 0))} min="0" max="100" step="0.01" className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                  <select value={item.gst_rate} onChange={(e) => updateItem(index, 'gst_rate', parseInt(e.target.value))} className="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
                    {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                  </select>
                  <div className="text-right text-sm font-medium">{money(totals.lines[index]?.amount ?? 0)}</div>
                  <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} disabled={items.length === 1} className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30" aria-label="Remove item">×</button>
                </div>
                {stockWarn && (
                  <p className="text-xs text-amber-600 col-span-full">
                    ⚠ Only {item.stock_qty} in stock — qty {item.quantity} may cause a shortfall
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => setItems((prev) => [...prev, emptyItem(defaultGst)])} className="mt-3 text-sm text-neutral-500 hover:text-neutral-900">+ Add line item</button>

        {/* Totals */}
        <div className="mt-6 border-t border-neutral-100 pt-4">
          <div className="ml-auto w-80 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>{money(totals.lineSubtotal)}</span></div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <span className="text-neutral-600">Discount</span>
                <select value={billDiscType} onChange={(e) => setBillDiscType(e.target.value as '' | 'percent' | 'amount')} className="rounded border border-neutral-200 px-1 py-0.5 text-xs">
                  <option value="">none</option><option value="percent">%</option><option value="amount">{CURRENCY_SYMBOLS[currency] ?? currency}</option>
                </select>
                {billDiscType && <input type="number" value={billDiscValue} onChange={(e) => setBillDiscValue(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="w-20 rounded border border-neutral-200 px-1.5 py-0.5 text-xs" />}
              </div>
              <span className="text-neutral-600">− {money(totals.billDiscountAmount)}</span>
            </div>
            <div className="flex justify-between text-neutral-600"><span>Taxable Value</span><span>{money(totals.taxableTotal)}</span></div>
            <div className="flex justify-between text-neutral-600"><span>GST</span><span>{money(totals.gstTotal)}</span></div>
            <label className="flex items-center justify-between gap-2 text-neutral-600">
              <span className="flex items-center gap-2"><input type="checkbox" checked={roundOff} onChange={(e) => setRoundOff(e.target.checked)} /> Round off</span>
              <span>{totals.roundOff >= 0 ? '+' : '−'} {money(Math.abs(totals.roundOff))}</span>
            </label>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold"><span>Total</span><span>{money(totals.total)}</span></div>
            <p className="pt-1 text-xs italic text-neutral-500">{amountInWords(totals.total, currency)}</p>
          </div>
        </div>
      </div>

      {/* Payment (real invoices, on create only) */}
      {isInvoice && mode === 'create' && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-medium">Payment</h2>
          <p className="mb-4 mt-1 text-sm text-neutral-500">How is the customer paying for this invoice?</p>
          <div className="flex flex-wrap gap-2">
            {([['credit', 'On Credit (Udhaar)'], ['cash', 'Cash'], ['upi', 'UPI'], ['card', 'Card'], ['bank_transfer', 'Bank Transfer']] as const).map(([m, label]) => (
              <button key={m} type="button" onClick={() => { setPayMethod(m); if (m !== 'credit') setPayAmount(totals.total.toFixed(2)); }}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${payMethod === m ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:bg-neutral-50'}`}>{label}</button>
            ))}
          </div>
          {payMethod === 'credit' ? (
            <p className="mt-3 text-xs text-amber-600">Invoice will stay outstanding. {customerId ? "The full amount is added to the customer's account (udhaar) in their ledger." : 'Link a saved customer above to track this in their ledger.'}</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-neutral-600">Amount received</label>
                <div className="flex gap-2">
                  <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} min="0" step="0.01" placeholder={totals.total.toFixed(2)} className={inputCls} />
                  <button type="button" onClick={() => setPayAmount(totals.total.toFixed(2))} className="whitespace-nowrap rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50">Full</button>
                </div>
                <p className="mt-1 text-xs text-neutral-400">{(parseFloat(payAmount) || 0) >= totals.total - 0.01 ? 'Marks the invoice as paid.' : `Partial — ${money(Math.max(0, totals.total - (parseFloat(payAmount) || 0)))} will stay outstanding.`}</p>
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-600">Reference / UTR / Txn No.</label>
                <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="optional" className={inputCls} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Terms */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <label className="mb-1 block text-sm font-medium text-neutral-700">Terms &amp; Conditions</label>
        <textarea value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} rows={2} placeholder="Payment terms, warranty, jurisdiction, etc." className={inputCls} />
      </div>

      <p className="text-right text-[11px] text-neutral-400">
        Shortcuts: <b>Ctrl+Enter</b> save · <b>Alt+N</b> new · <b>Alt+P</b> print · <b>Alt+L</b> add line · <b>Enter</b> next field · <b>↑ ↓</b> pick from list
      </p>

      {/* Actions */}
      <div className="flex flex-wrap justify-end gap-3">
        {mode === 'create' && (
          <button type="button" onClick={() => handleSubmit('new')} disabled={pending} className="rounded-md border border-neutral-300 px-5 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50">Save &amp; New</button>
        )}
        <button type="button" onClick={() => handleSubmit('print')} disabled={pending} className="rounded-md border border-neutral-300 px-5 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50">Save &amp; Print</button>
        <button type="button" onClick={() => handleSubmit('save')} disabled={pending} className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
          {pending ? 'Saving…' : mode === 'edit' ? `Update ${cfg.short}` : isInvoice && payMethod !== 'credit' && mode === 'create' ? 'Save & Record Payment' : `Save ${cfg.short}`}
        </button>
      </div>
    </div>
  );
}
