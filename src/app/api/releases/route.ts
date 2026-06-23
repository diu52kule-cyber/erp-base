import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { version, title, notes, status, released_at } = await req.json();
  if (!version) return NextResponse.json({ error: 'Version required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.from('releases').insert({
    org_id: ctx.org.id, version, title: title || null, notes: notes || null,
    status: status || 'planned', released_at: released_at || null, created_by: ctx.user.id,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id } = body;
  const supabase = createClient();
  const update: Record<string, unknown> = {};
  for (const k of ['status', 'notes', 'title', 'version']) {
    if (body[k] !== undefined) update[k] = body[k] || null;
  }
  if (body.status === 'released') update.released_at = new Date().toISOString().split('T')[0];
  const { error } = await supabase.from('releases').update(update).eq('id', id).eq('org_id', ctx.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('releases')
      .select('id,version,title,notes,status,released_at,created_at')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false });
    return NextResponse.json(data ?? []);
  } catch { return NextResponse.json([]); }
}
