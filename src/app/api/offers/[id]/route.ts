import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const b = await req.json();
  const update: Record<string, unknown> = {};
  if (b.active !== undefined) update.active = !!b.active;
  if (b.title !== undefined) update.title = String(b.title).trim();
  if (b.value !== undefined) update.value = Number(b.value) || 0;
  if (b.offer_type !== undefined) update.offer_type = ['percent', 'flat', 'bogo', 'combo'].includes(b.offer_type) ? b.offer_type : 'percent';
  if (b.label_text !== undefined) update.label_text = b.label_text?.trim() || null;
  if (b.description !== undefined) update.description = b.description?.trim() || null;
  if (b.product_id !== undefined) update.product_id = b.product_id || null;
  if (b.starts_on !== undefined) update.starts_on = b.starts_on || null;
  if (b.ends_on !== undefined) update.ends_on = b.ends_on || null;

  const supabase = createClient();
  const { error } = await supabase.from('offers').update(update).eq('id', params.id).eq('org_id', ctx.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createClient();
  const { error } = await supabase.from('offers').delete().eq('id', params.id).eq('org_id', ctx.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
