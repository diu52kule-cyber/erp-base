import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createClient();
  const [{ data: session }, { data: orders }] = await Promise.all([
    supabase.from('pos_sessions').select('*').eq('id', params.id).eq('org_id', ctx.org.id).single(),
    supabase.from('pos_orders').select('*, pos_order_lines(*)').eq('session_id', params.id).order('created_at', { ascending: false }),
  ]);
  return NextResponse.json({ session, orders: orders ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const supabase = await createClient();
  const updates: Record<string, unknown> = {};
  if (body.closing_cash !== undefined) updates.closing_cash = body.closing_cash;
  if (body.status) updates.status = body.status;
  if (body.status === 'closed') updates.closed_at = new Date().toISOString();
  if (body.variance_reason !== undefined) updates.variance_reason = body.variance_reason;
  if (body.notes !== undefined) updates.notes = body.notes;
  const { error } = await supabase.from('pos_sessions').update(updates)
    .eq('id', params.id).eq('org_id', ctx.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
