import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import InvoicePDF from '@/lib/pdf/InvoicePDF';
import { isDocType, type DocType } from '@/lib/invoice/docTypes';
import { upiUri, upiQrDataUrl } from '@/lib/invoice/upi';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const admin = createAdminClient();

  const [{ data: invoice }, { data: gstSettings }, { data: bill }] = await Promise.all([
    supabase.from('invoices').select('*, invoice_items(*)').eq('id', params.id).eq('org_id', ctx.org.id).single(),
    admin.from('org_gst_settings').select('gstin,state_code,legal_name').eq('org_id', ctx.org.id).maybeSingle(),
    admin.from('org_invoice_settings').select('*').eq('org_id', ctx.org.id).maybeSingle(),
  ]);

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const docType: DocType = isDocType(invoice.doc_type) ? invoice.doc_type : 'invoice';
  const currency = invoice.currency ?? 'INR';
  const sellerName = gstSettings?.legal_name || ctx.org.name;
  const balanceDue = Math.max(0, (invoice.total ?? 0) - (invoice.amount_paid ?? 0));

  let upiQr: string | null = null;
  if (docType === 'invoice' && bill?.show_upi_qr && bill?.upi_id && currency === 'INR') {
    upiQr = await upiQrDataUrl(upiUri(bill.upi_id, sellerName, balanceDue || invoice.total, invoice.invoice_number));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (invoice.invoice_items ?? []).map((item: any) => ({
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    gst_rate: item.gst_rate,
    gst_amount: item.gst_amount,
    amount: item.amount,
    discount_amount: item.discount_amount,
    hsn_code: item.hsn_code,
  }));

  const invData = {
    doc_type: docType,
    currency,
    invoice_number: invoice.invoice_number,
    reference_no: invoice.reference_no,
    status: invoice.status,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    customer_name: invoice.customer_name,
    customer_email: invoice.customer_email,
    customer_gstin: invoice.customer_gstin,
    billing_address: invoice.billing_address,
    subtotal: invoice.subtotal,
    discount_amount: invoice.discount_amount,
    discount_type: invoice.discount_type,
    discount_value: invoice.discount_value,
    round_off: invoice.round_off,
    amount_paid: invoice.amount_paid,
    gst_amount: invoice.gst_amount,
    total: invoice.total,
    notes: invoice.notes,
    terms: invoice.terms,
    place_of_supply: invoice.place_of_supply,
    igst_amount: invoice.igst_amount,
    cgst_amount: invoice.cgst_amount,
    sgst_amount: invoice.sgst_amount,
    items,
    org: { name: sellerName, gstin: gstSettings?.gstin, state_code: gstSettings?.state_code },
    bank: bill ? {
      show_bank: bill.show_bank, bank_name: bill.bank_name, account_name: bill.account_name,
      account_number: bill.account_number, ifsc: bill.ifsc, branch: bill.branch, upi_id: bill.upi_id,
      logo_url: bill.logo_url, signature_url: bill.signature_url,
    } : null,
    upiQr,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(InvoicePDF, { inv: invData }) as any);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
