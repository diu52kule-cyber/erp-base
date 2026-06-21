import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('purchase')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { grn_id, po_id, cost_type, amount, notes } = body;

  if (!cost_type || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Cost type and amount required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('landed_costs')
    .insert({
      org_id: ctx.org.id,
      grn_id: grn_id || null,
      po_id: po_id || null,
      cost_type,
      amount: Number(amount),
      notes: notes || null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
