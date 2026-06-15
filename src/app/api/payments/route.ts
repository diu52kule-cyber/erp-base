import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import type { RecordPaymentInput } from '@/lib/types/payments';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('payments')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const input: RecordPaymentInput = await req.json();

  const supabase = createClient();

  const { error: payErr } = await supabase.from('payments').insert({
    org_id: ctx.org.id,
    invoice_id: input.invoiceId || null,
    amount: input.amount,
    method: input.method,
    status: 'completed',
    reference_number: input.referenceNumber?.trim() || null,
    notes: input.notes?.trim() || null,
    paid_at: input.paidAt,
    created_by: ctx.user.id,
  });

  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });

  if (input.invoiceId) {
    await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', input.invoiceId)
      .eq('org_id', ctx.org.id);
  }

  return NextResponse.json({ success: true });
}
