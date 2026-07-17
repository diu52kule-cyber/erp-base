import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { Invoice, InvoiceItem, InvoiceStatus } from '@/lib/types/billing';
import { DOC_TYPES, isDocType, type DocType } from '@/lib/invoice/docTypes';
import { fmtMoney } from '@/lib/invoice/format';
import { amountInWords } from '@/lib/invoice/words';
import { renderInvoiceTemplate, type TemplateData } from '@/lib/invoice/template';
import { upiUri, upiQrDataUrl } from '@/lib/invoice/upi';
import StatusButton from './StatusButton';
import InvoiceActions from './InvoiceActions';
import AutoPrint from './AutoPrint';
import PrintCopies from './PrintCopies';
import AttachmentPanel from '@/components/AttachmentPanel';
import PrintButton from '@/components/PrintButton';
import Comments from '@/components/Comments';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  sent: 'bg-blue-50 text-blue-700',
  partial: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
  refunded: 'bg-red-50 text-red-600',
  cancelled: 'bg-neutral-100 text-neutral-400',
};

export default async function InvoiceDetailPage({
  params, searchParams,
}: {
  params: { id: string };
  searchParams: { print?: string };
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
  const docType: DocType = isDocType(invoice.doc_type) ? invoice.doc_type : 'invoice';
  const cfg = DOC_TYPES[docType];
  const currency = invoice.currency ?? 'INR';
  const money = (n: number) => fmtMoney(n, currency);

  const [{ data: org }, { data: acct }, { data: bill }] = await Promise.all([
    supabase.from('organizations').select('name, city, phone, business_type').eq('id', ctx.org!.id).maybeSingle(),
    supabase.from('org_gst_settings').select('gstin, legal_name').eq('org_id', ctx.org!.id).maybeSingle(),
    supabase.from('org_invoice_settings').select('*').eq('org_id', ctx.org!.id).maybeSingle(),
  ]);

  const sellerName = acct?.legal_name || org?.name || ctx.org?.name || '';
  const sellerGstin = acct?.gstin ?? null;

  const discountAmt = invoice.discount_amount ?? 0;
  const displaySubtotal = (invoice.subtotal ?? 0) + discountAmt;
  const isIGST = (invoice.igst_amount ?? 0) > 0;
  const amountPaid = invoice.amount_paid ?? 0;
  const balanceDue = Math.max(0, (invoice.total ?? 0) - amountPaid);
  const roundOff = invoice.round_off ?? 0;
  const isInvoice = docType === 'invoice';

  // Bill-format settings (accent colour, B&W, copies, paper, show logo/HSN).
  const accent = bill?.accent_color || '#171717';
  const bwClass = bill?.print_color_mode === 'bw' ? 'print-bw' : '';
  const paper = bill?.paper_size || 'A4';
  const showLogo = bill?.show_logo !== false;
  const showHsnCol = bill?.show_hsn !== false && items.some((i) => i.hsn_code);
  const pageSize = paper === 'thermal_80' ? '80mm auto' : paper;
  const pageMargin = paper === 'thermal_80' ? '4mm' : '12mm';

  // GST summary buckets (tax breakup by rate).
  const gstMap = new Map<number, { taxable: number; gst: number }>();
  for (const it of items) {
    const r = Number(it.gst_rate) || 0;
    const cur = gstMap.get(r) ?? { taxable: 0, gst: 0 };
    cur.taxable += Number(it.amount) || 0;
    cur.gst += Number(it.gst_amount) || 0;
    gstMap.set(r, cur);
  }
  const gstBuckets = [...gstMap.entries()].sort((a, b) => a[0] - b[0]).map(([rate, v]) => ({ rate, taxable: v.taxable, gst: v.gst }));
  const showGstSummary = bill?.show_gst_summary === true && gstBuckets.length > 0;
  const showSignature = bill?.show_signature !== false;
  const docTitle = bill?.invoice_title || cfg.title;

  // Fully org-defined custom HTML template — replaces the built-in layout.
  const useCustom = !!(bill?.use_custom_template && (bill?.custom_template_html || '').trim());
  let customHtml = '';
  if (useCustom) {
    const tdata: TemplateData = {
      fields: {
        seller_name: sellerName,
        seller_address: [org?.business_type, org?.city].filter(Boolean).join(' · '),
        seller_phone: org?.phone ?? '',
        seller_email: '',
        seller_gstin: sellerGstin ?? '',
        header_note: bill?.header_note ?? '',
        invoice_title: docTitle,
        invoice_number: invoice.invoice_number,
        issue_date: new Date(invoice.issue_date).toLocaleDateString('en-IN'),
        due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : '',
        customer_name: invoice.customer_name,
        customer_gstin: invoice.customer_gstin ?? '',
        customer_address: invoice.billing_address ?? '',
        customer_email: invoice.customer_email ?? '',
        place_of_supply: invoice.place_of_supply ?? '',
        subtotal: money(displaySubtotal),
        discount: discountAmt > 0 ? money(discountAmt) : '-',
        taxable: money(invoice.subtotal),
        cgst: money(invoice.cgst_amount ?? (isIGST ? 0 : (invoice.gst_amount ?? 0) / 2)),
        sgst: money(invoice.sgst_amount ?? (isIGST ? 0 : (invoice.gst_amount ?? 0) / 2)),
        igst: money(invoice.igst_amount ?? 0),
        gst_total: money(invoice.gst_amount ?? 0),
        round_off: money(roundOff),
        total: money(invoice.total),
        amount_paid: money(amountPaid),
        balance_due: money(balanceDue),
        amount_words: amountInWords(invoice.total, currency),
        notes: invoice.notes ?? '',
        terms: invoice.terms ?? '',
        footer_note: bill?.footer_note ?? '',
        bank_name: bill?.bank_name ?? '',
        account_name: bill?.account_name ?? '',
        account_number: bill?.account_number ?? '',
        ifsc: bill?.ifsc ?? '',
        upi_id: bill?.upi_id ?? '',
        logo_url: (bill?.logo_url && showLogo) ? bill.logo_url : '',
      },
      items: items.map((it, i) => ({
        sn: String(i + 1),
        description: it.description,
        hsn: it.hsn_code ?? '',
        qty: String(it.quantity),
        rate: money(it.unit_price),
        disc: (it.discount_amount ?? 0) > 0 ? money(it.discount_amount ?? 0) : '',
        gst_rate: `${it.gst_rate}%`,
        cgst: money(isIGST ? 0 : (it.gst_amount ?? 0) / 2),
        sgst: money(isIGST ? 0 : (it.gst_amount ?? 0) / 2),
        igst: money(isIGST ? (it.gst_amount ?? 0) : 0),
        amount: money(it.amount + it.gst_amount),
      })),
      gst_summary: gstBuckets.map((b) => ({
        rate: `${b.rate}%`,
        taxable: money(b.taxable),
        cgst: money(isIGST ? 0 : b.gst / 2),
        sgst: money(isIGST ? 0 : b.gst / 2),
        igst: money(isIGST ? b.gst : 0),
        total: money(b.gst),
      })),
    };
    customHtml = renderInvoiceTemplate(bill.custom_template_html!, tdata);
  }

  // UPI QR (INR invoices only) for the printed document.
  let upiQr: string | null = null;
  if (isInvoice && bill?.show_upi_qr && bill?.upi_id && currency === 'INR') {
    upiQr = await upiQrDataUrl(upiUri(bill.upi_id, sellerName, balanceDue || invoice.total, invoice.invoice_number));
  }

  return (
    <div className="space-y-6">
      <AutoPrint enabled={searchParams.print === '1'} />
      <PrintCopies copies={bill?.print_copies ?? 1} />
      <style dangerouslySetInnerHTML={{ __html: `@media print{@page{size:${pageSize};margin:${pageMargin}}}` }} />

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/billing" className="text-sm text-neutral-500 hover:text-neutral-900">← Back</Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[invoice.status as InvoiceStatus] ?? STATUS_STYLES.draft}`}>{invoice.status}</span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">{cfg.label}</span>
            </div>
            <p className="text-sm text-neutral-500">
              {sellerName} &middot; {cfg.short} {new Date(invoice.issue_date).toLocaleDateString('en-IN')}
              {invoice.due_date && ` · Due ${new Date(invoice.due_date).toLocaleDateString('en-IN')}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {isInvoice && ctx.enabledModules.has('payments') && balanceDue > 0 && invoice.status !== 'cancelled' && (
              <Link href={`/dashboard/payments/new?invoice=${invoice.id}`} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">Collect Payment</Link>
            )}
            <StatusButton invoiceId={invoice.id} currentStatus={invoice.status as InvoiceStatus} />
          </div>
          <div className="flex items-center gap-2"><PrintButton /></div>
        </div>
      </div>

      {/* Management actions (not printed) */}
      <div className="no-print">
        <InvoiceActions
          invoiceId={invoice.id}
          docType={docType}
          status={invoice.status}
          hasEmail={!!invoice.customer_email}
          invoiceNumber={invoice.invoice_number}
          customerName={invoice.customer_name}
          customerPhone={null}
          total={invoice.total}
          sellerName={sellerName}
        />
      </div>

      {/* Document card (printable) */}
      {useCustom ? (
        <div id="invoice-print-area" className={`overflow-x-auto rounded-xl border border-neutral-200 bg-white p-6 ${bwClass}`} dangerouslySetInnerHTML={{ __html: customHtml }} />
      ) : (
      <div id="invoice-print-area" className={`rounded-xl border border-neutral-200 bg-white p-8 sm:p-10 ${bwClass}`}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-6">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {bill?.logo_url && showLogo && <img src={bill.logo_url} alt="" className="h-14 w-14 rounded object-contain" />}
            <div>
              <div className="text-xl font-bold text-neutral-900">{sellerName}</div>
              <div className="mt-0.5 text-sm capitalize text-neutral-500">{org?.business_type}{org?.city ? ` · ${org.city}` : ''}</div>
              {org?.phone && <div className="text-sm text-neutral-500">{org.phone}</div>}
              {sellerGstin && <div className="font-mono text-sm text-neutral-500">GSTIN: {sellerGstin}</div>}
              {bill?.header_note && <div className="text-sm text-neutral-500">{bill.header_note}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tracking-tight" style={{ color: accent }}>{docTitle}</div>
            <div className="mt-1 font-mono text-sm text-neutral-500">{invoice.invoice_number}</div>
            {invoice.reference_no && <div className="text-xs text-neutral-400">Ref: {invoice.reference_no}</div>}
            <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[invoice.status as InvoiceStatus] ?? STATUS_STYLES.draft}`}>{invoice.status}</span>
          </div>
        </div>

        {/* Bill-to + dates */}
        <div className="mt-6 flex flex-wrap justify-between gap-6">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">{docType === 'credit_note' ? 'Credit To' : 'Bill To'}</p>
            <p className="font-semibold text-neutral-900">{invoice.customer_name}</p>
            {invoice.customer_email && <p className="text-sm text-neutral-600">{invoice.customer_email}</p>}
            {invoice.customer_gstin && <p className="font-mono text-sm text-neutral-600">GSTIN: {invoice.customer_gstin}</p>}
            {invoice.billing_address && <p className="max-w-xs text-sm text-neutral-600">{invoice.billing_address}</p>}
          </div>
          <div className="text-sm">
            <div className="flex justify-between gap-8"><span className="text-neutral-400">Date</span><span className="text-neutral-700">{new Date(invoice.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
            {invoice.due_date && <div className="mt-1 flex justify-between gap-8"><span className="text-neutral-400">{docType === 'quotation' ? 'Valid Until' : 'Due'}</span><span className="text-neutral-700">{new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>}
            {invoice.place_of_supply && <div className="mt-1 flex justify-between gap-8"><span className="text-neutral-400">Place of Supply</span><span className="text-neutral-700">{invoice.place_of_supply}</span></div>}
            {currency !== 'INR' && <div className="mt-1 flex justify-between gap-8"><span className="text-neutral-400">Currency</span><span className="text-neutral-700">{currency}</span></div>}
          </div>
        </div>

        {/* Line items */}
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
                <th className="pb-2 text-left font-medium">Description</th>
                {showHsnCol && <th className="pb-2 text-right font-medium">HSN</th>}
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Rate</th>
                {items.some((i) => (i.discount_amount ?? 0) > 0) && <th className="pb-2 text-right font-medium">Disc</th>}
                <th className="pb-2 text-right font-medium">GST%</th>
                <th className="pb-2 text-right font-medium">GST</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-2">{item.description}</td>
                  {showHsnCol && <td className="py-3 text-right font-mono text-xs text-neutral-500">{item.hsn_code ?? '—'}</td>}
                  <td className="py-3 text-right text-neutral-600">{item.quantity}</td>
                  <td className="py-3 text-right text-neutral-600">{money(item.unit_price)}</td>
                  {items.some((i) => (i.discount_amount ?? 0) > 0) && <td className="py-3 text-right text-neutral-600">{(item.discount_amount ?? 0) > 0 ? money(item.discount_amount ?? 0) : '—'}</td>}
                  <td className="py-3 text-right text-neutral-600">{item.gst_rate}%</td>
                  <td className="py-3 text-right text-neutral-600">{money(item.gst_amount)}</td>
                  <td className="py-3 text-right font-medium">{money(item.amount + item.gst_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>{money(displaySubtotal)}</span></div>
            {discountAmt > 0 && <div className="flex justify-between text-neutral-600"><span>Discount{invoice.discount_type === 'percent' ? ` (${invoice.discount_value}%)` : ''}</span><span>− {money(discountAmt)}</span></div>}
            {discountAmt > 0 && <div className="flex justify-between text-neutral-600"><span>Taxable Value</span><span>{money(invoice.subtotal)}</span></div>}
            {isIGST ? (
              <div className="flex justify-between text-neutral-600"><span>IGST</span><span>{money(invoice.igst_amount ?? 0)}</span></div>
            ) : (
              <>
                <div className="flex justify-between text-neutral-600"><span>CGST</span><span>{money(invoice.cgst_amount ?? (invoice.gst_amount / 2))}</span></div>
                <div className="flex justify-between text-neutral-600"><span>SGST</span><span>{money(invoice.sgst_amount ?? (invoice.gst_amount / 2))}</span></div>
              </>
            )}
            {roundOff !== 0 && <div className="flex justify-between text-neutral-600"><span>Round Off</span><span>{roundOff >= 0 ? '+' : '−'} {money(Math.abs(roundOff))}</span></div>}
            <div className="mt-1 flex justify-between rounded-lg px-3 py-2.5 text-base font-semibold text-white" style={{ backgroundColor: accent }}><span>Total</span><span>{money(invoice.total)}</span></div>
            {isInvoice && amountPaid > 0 && (
              <>
                <div className="flex justify-between text-green-700"><span>Paid</span><span>− {money(amountPaid)}</span></div>
                <div className="flex justify-between font-semibold text-amber-700"><span>Balance Due</span><span>{money(balanceDue)}</span></div>
              </>
            )}
          </div>
        </div>

        {showGstSummary && (
          <div className="mt-6">
            <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">GST Summary</p>
            <table className="w-full max-w-md text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase text-neutral-400">
                  <th className="pb-1 text-left font-medium">Rate</th>
                  <th className="pb-1 text-right font-medium">Taxable</th>
                  {isIGST ? <th className="pb-1 text-right font-medium">IGST</th> : <><th className="pb-1 text-right font-medium">CGST</th><th className="pb-1 text-right font-medium">SGST</th></>}
                  <th className="pb-1 text-right font-medium">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {gstBuckets.map((b) => (
                  <tr key={b.rate}>
                    <td className="py-1 text-neutral-600">{b.rate}%</td>
                    <td className="py-1 text-right text-neutral-600">{money(b.taxable)}</td>
                    {isIGST ? <td className="py-1 text-right text-neutral-600">{money(b.gst)}</td> : <><td className="py-1 text-right text-neutral-600">{money(b.gst / 2)}</td><td className="py-1 text-right text-neutral-600">{money(b.gst / 2)}</td></>}
                    <td className="py-1 text-right font-medium">{money(b.gst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Amount in words */}
        <div className="mt-4 border-t border-neutral-100 pt-3 text-sm">
          <span className="text-neutral-400">Amount in words: </span>
          <span className="italic text-neutral-700">{amountInWords(invoice.total, currency)}</span>
        </div>

        {/* Bank / UPI + Notes/Terms */}
        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-neutral-100 pt-6 sm:grid-cols-2">
          <div className="space-y-4">
            {isInvoice && bill?.show_bank && (bill?.account_number || bill?.bank_name) && (
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">Bank Details</p>
                <div className="text-sm text-neutral-700">
                  {bill.bank_name && <div>{bill.bank_name}{bill.branch ? ` · ${bill.branch}` : ''}</div>}
                  {bill.account_name && <div>A/c Name: {bill.account_name}</div>}
                  {bill.account_number && <div className="font-mono">A/c No: {bill.account_number}</div>}
                  {bill.ifsc && <div className="font-mono">IFSC: {bill.ifsc}</div>}
                  {bill.upi_id && <div className="font-mono">UPI: {bill.upi_id}</div>}
                </div>
              </div>
            )}
            {invoice.notes && <div><p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">Notes</p><p className="text-sm text-neutral-600">{invoice.notes}</p></div>}
            {invoice.terms && <div><p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">Terms &amp; Conditions</p><p className="whitespace-pre-line text-sm text-neutral-600">{invoice.terms}</p></div>}
          </div>
          <div className="flex flex-col items-end justify-between gap-4">
            {upiQr && (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={upiQr} alt="UPI QR" className="h-32 w-32" />
                <p className="text-xs text-neutral-400">Scan to pay via UPI</p>
              </div>
            )}
            {bill?.signature_url && showSignature && (
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bill.signature_url} alt="" className="h-16 object-contain" />
                <p className="text-xs text-neutral-400">Authorised Signatory</p>
              </div>
            )}
          </div>
        </div>

        {bill?.footer_note && <p className="mt-6 whitespace-pre-line text-center text-xs text-neutral-500">{bill.footer_note}</p>}
        <p className="mt-10 border-t border-neutral-100 pt-4 text-center text-xs text-neutral-400">
          {docType === 'invoice' ? 'Thank you for your business' : ''} · {sellerName}
        </p>
      </div>
      )}

      {/* Attachments (not printed) */}
      <div className="no-print rounded-xl border border-neutral-200 bg-white p-6">
        <AttachmentPanel entityType="invoice" entityId={invoice.id} />
      </div>

      {/* Comments */}
      <div className="no-print">
        <Comments entityType="invoice" entityId={invoice.id} currentUserId={ctx.user.id} />
      </div>
    </div>
  );
}
