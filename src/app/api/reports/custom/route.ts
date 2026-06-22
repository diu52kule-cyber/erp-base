import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('custom_reports')
      .select('*')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, source, columns, filters, sort_by, sort_dir, description } = await req.json();
  if (!name?.trim() || !source) {
    return NextResponse.json({ error: 'name and source required' }, { status: 400 });
  }

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('custom_reports')
      .insert({
        org_id: ctx.org.id,
        name: name.trim(),
        description: description?.trim() ?? null,
        source,
        columns: columns ?? [],
        filters: filters ?? [],
        sort_by: sort_by ?? null,
        sort_dir: sort_dir ?? 'desc',
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

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createClient();
  try {
    await supabase.from('custom_reports').delete().eq('id', id).eq('org_id', ctx.org.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
