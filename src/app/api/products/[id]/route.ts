import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import type { CreateProductInput } from '@/lib/types/inventory';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const input: Partial<CreateProductInput> = await req.json();
  if (!input.name?.trim()) {
    return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('products')
    .update({
      name: input.name.trim(),
      sku: input.sku?.trim() || null,
      barcode: (input as any).barcode?.trim() || null,
      description: input.description?.trim() || null,
      unit: input.unit,
      selling_price: input.selling_price,
      cost_price: input.cost_price ?? 0,
      discount_pct: input.discount_pct ?? 0,
      category: input.category?.trim() || null,
      brand: input.brand?.trim() || null,
      tax_inclusive: input.tax_inclusive ?? false,
      gst_rate: input.gst_rate,
      hsn_code: input.hsn_code?.trim() || null,
      low_stock_threshold: input.low_stock_threshold ?? 0,
      reorder_qty: input.reorder_qty ?? 0,
    })
    .eq('id', params.id)
    .eq('org_id', ctx.org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', params.id)
    .eq('org_id', ctx.org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
