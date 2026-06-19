import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

// Create an action item (optionally for a meeting)
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { meeting_id, text, assignee_id } = await req.json();
  if (!meeting_id || !text) return NextResponse.json({ error: 'meeting_id and text required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.from('action_items').insert({
    org_id: ctx.org.id, meeting_id, text, assignee_id: assignee_id || null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

// Toggle done, or convert to a task
export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, done, convert } = await req.json();
  const supabase = createClient();

  if (convert) {
    // Load the action item and create a task from it
    const { data: item } = await supabase.from('action_items').select('text, assignee_id, task_id').eq('id', id).single();
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (item.task_id) return NextResponse.json({ task_id: item.task_id }); // already converted

    const { data: task, error: tErr } = await supabase.from('tasks').insert({
      org_id: ctx.org.id, title: item.text, assignee_id: item.assignee_id || null,
      reporter_id: ctx.user.id, status: 'todo', priority: 'medium',
    }).select('id').single();
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

    await supabase.from('action_items').update({ task_id: task.id }).eq('id', id);
    return NextResponse.json({ task_id: task.id });
  }

  const { error } = await supabase.from('action_items').update({ done }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
