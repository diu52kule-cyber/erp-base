import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(_req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('purchase')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createClient();
  const { data } = await supabase
    .from('vendor_advances')
    .select('*')
    .eq('org_id', ctx.org.id)
    .order('advance_date', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('purchase')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { vendor_name, vendor_id, amount, method, reference_number, advance_date, notes } = body;

  if (!vendor_name?.trim() || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Vendor name and amount required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('vendor_advances')
    .insert({
      org_id: ctx.org.id,
      vendor_name: vendor_name.trim(),
      vendor_id: vendor_id || null,
      amount: Number(amount),
      method: method || 'bank_transfer',
      reference_number: reference_number || null,
      advance_date: advance_date || new Date().toISOString().split('T')[0],
      notes: notes || null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
