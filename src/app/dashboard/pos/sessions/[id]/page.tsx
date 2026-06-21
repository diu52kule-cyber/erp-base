import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import CloseSessionForm from './CloseSessionForm';

export const dynamic = 'force-dynamic';

function fmt(n: number) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

export default async function POSSessionDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('pos') || !ctx.org) redirect('/dashboard');

  const supabase = await createClient();
  const [{ data: session }, { data: orders }, { data: movements }] = await Promise.all([
    supabase.from('pos_sessions').select('*').eq('id', params.id).eq('org_id', ctx.org.id).maybeSingle(),
    supabase.from('pos_orders').select('order_number,total,payment_method,order_type,split_tenders,created_at')
      .eq('session_id', params.id).order('created_at', { ascending: false }),
    supabase.from('pos_cash_movements').select('*').eq('session_id', params.id).order('created_at', { ascending: true }),
  ]);

  if (!session) redirect('/dashboard/pos/sessions');

  const list = orders ?? [];
  const cashMoves = movements ?? [];

  // Build payment breakdown (unpack split_tenders for multi-method orders)
  const byMethod: Record<string, number> = { cash: 0, upi: 0, card: 0 };
  list.forEach((o) => {
    const isRefund = o.order_type === 'refund';
    const sign = isRefund ? -1 : 1;
    if (o.payment_method === 'split' && Array.isArray(o.split_tenders)) {
      (o.split_tenders as { method: string; amount: number }[]).forEach((t) => {
        byMethod[t.method] = (byMethod[t.method] ?? 0) + sign * Number(t.amount ?? 0);
      });
    } else {
      byMethod[o.payment_method] = (byMethod[o.payment_method] ?? 0) + sign * Number(o.total ?? 0);
    }
  });

  const totalSales = list.filter((o) => o.order_type !== 'refund').reduce((s, o) => s + Number(o.total ?? 0), 0);
  const totalRefunds = list.filter((o) => o.order_type === 'refund').reduce((s, o) => s + Math.abs(Number(o.total ?? 0)), 0);
  const cashIn  = cashMoves.filter((m) => m.type === 'in').reduce((s, m) => s + Number(m.amount), 0);
  const cashOut = cashMoves.filter((m) => m.type === 'out').reduce((s, m) => s + Number(m.amount), 0);
  const expectedCash = Number(session.opening_float ?? 0) + (byMethod.cash ?? 0) + cashIn - cashOut;
  const isOpen = session.status === 'open';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/pos/sessions" className="text-sm text-neutral-500 hover:text-neutral-900">← Sessions</Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Session</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isOpen ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>{session.status}</span>
        </div>
        <p className="mt-1 text-sm text-neutral-400">
          Opened {new Date(session.opened_at).toLocaleString('en-IN')}
          {session.closed_at && ` · Closed ${new Date(session.closed_at).toLocaleString('en-IN')}`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Orders', String(list.filter((o) => o.order_type !== 'refund').length)],
          ['Total sales', fmt(totalSales)],
          ['Refunds', fmt(totalRefunds)],
          ['Expected cash', fmt(expectedCash)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-400">{l}</p>
            <p className="mt-1 text-xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          {/* Payment breakdown */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold text-sm mb-3">Payment breakdown</h2>
            <div className="space-y-2 text-sm">
              {(['cash', 'upi', 'card'] as const).map((m) => (
                <div key={m} className="flex justify-between">
                  <span className="capitalize text-neutral-500">{m === 'upi' ? 'UPI' : m.charAt(0).toUpperCase() + m.slice(1)}</span>
                  <span className="font-medium">{fmt(byMethod[m] ?? 0)}</span>
                </div>
              ))}
              <div className="border-t border-neutral-100 pt-2 flex justify-between font-semibold">
                <span>Opening float</span><span>{fmt(Number(session.opening_float ?? 0))}</span>
              </div>
              {cashIn > 0 && <div className="flex justify-between text-green-600"><span>Cash in</span><span>+{fmt(cashIn)}</span></div>}
              {cashOut > 0 && <div className="flex justify-between text-red-600"><span>Cash out</span><span>−{fmt(cashOut)}</span></div>}
              <div className="border-t border-neutral-100 pt-2 flex justify-between font-semibold">
                <span>Expected cash</span><span>{fmt(expectedCash)}</span>
              </div>
            </div>
          </div>

          {/* Cash movements */}
          {cashMoves.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-4 py-2.5 text-sm font-semibold">Cash movements</div>
              <ul className="divide-y divide-neutral-100">
                {cashMoves.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div>
                      <span className={`font-medium ${m.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.type === 'in' ? '+' : '−'}{fmt(Number(m.amount))}
                      </span>
                      {m.reason && <span className="ml-2 text-neutral-400 text-xs">{m.reason}</span>}
                    </div>
                    <span className="text-xs text-neutral-400">{new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Orders list */}
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 px-4 py-2.5 text-sm font-semibold">Orders</div>
            {list.length === 0 ? (
              <p className="p-6 text-center text-sm text-neutral-400">No orders in this session.</p>
            ) : (
              <ul className="divide-y divide-neutral-100 max-h-72 overflow-y-auto">
                {list.map((o) => (
                  <li key={o.order_number} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-mono text-xs">{o.order_number}</span>
                    <span className="capitalize text-xs text-neutral-400">{o.payment_method}</span>
                    {o.order_type === 'refund' && <span className="rounded-full bg-red-50 text-red-600 text-xs px-1.5 py-0.5">refund</span>}
                    <span className={`font-medium ${o.order_type === 'refund' ? 'text-red-500' : ''}`}>{o.order_type === 'refund' ? '−' : ''}{fmt(Math.abs(Number(o.total ?? 0)))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Close / closed summary */}
        {isOpen ? (
          <CloseSessionForm sessionId={session.id} expectedCash={expectedCash} />
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
            <h2 className="font-semibold">Closed</h2>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Counted cash</span><span className="font-medium">{fmt(Number(session.closing_cash ?? 0))}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Expected cash</span><span className="font-medium">{fmt(expectedCash)}</span></div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Variance</span>
              <span className={`font-medium ${Number(session.closing_cash ?? 0) - expectedCash < -0.01 ? 'text-red-600' : Number(session.closing_cash ?? 0) - expectedCash > 0.01 ? 'text-blue-600' : 'text-green-600'}`}>
                {fmt(Number(session.closing_cash ?? 0) - expectedCash)}
              </span>
            </div>
            {session.variance_reason && (
              <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                <span className="font-medium">Reason:</span> {session.variance_reason}
              </div>
            )}
            <Link href="/dashboard/pos" className="block rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-semibold text-white hover:bg-neutral-700">Back to POS</Link>
          </div>
        )}
      </div>
    </div>
  );
}
