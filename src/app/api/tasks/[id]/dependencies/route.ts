import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  try {
    const [{ data: blocking }, { data: blockedBy }] = await Promise.all([
      supabase.from('task_dependencies').select('id,dep_type,depends_on_id,tasks!task_dependencies_depends_on_id_fkey(title,status)').eq('task_id', params.id).eq('org_id', ctx.org.id),
      supabase.from('task_dependencies').select('id,dep_type,task_id,tasks!task_dependencies_task_id_fkey(title,status)').eq('depends_on_id', params.id).eq('org_id', ctx.org.id),
    ]);
    return NextResponse.json({ blocking: blocking ?? [], blocked_by: blockedBy ?? [] });
  } catch { return NextResponse.json({ blocking: [], blocked_by: [] }); }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { depends_on_id, dep_type } = await req.json();
  if (!depends_on_id) return NextResponse.json({ error: 'depends_on_id required' }, { status: 400 });
  const supabase = createClient();
  try {
    const { data, error } = await supabase.from('task_dependencies').insert({
      org_id: ctx.org.id, task_id: params.id, depends_on_id,
      dep_type: dep_type || 'blocks',
    }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { dep_id } = await req.json();
  const supabase = createClient();
  try {
    await supabase.from('task_dependencies').delete().eq('id', dep_id).eq('org_id', ctx.org.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
