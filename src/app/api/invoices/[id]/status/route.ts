import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import type { InvoiceStatus } from '@/lib/types/billing';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('billing')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { status }: { status: InvoiceStatus } = await req.json();

  const supabase = createClient();
  const { error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', params.id)
    .eq('org_id', ctx.org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
