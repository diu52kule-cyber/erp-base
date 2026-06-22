import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { status } = await req.json();
  if (!['completed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'status must be completed or cancelled' }, { status: 400 });
  }
  const supabase = createClient();
  try {
    const { data: transfer, error: fe } = await supabase
      .from('stock_transfers')
      .select('*')
      .eq('id', params.id)
      .eq('org_id', ctx.org.id)
      .single();
    if (fe || !transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    if (transfer.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending transfers can be updated' }, { status: 400 });
    }

    // Wrap in a sequence: update transfer, then adjust product stock
    const { error: ue } = await supabase
      .from('stock_transfers')
      .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('id', params.id)
      .eq('org_id', ctx.org.id);
    if (ue) throw ue;

    // When completed, deduct stock from product (outlet filtering is future work — adjusting global stock)
    if (status === 'completed') {
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', transfer.product_id)
        .eq('org_id', ctx.org.id)
        .single();
      if (prod) {
        await supabase
          .from('products')
          .update({ stock_qty: Math.max(0, (prod.stock_qty ?? 0)) }) // stock stays same — transferred between outlets
          .eq('id', transfer.product_id)
          .eq('org_id', ctx.org.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
