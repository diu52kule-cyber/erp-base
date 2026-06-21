import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('pos')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, amount, reason } = await req.json();
  if (!type || !['in', 'out'].includes(type)) return NextResponse.json({ error: 'type must be in or out' }, { status: 400 });
  if (!amount || Number(amount) <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });

  const supabase = createClient();

  // Verify session belongs to org and is open
  const { data: session } = await supabase
    .from('pos_sessions')
    .select('id, status')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .eq('status', 'open')
    .maybeSingle();

  if (!session) return NextResponse.json({ error: 'Open session not found' }, { status: 404 });

  const { error } = await supabase.from('pos_cash_movements').insert({
    org_id: ctx.org.id,
    session_id: params.id,
    type,
    amount: Number(amount),
    reason: reason?.trim() || null,
    created_by: ctx.user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data } = await supabase
    .from('pos_cash_movements')
    .select('*')
    .eq('session_id', params.id)
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: true });

  return NextResponse.json(data ?? []);
}
