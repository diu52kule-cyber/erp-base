import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('accounting')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'payable' | 'receivable' | null (all)

  const supabase = await createClient();
  let q = supabase
    .from('tds_entries')
    .select('*')
    .eq('org_id', ctx.org.id)
    .order('entry_date', { ascending: false });

  if (type) q = q.eq('type', type);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('accounting')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tds_entries')
    .insert({
      org_id:       ctx.org.id,
      entry_date:   body.entry_date ?? new Date().toISOString().split('T')[0],
      party_name:   body.party_name,
      section:      body.section ?? '194J',
      gross_amount: Number(body.gross_amount),
      tds_rate:     Number(body.tds_rate ?? 10),
      tds_amount:   Number(body.tds_amount),
      type:         body.type ?? 'payable',
      status:       'pending',
      notes:        body.notes ?? null,
      created_by:   ctx.user.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('accounting')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, status, challan_no, deposited_date } = body;

  const supabase = await createClient();
  const { error } = await supabase
    .from('tds_entries')
    .update({ status, challan_no: challan_no ?? null, deposited_date: deposited_date ?? null })
    .eq('id', id)
    .eq('org_id', ctx.org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
