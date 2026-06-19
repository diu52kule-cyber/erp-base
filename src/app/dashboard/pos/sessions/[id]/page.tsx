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
  const { data: session } = await supabase
    .from('pos_sessions').select('*').eq('id', params.id).eq('org_id', ctx.org.id).maybeSingle();
  if (!session) redirect('/dashboard/pos/sessions');

  const { data: orders } = await supabase
    .from('pos_orders').select('order_number,total,payment_method,created_at')
    .eq('session_id', params.id).order('created_at', { ascending: false });
  const list = orders ?? [];

  const byMethod: Record<string, number> = { cash: 0, upi: 0, card: 0 };
  list.forEach((o) => { byMethod[o.payment_method] = (byMethod[o.payment_method] ?? 0) + Number(o.total ?? 0); });
  const totalSales = list.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const expectedCash = Number(session.opening_float ?? 0) + byMethod.cash;
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
          ['Orders', String(list.length)],
          ['Total sales', fmt(totalSales)],
          ['Opening float', fmt(Number(session.opening_float ?? 0))],
          ['Expected cash', fmt(expectedCash)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-400">{l}</p>
            <p className="mt-1 text-xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment breakdown + orders */}
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold text-sm mb-3">Payment breakdown</h2>
            <div className="space-y-2 text-sm">
              {(['cash', 'upi', 'card'] as const).map((m) => (
                <div key={m} className="flex justify-between">
                  <span className="capitalize text-neutral-500">{m}</span>
                  <span className="font-medium">{fmt(byMethod[m] ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>

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
                    <span className="font-medium">{fmt(Number(o.total ?? 0))}</span>
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
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Variance</span>
              <span className="font-medium">{fmt(Number(session.closing_cash ?? 0) - expectedCash)}</span></div>
            <Link href="/dashboard/pos" className="block rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-semibold text-white hover:bg-neutral-700">Back to POS</Link>
          </div>
        )}
      </div>
    </div>
  );
}
