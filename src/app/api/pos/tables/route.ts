import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('pos_tables')
      .select('*')
      .eq('org_id', ctx.org.id)
      .order('name');
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('pos_tables')
    .insert({ org_id: ctx.org.id, name })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('pos_tables')
    .update(updates)
    .eq('id', id)
    .eq('org_id', ctx.org.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase
    .from('pos_tables')
    .delete()
    .eq('id', id)
    .eq('org_id', ctx.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
