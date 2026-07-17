import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import type { CreateProductInput } from '@/lib/types/inventory';

export async function GET(_req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { data } = await supabase
    .from('products')
    .select('id, name, sku, unit, selling_price, gst_rate, stock_qty, category, tax_inclusive')
    .eq('org_id', ctx.org.id)
    .eq('is_active', true)
    .order('name');

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const input: CreateProductInput = await req.json();

  if (!input.name?.trim()) {
    return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: product, error: prodErr } = await supabase
    .from('products')
    .insert({
      org_id: ctx.org.id,
      name: input.name.trim(),
      sku: input.sku?.trim() || null,
      barcode: input.barcode?.trim() || null,
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
      stock_qty: input.opening_stock ?? 0,
      low_stock_threshold: input.low_stock_threshold ?? 0,
      reorder_qty: input.reorder_qty ?? 0,
    })
    .select('id')
    .single();

  if (prodErr || !product) {
    return NextResponse.json(
      { error: prodErr?.message ?? 'Failed to create product' },
      { status: 500 }
    );
  }

  if (input.opening_stock && input.opening_stock > 0) {
    await supabase.from('stock_movements').insert({
      org_id: ctx.org.id,
      product_id: product.id,
      type: 'in',
      quantity: input.opening_stock,
      notes: 'Opening stock',
      created_by: ctx.user.id,
    });
  }

  return NextResponse.json({ id: product.id, success: true });
}
