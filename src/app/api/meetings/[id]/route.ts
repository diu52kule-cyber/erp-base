import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const k of ['title', 'agenda', 'notes', 'meeting_date', 'recurrence_rule']) {
    if (body[k] !== undefined) update[k] = body[k] || null;
  }
  if (body.attendees   !== undefined) update.attendees   = body.attendees;
  if (body.is_recurring !== undefined) update.is_recurring = body.is_recurring;

  const supabase = createClient();
  const { error } = await supabase
    .from('meetings')
    .update(update)
    .eq('id', params.id)
    .eq('org_id', ctx.org.id);  // prevents cross-tenant write

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
