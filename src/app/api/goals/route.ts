import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { title, description, level, quarter, parent_id } = await req.json();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.from('goals').insert({
    org_id: ctx.org.id, title, description: description || null,
    level: level || 'company', quarter: quarter || null, owner_id: ctx.user.id,
    parent_id: parent_id || null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  const supabase = createClient();
  const { error } = await supabase.from('goals').delete().eq('id', id).eq('org_id', ctx.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, progress, status } = await req.json();
  const update: Record<string, unknown> = {};
  if (progress !== undefined) update.progress = progress;
  if (status !== undefined) update.status = status;
  const supabase = createClient();
  const { error } = await supabase.from('goals').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
