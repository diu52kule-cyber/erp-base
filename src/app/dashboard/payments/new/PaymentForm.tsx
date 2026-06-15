'use client';

import { useState, useEffect } from 'react';
import {
  createRazorpayOrder,
  verifyAndRecordPayment,
} from '../actions';
import { PAYMENT_METHOD_LABELS } from '@/lib/types/payments';
import type { PaymentMethod } from '@/lib/types/payments';

type InvoiceOption = {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
};

type Props = {
  invoices: InvoiceOption[];
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

const MANUAL_METHODS: PaymentMethod[] = ['cash', 'upi', 'bank_transfer', 'cheque'];

export default function PaymentForm({
  invoices,
  preselectedInvoiceId,
  gatewayEnabled,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayLoading, setRazorpayLoading] = useState(false);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(
    preselectedInvoiceId ?? ''
  );
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paidAt, setPaidAt] = useState(today());

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  // Pre-fill amount when invoice is selected
  useEffect(() => {
    if (selectedInvoice) setAmount(selectedInvoice.total.toFixed(2));
  }, [selectedInvoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId || undefined,
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!gatewayEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Payment gateway not configured — recording payments manually.{' '}
          <span className="text-amber-600">
            Set <code className="font-mono">RAZORPAY_KEY_ID</code> and{' '}
            <code className="font-mono">RAZORPAY_KEY_SECRET</code> to enable
            online payments.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
        {/* Invoice selector */}
        <div>
          <label className="mb-1 block text-sm text-neutral-600">
            Invoice (optional)
          </label>
          <select
            value={selectedInvoiceId}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="">— Not linked to an invoice —</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} · {inv.customer_name} · {fmt(inv.total)}
              </option>
            ))}
          </select>
          {invoices.length === 0 && (
            <p className="mt-1 text-xs text-neutral-400">
              No unpaid invoices. You can still record a payment without linking one.
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="mb-1 block text-sm text-neutral-600">
            Amount (₹) *
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {/* Payment date */}
        <div>
          <label className="mb-1 block text-sm text-neutral-600">
            Payment Date *
          </label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {/* Method */}
        <div>
          <label className="mb-2 block text-sm text-neutral-600">
            Payment Method *
          </label>
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
          <label className="mb-1 block text-sm text-neutral-600">
            Reference / UTR / Cheque No.
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. 123456789012"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm text-neutral-600">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {gatewayEnabled && selectedInvoiceId && (
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
          {pending ? 'Saving…' : 'Save Payment'}
        </button>
      </div>
    </div>
  );
}
