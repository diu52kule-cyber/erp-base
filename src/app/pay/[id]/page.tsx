import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Invoice, InvoiceItem } from '@/lib/types/billing';
import { fmtMoney } from '@/lib/invoice/format';
import PayPortalClient from './PayPortalClient';

function fmt(n: number, currency = 'INR') { return fmtMoney(n, currency); }

export default async function PublicPayPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const [{ data: invoice }, { error: itmErr, data: items }] = await Promise.all([
    admin.from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', params.id)
      .order('sort_order', { referencedTable: 'invoice_items', ascending: true })
      .maybeSingle<Invoice & { invoice_items: InvoiceItem[] }>(),
    admin.from('invoice_items').select('*').eq('invoice_id', params.id).order('sort_order'),
  ]);

  if (!invoice) notFound();

  // Only show portal for active invoices
  if (!['sent', 'partial'].includes(invoice.status)) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center max-w-sm w-full">
          <div className="text-4xl mb-3">{invoice.status === 'paid' ? '✅' : '🔒'}</div>
          <h1 className="text-lg font-semibold">{invoice.status === 'paid' ? 'Already paid' : 'Invoice unavailable'}</h1>
          <p className="mt-2 text-sm text-neutral-500">
            {invoice.status === 'paid' ? `${invoice.invoice_number} has already been paid. Thank you!` : 'This invoice is not currently payable.'}
          </p>
        </div>
      </main>
    );
  }

  // Fetch org info (name + GST)
  const [{ data: org }, { data: gst }] = await Promise.all([
    admin.from('organizations').select('name, city, phone').eq('id', invoice.org_id!).maybeSingle(),
    admin.from('org_gst_settings').select('gstin, legal_name').eq('org_id', invoice.org_id!).maybeSingle(),
  ]);

  const currency    = invoice.currency ?? 'INR';
  const amountPaid  = invoice.amount_paid ?? 0;
  const balanceDue  = Math.max(0, (invoice.total ?? 0) - amountPaid);
  const lineItems   = (invoice.invoice_items ?? items ?? []) as InvoiceItem[];
  const sellerName  = gst?.legal_name || org?.name || '';
  const rzpEnabled  = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) && currency === 'INR';

  return (
    <main className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">Invoice from</p>
          <h1 className="text-xl font-semibold">{sellerName}</h1>
          {org?.city && <p className="text-sm text-neutral-500">{org.city}</p>}
        </div>

        {/* Invoice card */}
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          {/* Invoice header */}
          <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400">Invoice</p>
              <p className="font-mono font-semibold">{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-400">Date</p>
              <p className="text-sm font-medium">{new Date(invoice.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Customer */}
          <div className="px-6 py-4 border-b border-neutral-100">
            <p className="text-xs text-neutral-400">Bill to</p>
            <p className="font-medium">{invoice.customer_name}</p>
            {invoice.customer_email && <p className="text-sm text-neutral-500">{invoice.customer_email}</p>}
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="border-b border-neutral-100">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-400">
                  <tr>
                    <th className="px-6 py-2 text-left font-medium">Item</th>
                    <th className="px-6 py-2 text-right font-medium">Qty</th>
                    <th className="px-6 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-2.5">{item.description}</td>
                      <td className="px-6 py-2.5 text-right text-neutral-500">{item.quantity}</td>
                      <td className="px-6 py-2.5 text-right font-medium">{fmt(item.amount ?? 0, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="px-6 py-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-neutral-500"><span>Subtotal</span><span>{fmt(invoice.subtotal ?? 0, currency)}</span></div>
            {(invoice.gst_amount ?? 0) > 0 && (
              <div className="flex justify-between text-neutral-500"><span>GST</span><span>{fmt(invoice.gst_amount ?? 0, currency)}</span></div>
            )}
            <div className="flex justify-between border-t border-neutral-100 pt-2 text-base font-semibold">
              <span>Total</span><span>{fmt(invoice.total ?? 0, currency)}</span>
            </div>
            {amountPaid > 0 && (
              <div className="flex justify-between text-green-600"><span>Amount paid</span><span>−{fmt(amountPaid, currency)}</span></div>
            )}
            {amountPaid > 0 && (
              <div className="flex justify-between font-bold text-neutral-900 border-t border-neutral-100 pt-2">
                <span>Balance due</span><span>{fmt(balanceDue, currency)}</span>
              </div>
            )}
          </div>

          {/* Payment button */}
          <div className="px-6 pb-6 pt-2">
            <PayPortalClient
              invoiceId={invoice.id}
              balanceDue={balanceDue}
              invoiceNumber={invoice.invoice_number}
              customerName={invoice.customer_name}
              customerEmail={invoice.customer_email ?? ''}
              rzpConfigured={rzpEnabled}
            />
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400">
          {gst?.gstin && <span>GSTIN: {gst.gstin} · </span>}
          {org?.phone && <span>{org.phone} · </span>}
          Powered by ERP
        </p>
      </div>
    </main>
  );
}
