import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['owner', 'admin'].includes(ctx.org.role ?? '')) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const body = await req.json();
  const allowed = ['name', 'address', 'phone', 'code', 'status'] as const;
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];
  patch.updated_at = new Date().toISOString();
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('outlets')
      .update(patch)
      .eq('id', params.id)
      .eq('org_id', ctx.org.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (ctx.org.role !== 'owner') return NextResponse.json({ error: 'Owner only' }, { status: 403 });
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from('outlets')
      .delete()
      .eq('id', params.id)
      .eq('org_id', ctx.org.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
