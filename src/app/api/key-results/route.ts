import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { goal_id, title, target, unit } = await req.json();
  if (!goal_id || !title) return NextResponse.json({ error: 'goal_id and title required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.from('key_results').insert({
    org_id: ctx.org.id, goal_id, title, target: target || 100, unit: unit || null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, current, confidence } = await req.json();
  const update: Record<string, unknown> = {};
  if (current !== undefined) update.current = current;
  if (confidence !== undefined) update.confidence = confidence;
  const supabase = createClient();
  const { error } = await supabase.from('key_results').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
