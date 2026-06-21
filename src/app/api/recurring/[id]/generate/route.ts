import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { runRecurring } from '@/lib/invoice/recurring';

// Manually generate the next invoice from a recurring template ("Generate now").
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('billing')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data: row } = await supabase
    .from('recurring_invoices')
    .select('*')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: gst } = await supabase
    .from('org_gst_settings')
    .select('state_code')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  const result = await runRecurring(supabase, row, gst?.state_code ?? null, ctx.enabledModules.has('ledger'));
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ id: result.id });
}
