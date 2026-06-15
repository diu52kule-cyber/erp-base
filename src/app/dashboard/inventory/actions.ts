'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import type { CreateProductInput } from '@/lib/types/inventory';

export async function createProduct(
  input: CreateProductInput
): Promise<{ error: string } | { success: true }> {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return { error: 'Unauthorized' };
  }

  if (!input.name?.trim()) return { error: 'Product name is required' };

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
    return { error: prodErr?.message ?? 'Failed to create product' };
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

  return { success: true as const };
}

export async function adjustStock(input: {
  productId: string;
  delta: number;
  type: 'in' | 'out' | 'adjustment';
  notes?: string;
}): Promise<{ error: string } | { success: true; newQty: number }> {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('inventory')) {
    return { error: 'Unauthorized' };
  }

  const supabase = createClient();

  const { data: product } = await supabase
    .from('products')
    .select('stock_qty')
    .eq('id', input.productId)
    .eq('org_id', ctx.org.id)
    .single();

  if (!product) return { error: 'Product not found' };

  const newQty =
    Math.round((product.stock_qty + input.delta) * 1000) / 1000;
  if (newQty < 0) return { error: 'Stock cannot go below zero' };

  const { error: updateErr } = await supabase
    .from('products')
    .update({ stock_qty: newQty })
    .eq('id', input.productId)
    .eq('org_id', ctx.org.id);

  if (updateErr) return { error: updateErr.message };

  await supabase.from('stock_movements').insert({
    org_id: ctx.org.id,
    product_id: input.productId,
    type: input.type,
    quantity: input.delta,
    notes: input.notes || null,
    created_by: ctx.user.id,
  });

  revalidatePath('/dashboard/inventory');
  return { success: true, newQty };
}
