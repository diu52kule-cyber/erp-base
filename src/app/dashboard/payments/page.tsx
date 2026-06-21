import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { PAYMENT_METHOD_LABELS } from '@/lib/types/payments';
import type { Payment } from '@/lib/types/payments';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

const METHOD_STYLES: Record<string, string> = {
  cash: 'bg-green-50 text-green-700',
  upi: 'bg-purple-50 text-purple-700',
  card: 'bg-sky-50 text-sky-700',
  bank_transfer: 'bg-blue-50 text-blue-700',
  cheque: 'bg-yellow-50 text-yellow-700',
  razorpay: 'bg-indigo-50 text-indigo-700',
  credit: 'bg-amber-50 text-amber-700',
};

export default async function PaymentsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('payments')) redirect('/dashboard');

  const supabase = createClient();

  const [{ data: payments }, { data: pendingInvoices }] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount, method, paid_at, reference_number, invoice_id, invoices(invoice_number, customer_name)')
      .eq('org_id', ctx.org!.id)
      .eq('status', 'completed')
      .order('paid_at', { ascending: false })
      .returns<(Payment & { invoices: { invoice_number: string; customer_name: string } | null })[]>(),
    supabase
      .from('invoices')
      .select('id, invoice_number, customer_name, total')
      .eq('org_id', ctx.org!.id)
      .eq('doc_type', 'invoice')
      .in('status', ['draft', 'sent']),
  ]);

  const totalCollected = (payments ?? []).reduce((s, p) => s + p.amount, 0);
  const totalPending = (pendingInvoices ?? []).reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payments</h1>
        <Link
          href="/dashboard/payments/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          Record Payment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Total Collected</p>
          <p className="mt-1 text-2xl font-semibold">{fmt(totalCollected)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">Pending (unpaid invoices)</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{fmt(totalPending)}</p>
        </div>
      </div>

      {!payments?.length ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
          No payments recorded yet.{' '}
          <Link href="/dashboard/payments/new" className="text-neutral-900 underline">
            Record your first payment.
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Customer / Invoice</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(p.paid_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    {p.invoices ? (
                      <div>
                        <p className="font-medium text-neutral-900">
                          {p.invoices.customer_name}
                        </p>
                        <Link
                          href={`/dashboard/billing/${p.invoice_id}`}
                          className="text-xs text-neutral-400 hover:underline"
                        >
                          {p.invoices.invoice_number}
                        </Link>
                      </div>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${METHOD_STYLES[p.method] ?? ''}`}
                    >
                      {PAYMENT_METHOD_LABELS[p.method]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                    {p.reference_number ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {fmt(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
