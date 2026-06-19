import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, goal, start_date, end_date } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.from('sprints').insert({
    org_id: ctx.org.id, name, goal: goal || null,
    start_date: start_date || null, end_date: end_date || null,
    status: 'active',
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
