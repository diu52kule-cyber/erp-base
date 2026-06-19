import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { title, meeting_date, agenda, notes } = await req.json();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.from('meetings').insert({
    org_id: ctx.org.id, title, meeting_date: meeting_date || new Date().toISOString().split('T')[0],
    agenda: agenda || null, notes: notes || null, created_by: ctx.user.id,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
