import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import type { CreateProductInput } from '@/lib/types/inventory';

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
      description: input.description?.trim() || null,
      unit: input.unit,
      selling_price: input.selling_price,
      gst_rate: input.gst_rate,
      stock_qty: input.opening_stock ?? 0,
      low_stock_threshold: input.low_stock_threshold ?? 0,
    })
    .select('id')
    .single();

  if (prodErr || !product) {
    return NextResponse.json(
      { error: prodErr?.message ?? 'Failed to create product' },
      { status: 500 }
    );
  }

  // Best-effort barcode save (works once migration 0025 has added the column).
  if (input.barcode?.trim()) {
    await supabase.from('products').update({ barcode: input.barcode.trim() }).eq('id', product.id);
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

  return NextResponse.json({ success: true });
}
