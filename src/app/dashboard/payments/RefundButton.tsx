'use client';

import { useState } from 'react';

export default function RefundButton({ paymentId, amount }: { paymentId: string; amount: number }) {
  const [pending, setPending] = useState(false);

  async function handleRefund() {
    if (!confirm(`Issue a full refund of ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}? This cannot be undone.`)) return;
    setPending(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/refund`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        setPending(false);
      } else {
        window.location.reload();
      }
    } catch {
      alert('Refund failed');
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleRefund}
      disabled={pending}
      className="text-xs text-red-500 hover:underline disabled:opacity-50"
    >
      {pending ? '…' : 'Refund'}
    </button>
  );
}
