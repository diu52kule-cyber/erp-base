import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { delta, type, notes }: { delta: number; type: 'in' | 'out' | 'adjustment'; notes?: string } =
    await req.json();

  const supabase = createClient();

  const { data: product } = await supabase
    .from('products')
    .select('stock_qty')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .single();

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const newQty = Math.round((product.stock_qty + delta) * 1000) / 1000;
  if (newQty < 0) return NextResponse.json({ error: 'Stock cannot go below zero' }, { status: 400 });

  const { error: updateErr } = await supabase
    .from('products')
    .update({ stock_qty: newQty })
    .eq('id', params.id)
    .eq('org_id', ctx.org.id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await supabase.from('stock_movements').insert({
    org_id: ctx.org.id,
    product_id: params.id,
    type,
    quantity: delta,
    notes: notes || null,
    created_by: ctx.user.id,
  });

  return NextResponse.json({ success: true, newQty });
}
