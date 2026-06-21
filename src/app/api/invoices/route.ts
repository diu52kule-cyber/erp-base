import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { validateInvoiceInput } from '@/lib/invoice/server';
import { createDocument } from '@/lib/invoice/create';
import { isDocType, type DocType } from '@/lib/invoice/docTypes';
import type { CreateInvoiceInput } from '@/lib/types/billing';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  const docType = req.nextUrl.searchParams.get('doc_type') || 'invoice';
  const { data } = await supabase
    .from('invoices')
    .select('id,invoice_number,customer_name,total,status,issue_date,currency')
    .eq('org_id', ctx.org.id)
    .eq('doc_type', docType)
    .order('created_at', { ascending: false })
    .limit(200);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('billing')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const input: CreateInvoiceInput = await req.json();
  const validationError = validateInvoiceInput(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const docType: DocType = isDocType(input.doc_type) ? input.doc_type : 'invoice';
  const supabase = createClient();

  const { data: gstSettings } = await supabase
    .from('org_gst_settings')
    .select('state_code')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

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
