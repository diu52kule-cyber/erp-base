import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { Invoice, InvoiceStatus } from '@/lib/types/billing';
import { DOC_TYPES, isDocType, type DocType } from '@/lib/invoice/docTypes';
import { fmtMoney } from '@/lib/invoice/format';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  sent: 'bg-blue-50 text-blue-700',
  partial: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
  refunded: 'bg-red-50 text-red-600',
  cancelled: 'bg-neutral-100 text-neutral-400',
};

const TABS: { type: DocType | 'recurring'; label: string }[] = [
  { type: 'invoice', label: 'Invoices' },
  { type: 'quotation', label: 'Quotations' },
  { type: 'proforma', label: 'Proforma' },
  { type: 'delivery_challan', label: 'Delivery Challans' },
  { type: 'credit_note', label: 'Credit Notes' },
  { type: 'recurring', label: 'Recurring' },
];

export default async function BillingPage({ searchParams }: { searchParams: { type?: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('billing')) redirect('/dashboard');

  const docType: DocType = isDocType(searchParams.type) ? searchParams.type : 'invoice';
  const cfg = DOC_TYPES[docType];

  const supabase = createClient();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_name, issue_date, total, status, currency, amount_paid')
    .eq('org_id', ctx.org!.id)
    .eq('doc_type', docType)
    .order('created_at', { ascending: false })
    .returns<(Pick<Invoice, 'id' | 'invoice_number' | 'customer_name' | 'issue_date' | 'total' | 'status' | 'currency' | 'amount_paid'>)[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Billing &amp; Invoicing</h1>
        <Link href={`/dashboard/billing/new?type=${docType}`} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">New {cfg.label}</Link>
      </div>

      {/* Document tabs */}
      <div className="flex flex-wrap gap-1 border-b border-neutral-200">
        {TABS.map((t) => {
          const href = t.type === 'recurring' ? '/dashboard/billing/recurring' : `/dashboard/billing?type=${t.type}`;
          const active = t.type === docType;
          return (
            <Link key={t.type} href={href} className={`border-b-2 px-3 py-2 text-sm ${active ? 'border-neutral-900 font-medium text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>{t.label}</Link>
          );
        })}
      </div>

      {!invoices?.length ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
          No {cfg.label.toLowerCase()}s yet.{' '}
          <Link href={`/dashboard/billing/new?type=${docType}`} className="text-neutral-900 underline">Create your first {cfg.short.toLowerCase()}.</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{cfg.short} #</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                {docType === 'invoice' && <th className="px-4 py-3 text-right font-medium">Balance</th>}
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {invoices.map((inv) => {
                const balance = Math.max(0, (inv.total ?? 0) - (inv.amount_paid ?? 0));
                return (
                  <tr key={inv.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3"><Link href={`/dashboard/billing/${inv.id}`} className="font-medium text-neutral-900 hover:underline">{inv.invoice_number}</Link></td>
                    <td className="px-4 py-3 text-neutral-700">{inv.customer_name}</td>
                    <td className="px-4 py-3 text-neutral-500">{new Date(inv.issue_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtMoney(inv.total, inv.currency ?? 'INR')}</td>
                    {docType === 'invoice' && <td className={`px-4 py-3 text-right ${balance > 0 ? 'text-amber-600' : 'text-neutral-400'}`}>{balance > 0 ? fmtMoney(balance, inv.currency ?? 'INR') : '—'}</td>}
                    <td className="px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.status as InvoiceStatus] ?? STATUS_STYLES.draft}`}>{inv.status}</span></td>
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
