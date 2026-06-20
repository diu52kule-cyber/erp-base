import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { Invoice, InvoiceItem, InvoiceStatus } from '@/lib/types/billing';
import StatusButton from './StatusButton';
import InvoiceActions from './InvoiceActions';
import AttachmentPanel from '@/components/AttachmentPanel';
import PrintButton from '@/components/PrintButton';

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

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('billing')) redirect('/dashboard');

  const supabase = createClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', params.id)
    .eq('org_id', ctx.org!.id)
    .order('sort_order', { referencedTable: 'invoice_items', ascending: true })
    .maybeSingle<Invoice & { invoice_items: InvoiceItem[] }>();

  if (!invoice) notFound();

  const items = invoice.invoice_items ?? [];

  // Seller details for the invoice header ("From" block)
  const [{ data: org }, { data: acct }] = await Promise.all([
    supabase.from('organizations').select('name, city, phone, business_type').eq('id', ctx.org!.id).maybeSingle(),
    supabase.from('org_gst_settings').select('gstin, legal_name').eq('org_id', ctx.org!.id).maybeSingle(),
  ]);
  const sellerName = acct?.legal_name || org?.name || ctx.org?.name || '';
  const sellerGstin = acct?.gstin ?? null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/billing"
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            ← Back
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[invoice.status as InvoiceStatus] ?? STATUS_STYLES.draft}`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-sm text-neutral-500">
              {ctx.org?.name} &middot; Issued{' '}
              {new Date(invoice.issue_date).toLocaleDateString('en-IN')}
              {invoice.due_date &&
                ` · Due ${new Date(invoice.due_date).toLocaleDateString('en-IN')}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {ctx.enabledModules.has('payments') &&
              (invoice.status === 'draft' || invoice.status === 'sent') && (
                <Link
                  href={`/dashboard/payments/new?invoice=${invoice.id}`}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
                >
                  Collect Payment
                </Link>
              )}
            <StatusButton
              invoiceId={invoice.id}
              currentStatus={invoice.status as InvoiceStatus}
            />
          </div>
          <div className="flex items-center gap-2">
            <PrintButton />
            <InvoiceActions invoiceId={invoice.id} hasEmail={!!invoice.customer_email} />
          </div>
        </div>
      </div>

      {/* Invoice card (printable) */}
      <div id="invoice-print-area" className="rounded-xl border border-neutral-200 bg-white p-8 sm:p-10">
        {/* Header: seller + INVOICE */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-6">
          <div>
            <div className="text-xl font-bold text-neutral-900">{sellerName}</div>
            <div className="mt-0.5 text-sm capitalize text-neutral-500">
              {org?.business_type}{org?.city ? ` · ${org.city}` : ''}
            </div>
            {org?.phone && <div className="text-sm text-neutral-500">{org.phone}</div>}
            {sellerGstin && <div className="font-mono text-sm text-neutral-500">GSTIN: {sellerGstin}</div>}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tracking-tight text-neutral-900">INVOICE</div>
            <div className="mt-1 font-mono text-sm text-neutral-500">{invoice.invoice_number}</div>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[invoice.status as InvoiceStatus] ?? STATUS_STYLES.draft}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Bill-to + dates */}
        <div className="mt-6 flex flex-wrap justify-between gap-6">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">Bill To</p>
            <p className="font-semibold text-neutral-900">{invoice.customer_name}</p>
            {invoice.customer_email && <p className="text-sm text-neutral-600">{invoice.customer_email}</p>}
            {invoice.customer_gstin && <p className="font-mono text-sm text-neutral-600">GSTIN: {invoice.customer_gstin}</p>}
            {invoice.billing_address && <p className="max-w-xs text-sm text-neutral-600">{invoice.billing_address}</p>}
          </div>
          <div className="text-sm">
            <div className="flex justify-between gap-8">
              <span className="text-neutral-400">Issue date</span>
              <span className="text-neutral-700">{new Date(invoice.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            {invoice.due_date && (
              <div className="mt-1 flex justify-between gap-8">
                <span className="text-neutral-400">Due date</span>
                <span className="text-neutral-700">{new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
                <th className="pb-2 text-left font-medium">Description</th>
                {items.some((i) => i.hsn_code) && <th className="pb-2 text-right font-medium">HSN</th>}
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Rate</th>
                <th className="pb-2 text-right font-medium">GST%</th>
                <th className="pb-2 text-right font-medium">GST</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-2">{item.description}</td>
                  {items.some((i) => i.hsn_code) && <td className="py-3 text-right font-mono text-xs text-neutral-500">{item.hsn_code ?? '—'}</td>}
                  <td className="py-3 text-right text-neutral-600">{item.quantity}</td>
                  <td className="py-3 text-right text-neutral-600">{fmt(item.unit_price)}</td>
                  <td className="py-3 text-right text-neutral-600">{item.gst_rate}%</td>
                  <td className="py-3 text-right text-neutral-600">{fmt(item.gst_amount)}</td>
                  <td className="py-3 text-right font-medium">{fmt(item.amount + item.gst_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span><span>{fmt(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>GST</span><span>{fmt(invoice.gst_amount)}</span>
            </div>
            <div className="mt-1 flex justify-between rounded-lg bg-neutral-900 px-3 py-2.5 text-base font-semibold text-white">
              <span>Total</span><span>{fmt(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 border-t border-neutral-100 pt-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">Notes</p>
            <p className="text-sm text-neutral-600">{invoice.notes}</p>
          </div>
        )}

        <p className="mt-10 border-t border-neutral-100 pt-4 text-center text-xs text-neutral-400">
          Thank you for your business · {sellerName}
        </p>
      </div>

      {/* Attachments (not printed) */}
      <div className="no-print rounded-xl border border-neutral-200 bg-white p-6">
        <AttachmentPanel entityType="invoice" entityId={invoice.id} />
      </div>
    </div>
  );
}
