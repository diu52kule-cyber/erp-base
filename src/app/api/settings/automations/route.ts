import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('workflow_rules')
      .select('*')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(ctx.org.role ?? '')) {
    return NextResponse.json({ error: 'Only owners and admins can create automations' }, { status: 403 });
  }

  const { name, trigger_type, trigger_condition, action_type, action_config } = await req.json();
  if (!name || !trigger_type || !action_type) {
    return NextResponse.json({ error: 'name, trigger_type, action_type required' }, { status: 400 });
  }

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('workflow_rules')
      .insert({
        org_id: ctx.org.id,
        name,
        trigger_type,
        trigger_condition: trigger_condition ?? {},
        action_type,
        action_config: action_config ?? {},
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(ctx.org.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const allowed = ['name', 'enabled', 'trigger_type', 'trigger_condition', 'action_type', 'action_config'];
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (k in updates) patch[k] = updates[k];
  }

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('workflow_rules')
      .update(patch)
      .eq('id', id)
      .eq('org_id', ctx.org.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(ctx.org.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createClient();
  try {
    await supabase.from('workflow_rules').delete().eq('id', id).eq('org_id', ctx.org.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
