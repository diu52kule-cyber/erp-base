import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { PAYMENT_METHOD_LABELS } from '@/lib/types/payments';
import type { Payment } from '@/lib/types/payments';
import RemindersButton from './RemindersButton';
import RefundButton from './RefundButton';
import PageHotkeys from '@/components/PageHotkeys';

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

type PaymentRow = Payment & {
  invoices: { invoice_number: string; customer_name: string } | null;
  contacts: { name: string } | null;
};

export default async function PaymentsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('payments')) redirect('/dashboard');

  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  const [
    { data: payments },
    { data: pendingInvoices },
    { data: overdueInvoices },
    { data: advances },
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount, method, payment_type, paid_at, reference_number, invoice_id, contact_id, refund_of_payment_id, invoices(invoice_number, customer_name), contacts(name)')
      .eq('org_id', ctx.org!.id)
      .eq('status', 'completed')
      .order('paid_at', { ascending: false })
      .returns<PaymentRow[]>(),
    supabase
      .from('invoices')
      .select('id, invoice_number, customer_name, total')
      .eq('org_id', ctx.org!.id)
      .eq('doc_type', 'invoice')
      .in('status', ['draft', 'sent', 'partial']),
    supabase
      .from('invoices')
      .select('id')
      .eq('org_id', ctx.org!.id)
      .eq('doc_type', 'invoice')
      .in('status', ['sent', 'partial'])
      .lt('due_date', today)
      .not('customer_email', 'is', null),
    supabase
      .from('payments')
      .select('amount')
      .eq('org_id', ctx.org!.id)
      .eq('payment_type', 'advance')
      .eq('status', 'completed'),
  ]);

  const nonRefunds = (payments ?? []).filter((p) => p.payment_type !== 'refund');
  const refunds = (payments ?? []).filter((p) => p.payment_type === 'refund');
  const totalCollected = nonRefunds.reduce((s, p) => s + p.amount, 0);
  const totalRefunded = refunds.reduce((s, p) => s + p.amount, 0);
  const totalPending = (pendingInvoices ?? []).reduce((s, i) => s + i.total, 0);
  const totalAdvances = (advances ?? []).reduce((s, a) => s + Number(a.amount), 0);
  const overdueCount = overdueInvoices?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHotkeys newHref="/dashboard/payments/new" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payments</h1>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <RemindersButton overdueCount={overdueCount} />
          )}
          <Link
            href="/dashboard/payments/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
          >
            Record Payment
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm text-neutral-500">Total Collected</p>
          <p className="mt-1 text-2xl font-semibold">{fmt(totalCollected)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm text-neutral-500">Pending (unpaid invoices)</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{fmt(totalPending)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm text-neutral-500">Advances Received</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{fmt(totalAdvances)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-800">
          <p className="text-sm text-neutral-500">Refunds Issued</p>
          <p className="mt-1 text-2xl font-semibold text-red-500">{fmt(totalRefunded)}</p>
        </div>
      </div>

      {!payments?.length ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">
          No payments recorded yet.{' '}
          <Link href="/dashboard/payments/new" className="text-neutral-900 underline">
            Record your first payment.
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Customer / Invoice</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {(payments ?? []).map((p) => {
                const isRefund = p.payment_type === 'refund';
                const isAdvance = p.payment_type === 'advance';
                return (
                  <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(p.paid_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      {p.invoices ? (
                        <div>
                          <p className="font-medium">{p.invoices.customer_name}</p>
                          <Link
                            href={`/dashboard/billing/${p.invoice_id}`}
                            className="text-xs text-neutral-400 hover:underline"
                          >
                            {p.invoices.invoice_number}
                          </Link>
                        </div>
                      ) : p.contacts ? (
                        <p className="font-medium">{p.contacts.name}</p>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isRefund ? (
                        <span className="inline-block rounded-full bg-red-50 text-red-600 px-2.5 py-0.5 text-xs font-medium">Refund</span>
                      ) : isAdvance ? (
                        <span className="inline-block rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-medium">Advance</span>
                      ) : (
                        <span className="inline-block rounded-full bg-green-50 text-green-700 px-2.5 py-0.5 text-xs font-medium">Invoice</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${METHOD_STYLES[p.method] ?? ''}`}>
                        {PAYMENT_METHOD_LABELS[p.method]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      {p.reference_number ?? '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${isRefund ? 'text-red-500' : ''}`}>
                      {isRefund ? '−' : ''}{fmt(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isRefund && (
                        <RefundButton paymentId={p.id} amount={p.amount} />
                      )}
                    </td>
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
