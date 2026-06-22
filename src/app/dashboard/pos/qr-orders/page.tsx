'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type QROrder = {
  id: string;
  table_name: string | null;
  customer_name: string | null;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  notes: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  rejected:  'bg-red-50 text-red-600',
};

function fmt(n: number) {
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function QROrdersPage() {
  const [orders, setOrders]   = useState<QROrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/pos/qr-orders');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch { setOrders([]); }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function updateStatus(id: string, status: string) {
    await fetch('/api/pos/qr-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  const pending = orders.filter((o) => o.status === 'pending');
  const rest    = orders.filter((o) => o.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/pos" className="text-sm text-neutral-500 hover:text-neutral-900">← POS</Link>
          <h1 className="mt-1 text-2xl font-semibold">QR Orders Inbox</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Customer orders placed by scanning table QR codes. Auto-refreshes every 30s.</p>
        </div>
        <button onClick={load} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : (
        <>
          {pending.length === 0 && (
            <div className="rounded-xl border border-neutral-200 p-8 text-center">
              <p className="text-neutral-400">No pending orders. New orders will appear here automatically.</p>
            </div>
          )}

          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending ({pending.length})</p>
              {pending.map((o) => (
                <OrderCard key={o.id} order={o} onUpdate={updateStatus} />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Recent</p>
              {rest.map((o) => (
                <OrderCard key={o.id} order={o} onUpdate={updateStatus} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrderCard({ order, onUpdate }: { order: QROrder; onUpdate: (id: string, status: string) => void }) {
  return (
    <div className={`rounded-xl border bg-white p-4 space-y-3 ${order.status === 'pending' ? 'border-amber-200 shadow-md' : 'border-neutral-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Table {order.table_name ?? '—'}</span>
            {order.customer_name && <span className="text-sm text-neutral-500">· {order.customer_name}</span>}
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">{new Date(order.created_at).toLocaleTimeString('en-IN')} · #{order.id.slice(-6).toUpperCase()}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? ''}`}>
          {order.status}
        </span>
      </div>

      <div className="space-y-1">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>{item.name} × {item.qty}</span>
            <span className="text-neutral-500">{fmt(item.price * item.qty)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold text-sm border-t border-neutral-100 pt-1 mt-1">
          <span>Total</span>
          <span>{fmt(order.total)}</span>
        </div>
      </div>

      {order.notes && (
        <p className="text-xs text-neutral-500 bg-neutral-50 rounded-lg px-2 py-1">📝 {order.notes}</p>
      )}

      {order.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate(order.id, 'confirmed')}
            className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            ✓ Confirm
          </button>
          <button
            onClick={() => onUpdate(order.id, 'rejected')}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-500 hover:text-red-600 hover:border-red-200"
          >
            Reject
          </button>
        </div>
      )}
      {order.status === 'confirmed' && (
        <button
          onClick={() => onUpdate(order.id, 'completed')}
          className="w-full rounded-lg border border-green-200 py-2 text-sm text-green-700 hover:bg-green-50"
        >
          Mark Completed
        </button>
      )}
    </div>
  );
}
