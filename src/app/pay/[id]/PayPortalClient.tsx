'use client';
import { useState } from 'react';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type Props = {
  invoiceId: string;
  balanceDue: number;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  rzpConfigured: boolean;
};

export default function PayPortalClient({ invoiceId, balanceDue, invoiceNumber, customerName, customerEmail, rzpConfigured }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [paid, setPaid]       = useState(false);

  async function handlePay() {
    setLoading(true);
    setError(null);

    try {
      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Failed to load payment gateway'));
          document.head.appendChild(s);
        });
      }

      const res = await fetch(`/api/pay/${invoiceId}/create-order`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Failed to initiate payment'); setLoading(false); return; }

      const rzp = new window.Razorpay!({
        key:         data.key_id,
        order_id:    data.order_id,
        amount:      data.amount,
        currency:    data.currency,
        name:        'Payment',
        description: data.description,
        prefill: {
          name:  data.customer_name || customerName,
          email: data.customer_email || customerEmail,
        },
        theme: { color: '#000000' },
        handler: () => {
          // Webhook at /api/payments/razorpay/webhook marks the invoice paid
          setPaid(true);
          setLoading(false);
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
      setLoading(false);
    }
  }

  if (paid) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-2">
        <div className="text-3xl">✅</div>
        <p className="font-semibold text-green-800">Payment received!</p>
        <p className="text-sm text-green-700">Thank you. Your payment for {invoiceNumber} has been recorded. You will receive a confirmation email shortly.</p>
      </div>
    );
  }

  if (!rzpConfigured) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
        Online payment is not enabled for this business. Please contact them directly.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <button
        onClick={handlePay}
        disabled={loading || balanceDue <= 0}
        className="w-full rounded-xl bg-neutral-900 px-6 py-4 text-base font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Opening payment…' : `Pay ₹${balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
      </button>
      <p className="text-center text-xs text-neutral-400">Secured by Razorpay · UPI · Cards · Net Banking</p>
    </div>
  );
}
