import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const deptId = searchParams.get('department_id');

  let query = supabase
    .from('teams')
    .select('*, department:departments(id,name,color), members:team_memberships(user_id, is_lead)')
    .eq('org_id', ctx.org.id)
    .order('name');

  if (deptId) query = query.eq('department_id', deptId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin', 'manager'].includes(ctx.org.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, color, department_id, focus_area } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('teams')
    .insert({
      org_id: ctx.org.id,
      name: name.trim(),
      description: description ?? null,
      color: color ?? '#0ea5e9',
      department_id: department_id ?? null,
      focus_area: focus_area ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-add creator as team lead
  await supabase.from('team_memberships').insert({
    team_id: data.id,
    user_id: ctx.user.id,
    org_id: ctx.org.id,
    is_lead: true,
  });

  return NextResponse.json(data, { status: 201 });
}
