import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { title, description, severity, module, assignee_id, environment, priority, due_date } = await req.json();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.from('issues').insert({
    org_id: ctx.org.id, title, description: description || null,
    severity: severity || 'medium', module: module || null,
    assignee_id: assignee_id || null, reporter_id: ctx.user.id,
    environment: environment || 'all', priority: priority || 'medium',
    due_date: due_date || null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
