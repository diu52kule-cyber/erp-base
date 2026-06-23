import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { delta, type, notes }: { delta: number; type: 'in' | 'out' | 'adjustment'; notes?: string } =
    await req.json();

  const supabase = createClient();

  // Atomic single-statement update — eliminates read-modify-write race condition.
  // adjust_stock returns the new qty; throws if product not found.
  const { data: newQty, error: rpcErr } = await supabase
    .rpc('adjust_stock', {
      p_product_id: params.id,
      p_org_id: ctx.org.id,
      p_delta: delta,
    });

  if (rpcErr) {
    if (rpcErr.message.includes('Product not found')) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  if ((newQty as number) < 0) {
    // Roll back by reversing the delta
    await supabase.rpc('adjust_stock', { p_product_id: params.id, p_org_id: ctx.org.id, p_delta: -delta });
    return NextResponse.json({ error: 'Stock cannot go below zero' }, { status: 400 });
  }

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
