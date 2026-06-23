import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  const { data } = await supabase.from('pos_sessions').select('*')
    .eq('org_id', ctx.org.id).order('opened_at', { ascending: false }).limit(20);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { opening_float } = await req.json();
  const supabase = createClient();
  // Close any existing open session first
  await supabase.from('pos_sessions').update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('org_id', ctx.org.id).eq('status', 'open');
  const { data, error } = await supabase.from('pos_sessions')
    .insert({ org_id: ctx.org.id, opened_by: ctx.user.id, opening_float: opening_float ?? 0 })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
