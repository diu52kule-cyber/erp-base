import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('team_memberships')
    .select('*')
    .eq('team_id', params.id)
    .eq('org_id', ctx.org.id)
    .order('joined_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(ctx.org.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { user_id, is_lead } = body;
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  // Verify user is an org member
  const supabase = createClient();
  const { data: membership } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('org_id', ctx.org.id)
    .eq('user_id', user_id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: 'User is not an org member' }, { status: 400 });

  const { data, error } = await supabase
    .from('team_memberships')
    .upsert({ team_id: params.id, user_id, org_id: ctx.org.id, is_lead: !!is_lead }, { onConflict: 'team_id,user_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(ctx.org.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase
    .from('team_memberships')
    .delete()
    .eq('team_id', params.id)
    .eq('user_id', user_id)
    .eq('org_id', ctx.org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
