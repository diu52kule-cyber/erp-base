import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const teamId = new URL(req.url).searchParams.get('team_id');

  const supabase = createClient();
  try {
    let query = supabase
      .from('announcements')
      .select('*')
      .eq('org_id', ctx.org.id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data } = await query;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, body, team_id, pinned } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        org_id: ctx.org.id,
        team_id: team_id ?? null,
        title: title.trim(),
        body: body?.trim() ?? null,
        pinned: pinned ?? false,
        created_by: ctx.user.id,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, pinned, title, body } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (pinned !== undefined) patch.pinned = pinned;
  if (title !== undefined) patch.title = title;
  if (body !== undefined) patch.body = body;

  try {
    const { data, error } = await supabase
      .from('announcements')
      .update(patch)
      .eq('id', id)
      .eq('org_id', ctx.org.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createClient();
  try {
    await supabase.from('announcements').delete().eq('id', id).eq('org_id', ctx.org.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
