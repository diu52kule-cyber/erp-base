import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('production_orders')
      .select('*, product:products(name, sku)')
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

  const body = await req.json();
  const { product_id, qty_to_produce, planned_date, notes } = body;
  if (!product_id || !qty_to_produce) {
    return NextResponse.json({ error: 'product_id and qty_to_produce required' }, { status: 400 });
  }

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('production_orders')
      .insert({
        org_id: ctx.org.id,
        product_id,
        qty_to_produce,
        planned_date: planned_date ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function adjustStock(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>,
  orgId: string,
  productId: string,
  delta: number,
  notes: string,
) {
  try {
    await supabase.from('stock_movements').insert({
      org_id: orgId,
      product_id: productId,
      type: delta > 0 ? 'in' : 'out',
      quantity: Math.abs(delta),
      notes,
    });
    const { data: p } = await supabase
      .from('products')
      .select('stock_qty')
      .eq('id', productId)
      .single();
    if (p) {
      await supabase
        .from('products')
        .update({ stock_qty: Math.max(0, (p.stock_qty ?? 0) + delta) })
        .eq('id', productId)
        .eq('org_id', orgId);
    }
  } catch { /* best-effort */ }
}

export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = ctx.org.id;
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

  const supabase = createClient();
  try {
    if (status === 'completed') {
      const { data: order } = await supabase
        .from('production_orders')
        .select('product_id, qty_to_produce')
        .eq('id', id)
        .eq('org_id', orgId)
        .single();

      if (order) {
        const { data: bom } = await supabase
          .from('bill_of_materials')
          .select('component_id, qty')
          .eq('org_id', orgId)
          .eq('product_id', order.product_id);

        for (const line of bom ?? []) {
          const consumed = line.qty * (order.qty_to_produce ?? 1);
          await adjustStock(supabase, orgId, line.component_id, -consumed, 'Production order completed');
        }

        await adjustStock(supabase, orgId, order.product_id, order.qty_to_produce ?? 1, 'Production order completed');
      }
    }

    const { data, error } = await supabase
      .from('production_orders')
      .update({
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
