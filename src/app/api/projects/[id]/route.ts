import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createClient();
  const [{ data: project }, { data: tasks }, { data: time }] = await Promise.all([
    supabase.from('projects').select('*, client:contacts(id,name)').eq('id', params.id).eq('org_id', ctx.org.id).single(),
    supabase.from('tasks').select('*').eq('project_id', params.id).order('sort_order'),
    supabase.from('time_entries').select('*').eq('project_id', params.id).order('date', { ascending: false }),
  ]);
  return NextResponse.json({ project, tasks: tasks ?? [], time: time ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const supabase = await createClient();
  const { error } = await supabase.from('projects').update(body).eq('id', params.id).eq('org_id', ctx.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
