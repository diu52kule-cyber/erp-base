import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', params.id)
      .eq('org_id', ctx.org.id)
      .order('name');
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, attributes, sku, price, stock_qty } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .insert({
        org_id: ctx.org.id,
        product_id: params.id,
        name,
        attributes: attributes ?? {},
        sku: sku ?? null,
        price: price ?? null,
        stock_qty: stock_qty ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { variantId, ...updates } = body;
  if (!variantId) return NextResponse.json({ error: 'variantId required' }, { status: 400 });

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .update(updates)
      .eq('id', variantId)
      .eq('product_id', params.id)
      .eq('org_id', ctx.org.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { variantId } = await req.json();
  if (!variantId) return NextResponse.json({ error: 'variantId required' }, { status: 400 });

  const supabase = createClient();
  try {
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', variantId)
      .eq('product_id', params.id)
      .eq('org_id', ctx.org.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
