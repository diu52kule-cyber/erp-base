import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

function fmt(n: number) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

export default async function POSSessionsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('pos') || !ctx.org) redirect('/dashboard');
  const supabase = await createClient();
  const { data: sessions } = await supabase.from('pos_sessions').select('*')
    .eq('org_id', ctx.org.id).order('opened_at', { ascending: false }).limit(30);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/pos" className="text-sm text-neutral-500 hover:text-neutral-900">← POS</Link>
          <h1 className="mt-1 text-2xl font-semibold">Session History</h1>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
            <th className="px-4 py-3 text-left font-medium">Opened</th>
            <th className="px-4 py-3 text-left font-medium">Closed</th>
            <th className="px-4 py-3 text-right font-medium">Orders</th>
            <th className="px-4 py-3 text-right font-medium">Sales</th>
            <th className="px-4 py-3 text-right font-medium">Float</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {(sessions ?? []).map((s) => (
              <tr key={s.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">{new Date(s.opened_at).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-neutral-500">{s.closed_at ? new Date(s.closed_at).toLocaleString('en-IN') : '—'}</td>
                <td className="px-4 py-3 text-right">{s.order_count}</td>
                <td className="px-4 py-3 text-right font-medium">{fmt(s.total_sales)}</td>
                <td className="px-4 py-3 text-right text-neutral-500">{fmt(s.opening_float)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
