import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { buildEWayJson } from '@/lib/invoice/govt';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const [{ data: invoice }, { data: gst }, { data: org }] = await Promise.all([
    supabase.from('invoices').select('*, invoice_items(*)').eq('id', params.id).eq('org_id', ctx.org.id).maybeSingle(),
    supabase.from('org_gst_settings').select('gstin,legal_name,state_code').eq('org_id', ctx.org.id).maybeSingle(),
    supabase.from('organizations').select('name,city').eq('id', ctx.org.id).maybeSingle(),
  ]);

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (invoice.doc_type !== 'invoice') return NextResponse.json({ error: 'e-Way bill applies to tax invoices only' }, { status: 400 });

  const json = buildEWayJson(
    { ...invoice, items: invoice.invoice_items ?? [] },
    { gstin: gst?.gstin, legal_name: gst?.legal_name || org?.name, state_code: gst?.state_code, city: org?.city },
  );

  return new NextResponse(JSON.stringify(json, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${invoice.invoice_number}-eway.json"`,
    },
  });
}
