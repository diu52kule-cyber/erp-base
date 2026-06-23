import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const release_id = new URL(req.url).searchParams.get('release_id');
  if (!release_id) return NextResponse.json([]);
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('release_items')
      .select('id,entity_type,entity_id')
      .eq('release_id', release_id)
      .eq('org_id', ctx.org.id);
    return NextResponse.json(data ?? []);
  } catch { return NextResponse.json([]); }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { release_id, entity_type, entity_id } = await req.json();
  if (!release_id || !entity_type || !entity_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const supabase = createClient();
  try {
    const { error } = await supabase.from('release_items').upsert({
      org_id: ctx.org.id, release_id, entity_type, entity_id,
    }, { onConflict: 'release_id,entity_id' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  const supabase = createClient();
  try {
    await supabase.from('release_items').delete().eq('id', id).eq('org_id', ctx.org.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
