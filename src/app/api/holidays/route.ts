import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('hr')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = await createClient();
  const year = req.nextUrl.searchParams.get('year') ?? new Date().getFullYear().toString();
  const { data } = await supabase
    .from('holidays')
    .select('*')
    .eq('org_id', ctx.org.id)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .order('date');
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('hr')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { date, name, is_optional } = body;
  if (!date || !name?.trim()) return NextResponse.json({ error: 'Date and name required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('holidays')
    .upsert({ org_id: ctx.org.id, date, name: name.trim(), is_optional: is_optional ?? false }, { onConflict: 'org_id,date' })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('hr')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = await createClient();
  await supabase.from('holidays').delete().eq('id', id).eq('org_id', ctx.org.id);
  return NextResponse.json({ ok: true });
}
