'use client';

import { useState } from 'react';

export default function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm(`Archive "${productName}"? It will be hidden from all lists but historical data is preserved.`)) return;
    setPending(true);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) { alert(data.error); setPending(false); return; }
      window.location.href = '/dashboard/inventory';
    } catch {
      alert('Delete failed');
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? '…' : 'Archive'}
    </button>
  );
}
