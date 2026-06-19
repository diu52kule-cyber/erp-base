import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, description, assignee_id, priority, status, due_date, sprint_id, labels } = await req.json();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.from('tasks').insert({
    org_id: ctx.org.id,
    title,
    description: description || null,
    assignee_id: assignee_id || null,
    reporter_id: ctx.user.id,
    priority: priority || 'medium',
    status: status || 'todo',
    due_date: due_date || null,
    sprint_id: sprint_id || null,
    labels: labels || [],
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
