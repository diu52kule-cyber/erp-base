'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type KDSOrder = {
  id: string;
  order_number: string;
  table_label: string | null;
  customer_name: string | null;
  kds_status: 'new' | 'preparing' | 'ready' | 'served';
  total: number;
  created_at: string;
  lines: { description: string; quantity: number }[];
};

const KDS_COLS: { key: KDSOrder['kds_status']; label: string; bg: string; border: string; next: KDSOrder['kds_status'] | null; action: string }[] = [
  { key: 'new',       label: 'New Orders',  bg: 'bg-red-900/40',    border: 'border-red-700',    next: 'preparing', action: 'Start' },
  { key: 'preparing', label: 'Preparing',   bg: 'bg-amber-900/40',  border: 'border-amber-700',  next: 'ready',     action: 'Ready' },
  { key: 'ready',     label: 'Ready',       bg: 'bg-green-900/40',  border: 'border-green-700',  next: 'served',    action: 'Served' },
];

function relTime(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function KDSClient({ orgId, initialOrders }: { orgId: string; initialOrders: KDSOrder[] }) {
  const [orders, setOrders] = useState<KDSOrder[]>(initialOrders);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('pos_orders')
        .select('id,order_number,table_label,customer_name,kds_status,total,created_at,lines:pos_order_lines(description,quantity)')
        .eq('org_id', orgId)
        .neq('kds_status', 'served')
        .order('created_at', { ascending: true });
      setOrders((data ?? []) as KDSOrder[]);
    } catch {}
  }, [orgId]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`kds-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_orders', filter: `org_id=eq.${orgId}` }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, load]);

  async function advance(order: KDSOrder, next: KDSOrder['kds_status']) {
    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, kds_status: next } : o));
    try {
      const res = await fetch(`/api/pos/orders/${order.id}/kds`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kds_status: next }),
      });
      if (!res.ok) load(); // revert on error
    } catch { load(); }
  }

  const byStatus = (status: KDSOrder['kds_status']) => orders.filter((o) => o.kds_status === status);
  const totalNew = byStatus('new').length;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-700 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">Kitchen Display</span>
          {totalNew > 0 && (
            <span className="animate-pulse rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold">
              {totalNew} NEW
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-400">{new Date(now).toLocaleTimeString('en-IN')}</span>
      </div>

      {/* Columns */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {KDS_COLS.map((col) => {
          const colOrders = byStatus(col.key);
          return (
            <div key={col.key} className={`flex flex-1 flex-col border-r border-neutral-700 ${col.bg}`}>
              <div className={`border-b ${col.border} px-4 py-2 flex items-center justify-between`}>
                <span className="font-medium text-sm">{col.label}</span>
                <span className="rounded-full bg-neutral-700 px-2 py-0.5 text-xs">{colOrders.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {colOrders.length === 0 && (
                  <p className="text-center text-xs text-neutral-500 mt-4">Empty</p>
                )}
                {colOrders.map((order) => {
                  const age = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
                  const isOld = col.key === 'preparing' && age >= 10;
                  return (
                    <div
                      key={order.id}
                      className={`rounded-xl border p-3 space-y-2 ${col.border} bg-neutral-800/60 ${isOld ? 'border-red-400' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono font-bold text-sm">{order.order_number}</span>
                          {order.table_label && (
                            <span className="ml-2 rounded bg-neutral-700 px-1.5 py-0.5 text-xs">T:{order.table_label}</span>
                          )}
                          {order.customer_name && (
                            <p className="text-xs text-neutral-400 mt-0.5">{order.customer_name}</p>
                          )}
                        </div>
                        <span className={`text-xs tabular-nums ${isOld ? 'text-red-400 font-bold' : 'text-neutral-400'}`}>
                          {relTime(order.created_at)}
                        </span>
                      </div>
                      <ul className="space-y-0.5">
                        {(order.lines ?? []).map((l, i) => (
                          <li key={i} className="text-xs">
                            <span className="font-semibold">{l.quantity}×</span> {l.description}
                          </li>
                        ))}
                      </ul>
                      {col.next && (
                        <button
                          onClick={() => advance(order, col.next!)}
                          className={`w-full rounded-lg py-2 text-xs font-semibold transition-colors ${
                            col.key === 'new'       ? 'bg-amber-600 hover:bg-amber-500' :
                            col.key === 'preparing' ? 'bg-green-600 hover:bg-green-500' :
                            'bg-neutral-600 hover:bg-neutral-500'
                          }`}
                        >
                          {col.action} ✓
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* QR orders section */}
      <QROrdersSidebar orgId={orgId} />
    </div>
  );
}

function QROrdersSidebar({ orgId }: { orgId: string }) {
  const [qrOrders, setQrOrders] = useState<any[]>([]);

  const loadQr = useCallback(async () => {
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('pos_qr_orders')
        .select('id,table_name,customer_name,items,total,status,created_at')
        .eq('org_id', orgId)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: true })
        .limit(20);
      setQrOrders(data ?? []);
    } catch {}
  }, [orgId]);

  useEffect(() => {
    loadQr();
    const supabase = createClient();
    const ch = supabase.channel(`kds-qr-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_qr_orders', filter: `org_id=eq.${orgId}` }, loadQr)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, loadQr]);

  if (qrOrders.length === 0) return null;

  return (
    <div className="border-t border-neutral-700 px-4 py-2">
      <p className="text-xs font-semibold text-purple-400 mb-2">QR ORDERS — {qrOrders.length}</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {qrOrders.map((o) => (
          <div key={o.id} className="shrink-0 rounded-lg border border-purple-700 bg-purple-900/30 p-3 min-w-[160px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">T:{o.table_name ?? '?'}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${o.status === 'pending' ? 'bg-amber-700 text-amber-100' : 'bg-blue-700 text-blue-100'}`}>
                {o.status}
              </span>
            </div>
            {(o.items ?? []).slice(0, 3).map((item: any, i: number) => (
              <p key={i} className="text-xs">{item.qty}× {item.name}</p>
            ))}
            {(o.items ?? []).length > 3 && <p className="text-xs text-neutral-400">+{(o.items ?? []).length - 3} more</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
