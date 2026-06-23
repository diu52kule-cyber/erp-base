import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('tasks')
      .select('id,title,status,priority,assignee_id')
      .eq('parent_task_id', params.id)
      .eq('org_id', ctx.org.id)
      .order('created_at');
    return NextResponse.json(data ?? []);
  } catch { return NextResponse.json([]); }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { title, assignee_id } = await req.json();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  const supabase = createClient();
  try {
    const { data, error } = await supabase.from('tasks').insert({
      org_id: ctx.org.id, title, parent_task_id: params.id,
      status: 'todo', priority: 'medium', reporter_id: ctx.user.id,
      assignee_id: assignee_id || null,
    }).select('id').single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
