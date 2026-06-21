import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { invoiceRowToInput } from '@/lib/invoice/server';
import { createDocument } from '@/lib/invoice/create';

// Convert a quotation / proforma into a real tax invoice.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('billing')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data: source } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!['quotation', 'proforma'].includes(source.doc_type)) {
    return NextResponse.json({ error: 'Only quotations and proformas can be converted' }, { status: 400 });
  }

  const { data: gstSettings } = await supabase
    .from('org_gst_settings')
    .select('state_code')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  const input = invoiceRowToInput(source, source.invoice_items ?? []);
  input.source_doc_id = source.id;
  input.issue_date = new Date().toISOString().split('T')[0];

  const result = await createDocument(
    supabase,
    {
      orgId: ctx.org.id,
      userId: ctx.user.id,
      hasLedger: ctx.enabledModules.has('ledger'),
      orgStateCode: gstSettings?.state_code ?? null,
    },
    input,
    'invoice',
  );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ id: result.id });
}
