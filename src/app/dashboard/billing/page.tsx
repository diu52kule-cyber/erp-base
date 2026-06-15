import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { Invoice, InvoiceStatus } from '@/lib/types/billing';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
};

function fmt(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function BillingPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('billing')) redirect('/dashboard');

  const supabase = createClient();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_name, issue_date, total, status')
    .eq('org_id', ctx.org!.id)
    .order('created_at', { ascending: false })
    .returns<Pick<Invoice, 'id' | 'invoice_number' | 'customer_name' | 'issue_date' | 'total' | 'status'>[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Billing &amp; Invoicing</h1>
        <Link
          href="/dashboard/billing/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          New Invoice
        </Link>
      </div>

      {!invoices?.length ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
          No invoices yet.{' '}
          <Link
            href="/dashboard/billing/new"
            className="text-neutral-900 underline"
          >
            Create your first invoice.
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/billing/${inv.id}`}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {inv.customer_name}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(inv.issue_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {fmt(inv.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.status as InvoiceStatus] ?? STATUS_STYLES.draft}`}
                    >
                      {inv.status}
                    </span>
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
