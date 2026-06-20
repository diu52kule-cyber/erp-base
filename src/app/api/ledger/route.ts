import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

// Create a ledger entry (credit given or payment received)
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('ledger')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contact_id, type, amount, note, entry_date } = await req.json();
  if (!contact_id) return NextResponse.json({ error: 'Customer required' }, { status: 400 });
  const amt = Math.abs(Number(amount) || 0);
  if (amt <= 0) return NextResponse.json({ error: 'Enter an amount' }, { status: 400 });

  const t = ['credit', 'payment', 'opening', 'adjustment'].includes(type) ? type : 'credit';
  // payment reduces receivable (negative); everything else increases it (positive)
  const signed = t === 'payment' ? -amt : amt;

  const supabase = createClient();
  const { error } = await supabase.from('ledger_entries').insert({
    org_id: ctx.org.id,
    contact_id,
    type: t,
    amount: signed,
    note: note || null,
    entry_date: entry_date || new Date().toISOString().split('T')[0],
    created_by: ctx.user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Set a customer's credit limit
export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('ledger')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { contact_id, credit_limit } = await req.json();
  if (!contact_id) return NextResponse.json({ error: 'Customer required' }, { status: 400 });
  const supabase = createClient();
  const { error } = await supabase.from('contacts')
    .update({ credit_limit: credit_limit === null || credit_limit === '' ? null : Number(credit_limit) })
    .eq('id', contact_id).eq('org_id', ctx.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
