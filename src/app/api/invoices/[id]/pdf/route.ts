import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import InvoicePDF from '@/lib/pdf/InvoicePDF';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const admin    = createAdminClient();

  const [{ data: invoice }, { data: gstSettings }] = await Promise.all([
    supabase.from('invoices').select('*, invoice_items(*)').eq('id', params.id).eq('org_id', ctx.org.id).single(),
    admin.from('org_gst_settings').select('gstin,state_code').eq('org_id', ctx.org.id).maybeSingle(),
  ]);

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const items = (invoice.invoice_items ?? []).map((item: any) => ({
    description: item.description,
    quantity:    item.quantity,
    unit_price:  item.unit_price,
    gst_rate:    item.gst_rate,
    gst_amount:  item.gst_amount,
    amount:      item.amount,
    hsn_code:    item.hsn_code,
  }));

  const invData = {
    invoice_number:  invoice.invoice_number,
    status:          invoice.status,
    issue_date:      invoice.issue_date,
    due_date:        invoice.due_date,
    customer_name:   invoice.customer_name,
    customer_email:  invoice.customer_email,
    customer_gstin:  invoice.customer_gstin,
    billing_address: invoice.billing_address,
    subtotal:        invoice.subtotal,
    gst_amount:      invoice.gst_amount,
    total:           invoice.total,
    notes:           invoice.notes,
    place_of_supply: invoice.place_of_supply,
    igst_amount:     invoice.igst_amount,
    cgst_amount:     invoice.cgst_amount,
    sgst_amount:     invoice.sgst_amount,
    items,
    org: {
      name:       ctx.org.name,
      gstin:      gstSettings?.gstin,
      state_code: gstSettings?.state_code,
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(InvoicePDF, { inv: invData }) as any);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
