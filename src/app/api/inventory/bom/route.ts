import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const productId = new URL(req.url).searchParams.get('product_id');
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('bill_of_materials')
      .select('*, component:products!bill_of_materials_component_id_fkey(id, name, sku, cost_price, stock_qty)')
      .eq('org_id', ctx.org.id)
      .eq('product_id', productId)
      .order('created_at');
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { product_id, component_id, qty, unit, notes } = body;
  if (!product_id || !component_id || !qty) {
    return NextResponse.json({ error: 'product_id, component_id, qty required' }, { status: 400 });
  }

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('bill_of_materials')
      .upsert(
        { org_id: ctx.org.id, product_id, component_id, qty, unit: unit ?? null, notes: notes ?? null },
        { onConflict: 'org_id,product_id,component_id' }
      )
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
    await supabase.from('bill_of_materials').delete().eq('id', id).eq('org_id', ctx.org.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
