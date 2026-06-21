import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { invoiceRowToInput, validateInvoiceInput } from '@/lib/invoice/server';
import { createDocument } from '@/lib/invoice/create';
import type { CreateInvoiceInput } from '@/lib/types/billing';

// Raise a credit note (sales return) against an invoice. Body may carry an
// edited CreateInvoiceInput (adjusted quantities/amounts); if omitted, a full
// credit note is built from the source invoice.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
  if (source.doc_type !== 'invoice') {
    return NextResponse.json({ error: 'Credit notes can only be raised against invoices' }, { status: 400 });
  }

  let body: CreateInvoiceInput | null = null;
  try { body = (await req.json()) as CreateInvoiceInput; } catch { body = null; }

  const input: CreateInvoiceInput =
    body && body.items?.length ? body : invoiceRowToInput(source, source.invoice_items ?? []);
  input.source_doc_id = source.id;
  input.issue_date = input.issue_date || new Date().toISOString().split('T')[0];
  input.payment = null;

  const validationError = validateInvoiceInput(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

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
    'credit_note',
  );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ id: result.id });
}
