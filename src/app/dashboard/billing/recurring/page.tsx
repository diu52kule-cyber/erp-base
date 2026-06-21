import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { fmtMoney } from '@/lib/invoice/format';
import { computeInvoiceTotals } from '@/lib/invoice/calc';
import RecurringActions from './RecurringActions';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  paused: 'bg-amber-50 text-amber-700',
  ended: 'bg-neutral-100 text-neutral-500',
};

type Row = {
  id: string; title: string | null; customer_name: string; currency: string;
  frequency: string; interval_count: number; next_run_date: string; status: string;
  items: { quantity: number; unit_price: number; gst_rate: number; discount_pct?: number }[];
};

export default async function RecurringPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('billing')) redirect('/dashboard');

  const supabase = createClient();
  const { data } = await supabase
    .from('recurring_invoices')
    .select('id,title,customer_name,currency,frequency,interval_count,next_run_date,status,items')
    .eq('org_id', ctx.org!.id)
    .order('created_at', { ascending: false })
    .returns<Row[]>();

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recurring Invoices</h1>
        <Link href="/dashboard/billing/recurring/new" className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">New Recurring</Link>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-neutral-200">
        <Link href="/dashboard/billing?type=invoice" className="border-b-2 border-transparent px-3 py-2 text-sm text-neutral-500 hover:text-neutral-800">Invoices</Link>
        <span className="border-b-2 border-neutral-900 px-3 py-2 text-sm font-medium text-neutral-900">Recurring</span>
      </div>

      {!rows.length ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
          No recurring invoices.{' '}
          <Link href="/dashboard/billing/recurring/new" className="text-neutral-900 underline">Set up your first one.</Link>
          <p className="mt-2 text-xs text-neutral-400">Due invoices are generated automatically each day, or generate any one manually.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Customer / Title</th>
                <th className="px-4 py-3 text-left font-medium">Every</th>
                <th className="px-4 py-3 text-left font-medium">Next run</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => {
                const totals = computeInvoiceTotals(
                  (r.items ?? []).map((i) => ({ quantity: i.quantity, unit_price: i.unit_price, gst_rate: i.gst_rate, discount_type: (i.discount_pct ?? 0) > 0 ? 'percent' : undefined, discount_value: i.discount_pct })),
                  { roundOffEnabled: true },
                );
                return (
                  <tr key={r.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{r.customer_name}</p>
                      {r.title && <p className="text-xs text-neutral-400">{r.title}</p>}
                    </td>
                    <td className="px-4 py-3 capitalize text-neutral-600">{r.interval_count > 1 ? `${r.interval_count} × ` : ''}{r.frequency}</td>
                    <td className="px-4 py-3 text-neutral-600">{new Date(r.next_run_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtMoney(totals.total, r.currency ?? 'INR')}</td>
                    <td className="px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[r.status] ?? ''}`}>{r.status}</span></td>
                    <td className="px-4 py-3"><RecurringActions id={r.id} status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
