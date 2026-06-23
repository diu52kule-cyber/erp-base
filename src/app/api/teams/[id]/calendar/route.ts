import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const start = url.searchParams.get('start') ?? '';
  const end   = url.searchParams.get('end') ?? '';

  const supabase = createClient();
  const orgId = ctx.org.id;

  try {
    // Get team member IDs
    const { data: members } = await supabase
      .from('team_memberships')
      .select('user_id')
      .eq('team_id', params.id);

    const memberIds = (members ?? []).map((m: any) => m.user_id);

    const events: { id: string; title: string; date: string; type: string; status?: string }[] = [];

    // Meetings
    try {
      let q = supabase
        .from('meetings')
        .select('id, title, meeting_date')
        .eq('org_id', orgId);
      if (start) q = q.gte('meeting_date', start);
      if (end)   q = q.lte('meeting_date', end);
      const { data: meetings } = await q.limit(100);
      for (const m of meetings ?? []) {
        events.push({ id: m.id, title: m.title, date: m.meeting_date, type: 'meeting' });
      }
    } catch { /* meetings may not exist */ }

    // Tasks with due dates (for team members)
    try {
      let q = supabase
        .from('tasks')
        .select('id, title, due_date, status, assignee_id')
        .eq('org_id', orgId)
        .not('due_date', 'is', null);
      if (start) q = q.gte('due_date', start);
      if (end)   q = q.lte('due_date', end);
      if (memberIds.length > 0) q = q.in('assignee_id', memberIds);
      const { data: tasks } = await q.limit(100);
      for (const t of tasks ?? []) {
        events.push({ id: t.id, title: t.title, date: t.due_date, type: 'task', status: t.status });
      }
    } catch { /* tasks may not exist */ }

    // Leave requests (approved)
    try {
      let q = supabase
        .from('leave_requests')
        .select('id, start_date, end_date, employee_id, leave_types(name)')
        .eq('org_id', orgId)
        .eq('status', 'approved');
      if (start) q = q.gte('start_date', start);
      if (end)   q = q.lte('end_date', end);
      const { data: leaves } = await q.limit(100);
      for (const l of leaves ?? []) {
        events.push({
          id: l.id,
          title: `Leave — ${(l.leave_types as any)?.name ?? 'Leave'}`,
          date: l.start_date,
          type: 'leave',
        });
      }
    } catch { /* leave may not exist */ }

    // Holidays
    try {
      let q = supabase
        .from('holidays')
        .select('id, name, date')
        .eq('org_id', orgId);
      if (start) q = q.gte('date', start);
      if (end)   q = q.lte('date', end);
      const { data: holidays } = await q.limit(50);
      for (const h of holidays ?? []) {
        events.push({ id: h.id, title: h.name, date: h.date, type: 'holiday' });
      }
    } catch { /* holidays may not exist */ }

    // Sort by date
    events.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(events);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
