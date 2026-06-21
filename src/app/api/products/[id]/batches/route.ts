import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data } = await supabase
    .from('product_batches')
    .select('*')
    .eq('org_id', ctx.org.id)
    .eq('product_id', params.id)
    .order('expiry_date', { ascending: true, nullsFirst: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { batch_no, expiry_date, qty, cost_price, notes } = await req.json();

  if (!batch_no?.trim()) return NextResponse.json({ error: 'Batch number is required' }, { status: 400 });
  if (!qty || qty <= 0) return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });

  const supabase = createClient();

  // Verify product belongs to org
  const { data: product } = await supabase
    .from('products')
    .select('id, stock_qty')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  const { error: batchErr } = await supabase.from('product_batches').insert({
    org_id: ctx.org.id,
    product_id: params.id,
    batch_no: batch_no.trim(),
    expiry_date: expiry_date || null,
    qty: Number(qty),
    cost_price: cost_price ? Number(cost_price) : null,
    notes: notes?.trim() || null,
    created_by: ctx.user.id,
  });

  if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 500 });

  // Add stock movement and update product qty
  const newQty = Math.round((product.stock_qty + Number(qty)) * 1000) / 1000;
  await Promise.all([
    supabase.from('products').update({ stock_qty: newQty }).eq('id', params.id).eq('org_id', ctx.org.id),
    supabase.from('stock_movements').insert({
      org_id: ctx.org.id,
      product_id: params.id,
      type: 'in',
      quantity: Number(qty),
      notes: `Batch ${batch_no.trim()}${expiry_date ? ` (exp ${expiry_date})` : ''}`,
      created_by: ctx.user.id,
    }),
  ]);

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { batchId, qty } = await req.json();
  if (!batchId) return NextResponse.json({ error: 'batchId required' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase
    .from('product_batches')
    .update({ qty: Number(qty) })
    .eq('id', batchId)
    .eq('org_id', ctx.org.id)
    .eq('product_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
