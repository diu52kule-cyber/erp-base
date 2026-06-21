'use client';

import { useState, useEffect } from 'react';
import {
  createRazorpayOrder,
  verifyAndRecordPayment,
} from '../actions';
import { PAYMENT_METHOD_LABELS } from '@/lib/types/payments';
import type { PaymentMethod, PaymentType } from '@/lib/types/payments';

type InvoiceOption = {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  amount_paid: number;
  balance: number;
};

type ContactOption = {
  id: string;
  name: string;
  email: string | null;
};

type Props = {
  invoices: InvoiceOption[];
  contacts: ContactOption[];
  preselectedInvoiceId?: string;
  gatewayEnabled: boolean;
};

const today = () => new Date().toISOString().split('T')[0];

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

const MANUAL_METHODS: PaymentMethod[] = ['cash', 'upi', 'card', 'bank_transfer', 'cheque'];

export default function PaymentForm({
  invoices,
  contacts,
  preselectedInvoiceId,
  gatewayEnabled,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayLoading, setRazorpayLoading] = useState(false);

  const [paymentType, setPaymentType] = useState<PaymentType>(
    preselectedInvoiceId ? 'invoice' : 'invoice'
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(preselectedInvoiceId ?? '');
  const [contactId, setContactId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paidAt, setPaidAt] = useState(today());

  // Multi-allocation state
  const [splitMode, setSplitMode] = useState(false);
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  useEffect(() => {
    if (selectedInvoice && !splitMode) {
      setAmount(selectedInvoice.balance.toFixed(2));
    }
  }, [selectedInvoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute split total
  const splitTotal = Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  // Overpayment check
  const parsedAmount = parseFloat(amount) || 0;
  const overpayment =
    paymentType === 'invoice' && !splitMode && selectedInvoice
      ? Math.max(0, parsedAmount - selectedInvoice.balance)
      : 0;

  async function handleRazorpayPayment() {
    if (!selectedInvoiceId) {
      setError('Select an invoice to collect payment for');
      return;
    }
    setError(null);
    setRazorpayLoading(true);

    try {
      const order = await createRazorpayOrder(selectedInvoiceId);
      if ('error' in order) {
        setError(order.error);
        return;
      }

      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.body.appendChild(s);
        });
      }

      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Payment',
        description: order.invoiceNumber,
        prefill: { name: order.customerName },
        theme: { color: '#171717' },
        handler: async (response: any) => {
          const result = await verifyAndRecordPayment({
            orderId: order.orderId,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            invoiceId: selectedInvoiceId,
            amountPaise: order.amount,
          });
          if ('error' in result) {
            setError(result.error);
          } else {
            window.location.href = '/dashboard/payments';
          }
        },
      });
      rzp.open();
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setRazorpayLoading(false);
    }
  }

  async function handleManualSubmit() {
    setError(null);

    // Build payload
    if (paymentType === 'invoice') {
      if (splitMode) {
        const allocationList = Object.entries(allocations)
          .filter(([, v]) => parseFloat(v) > 0)
          .map(([invoiceId, v]) => ({ invoiceId, amount: parseFloat(v) }));

        if (!allocationList.length) {
          setError('Add at least one invoice allocation');
          return;
        }
        if (!parsedAmount || parsedAmount <= 0) {
          setError('Enter a valid total amount');
          return;
        }
        setPending(true);
        try {
          const res = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentType: 'invoice',
              amount: parsedAmount,
              method,
              allocations: allocationList,
              referenceNumber: reference || undefined,
              notes: notes || undefined,
              paidAt,
            }),
          });
          const data = await res.json();
          if (data.error) { setError(data.error); setPending(false); return; }
          window.location.href = '/dashboard/payments';
        } catch (e: any) {
          setError(e?.message ?? 'Failed to save payment');
          setPending(false);
        }
        return;
      }

      // Single invoice
      if (!parsedAmount || parsedAmount <= 0) {
        setError('Enter a valid amount');
        return;
      }
    }

    if (paymentType === 'advance') {
      if (!contactId) {
        setError('Select the customer for this advance');
        return;
      }
      if (!parsedAmount || parsedAmount <= 0) {
        setError('Enter a valid amount');
        return;
      }
    }

    setPending(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType,
          invoiceId: paymentType === 'invoice' && !splitMode ? selectedInvoiceId || undefined : undefined,
          contactId: paymentType === 'advance' ? contactId : undefined,
          amount: parsedAmount,
          method,
          referenceNumber: reference || undefined,
          notes: notes || undefined,
          paidAt,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setPending(false);
      } else {
        window.location.href = '/dashboard/payments';
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save payment');
      setPending(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100';

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!gatewayEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Payment gateway not configured — recording payments manually.
        </div>
      )}

      {/* Payment type selector */}
      <div className="flex gap-2">
        {(['invoice', 'advance'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setPaymentType(t); setError(null); setSplitMode(false); }}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              paymentType === t
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {t === 'invoice' ? 'Invoice Payment' : 'Advance / On-Account'}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 p-6 space-y-5">

        {/* Invoice mode */}
        {paymentType === 'invoice' && !splitMode && (
          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Invoice (optional)</label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className={inputCls}
            >
              <option value="">— No invoice linked —</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} · {inv.customer_name} · Balance {fmt(inv.balance)}
                </option>
              ))}
            </select>
            {selectedInvoice && (
              <p className="mt-1 text-xs text-neutral-400">
                Invoice total {fmt(selectedInvoice.total)} · Paid {fmt(selectedInvoice.amount_paid)} · Balance due <strong>{fmt(selectedInvoice.balance)}</strong>
              </p>
            )}
          </div>
        )}

        {/* Split mode — multi-invoice allocation table */}
        {paymentType === 'invoice' && splitMode && (
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Allocate across invoices</label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 dark:border-neutral-700 p-3">
                  <input
                    type="checkbox"
                    checked={inv.id in allocations}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAllocations((a) => ({ ...a, [inv.id]: inv.balance.toFixed(2) }));
                      } else {
                        setAllocations((a) => { const n = { ...a }; delete n[inv.id]; return n; });
                      }
                    }}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.invoice_number} — {inv.customer_name}</p>
                    <p className="text-xs text-neutral-400">Balance {fmt(inv.balance)}</p>
                  </div>
                  {inv.id in allocations && (
                    <input
                      type="number"
                      value={allocations[inv.id]}
                      onChange={(e) => setAllocations((a) => ({ ...a, [inv.id]: e.target.value }))}
                      min="0"
                      step="0.01"
                      className="w-28 rounded-lg border border-neutral-200 dark:border-neutral-600 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  )}
                </div>
              ))}
            </div>
            {Object.keys(allocations).length > 0 && (
              <p className="mt-2 text-sm text-right text-neutral-500">
                Total allocated: <strong>{fmt(splitTotal)}</strong>
              </p>
            )}
          </div>
        )}

        {/* Advance mode — contact picker */}
        {paymentType === 'advance' && (
          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Customer *</label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Select customer —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              No invoice yet — money received upfront. This advance will be recorded against the customer's account.
            </p>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">
            {splitMode ? 'Total Amount Received (₹) *' : 'Amount (₹) *'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className={inputCls}
            />
            {selectedInvoice && !splitMode && (
              <button
                type="button"
                onClick={() => setAmount(selectedInvoice.balance.toFixed(2))}
                className="whitespace-nowrap rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
              >
                Full Balance
              </button>
            )}
          </div>
          {overpayment > 0 && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              ⚠ Amount exceeds invoice balance by {fmt(overpayment)} — the excess will be recorded as a payment without invoice link. Consider creating a separate advance.
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Payment Date *</label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Method */}
        <div>
          <label className="mb-2 block text-sm text-neutral-600 dark:text-neutral-400">Payment Method *</label>
          <div className="flex flex-wrap gap-2">
            {MANUAL_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                  method === m
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {PAYMENT_METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Reference */}
        <div>
          <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Reference / UTR / Cheque No.</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. 123456789012"
            className={inputCls}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes"
            className={inputCls}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {/* Split toggle (invoice mode only) */}
        {paymentType === 'invoice' && invoices.length > 1 && (
          <button
            type="button"
            onClick={() => { setSplitMode((s) => !s); setAllocations({}); setSelectedInvoiceId(''); setAmount(''); }}
            className="text-sm text-neutral-500 underline hover:text-neutral-900"
          >
            {splitMode ? 'Single invoice' : 'Split across multiple invoices'}
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          {gatewayEnabled && paymentType === 'invoice' && selectedInvoiceId && !splitMode && (
            <button
              type="button"
              onClick={handleRazorpayPayment}
              disabled={razorpayLoading || pending}
              className="rounded-md border border-indigo-600 px-5 py-2 text-sm text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
            >
              {razorpayLoading ? 'Opening…' : 'Pay Online via Razorpay'}
            </button>
          )}
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={pending || razorpayLoading}
            className="rounded-md bg-neutral-900 px-6 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {pending ? 'Saving…' : paymentType === 'advance' ? 'Save Advance' : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
