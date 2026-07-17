import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createClient();
  const { data } = await supabase
    .from('offers')
    .select('*, product:products(name)')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const b = await req.json();
  if (!b.title?.trim()) return NextResponse.json({ error: 'Offer title is required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase.from('offers').insert({
    org_id: ctx.org.id,
    product_id: b.product_id || null,
    title: b.title.trim(),
    offer_type: ['percent', 'flat', 'bogo', 'combo'].includes(b.offer_type) ? b.offer_type : 'percent',
    value: Number(b.value) || 0,
    label_text: b.label_text?.trim() || null,
    description: b.description?.trim() || null,
    active: b.active !== false,
    starts_on: b.starts_on || null,
    ends_on: b.ends_on || null,
    created_by: ctx.user.id,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, success: true });
}
