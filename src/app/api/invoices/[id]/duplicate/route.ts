import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { invoiceRowToInput } from '@/lib/invoice/server';
import { createDocument } from '@/lib/invoice/create';
import { isDocType } from '@/lib/invoice/docTypes';

// Clone any document as a fresh draft of the same type.
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

  const { data: gstSettings } = await supabase
    .from('org_gst_settings')
    .select('state_code')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  const input = invoiceRowToInput(source, source.invoice_items ?? []);
  input.issue_date = new Date().toISOString().split('T')[0];

  const docType = isDocType(source.doc_type) ? source.doc_type : 'invoice';
  const result = await createDocument(
    supabase,
    {
      orgId: ctx.org.id,
      userId: ctx.user.id,
      hasLedger: ctx.enabledModules.has('ledger'),
      orgStateCode: gstSettings?.state_code ?? null,
    },
    input,
    docType,
  );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ id: result.id });
}
