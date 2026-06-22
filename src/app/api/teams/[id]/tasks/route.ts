import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    // Get team members first
    const { data: members } = await supabase
      .from('team_memberships')
      .select('user_id')
      .eq('team_id', params.id);

    if (!members || members.length === 0) return NextResponse.json([]);

    const memberIds = members.map((m) => m.user_id);

    // Get tasks assigned to team members
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, assignee_id, project_id, due_date')
      .eq('org_id', ctx.org.id)
      .in('assignee_id', memberIds)
      .neq('status', 'done')
      .order('created_at', { ascending: false });

    return NextResponse.json(tasks ?? []);
  } catch {
    return NextResponse.json([]);
  }
}
