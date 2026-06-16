'use client';
import { useState, useEffect } from 'react';

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } }
}

export default function PaywallActions({ amount, period }: { amount: number; period: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document.getElementById('rzp-checkout')) return;
    const s = document.createElement('script');
    s.id = 'rzp-checkout';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  async function pay() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/billing/subscription/create-order', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not start payment'); setLoading(false); return; }
      if (!window.Razorpay) { setError('Payment library still loading — try again in a moment.'); setLoading(false); return; }

      const rzp = new window.Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount,
        currency: data.currency,
        name: 'ERP Platform',
        description: `Subscription (${period})`,
        handler: () => {
          // Webhook activates the plan; poll briefly then reload.
          setError(null);
          setLoading(true);
          setTimeout(() => window.location.reload(), 3000);
        },
        modal: { ondismiss: () => setLoading(false) },
        theme: { color: '#171717' },
      });
      rzp.open();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (amount <= 0) return null;

  return (
    <div className="space-y-2">
      <button onClick={pay} disabled={loading}
        className="w-full rounded-xl bg-neutral-900 py-3.5 text-base font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors">
        {loading ? 'Processing…' : `Pay ₹${amount.toLocaleString('en-IN')} & reactivate`}
      </button>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      <p className="text-center text-xs text-neutral-400">Secure payment via Razorpay · {period === 'yearly' ? 'Billed yearly' : 'Billed monthly'}</p>
    </div>
  );
}
