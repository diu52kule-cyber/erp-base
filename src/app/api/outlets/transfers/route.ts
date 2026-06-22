import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('stock_transfers')
      .select('*, from_outlet:outlets!from_outlet_id(name), to_outlet:outlets!to_outlet_id(name), product:products(name,sku)')
      .eq('org_id', ctx.org.id)
      .order('created_at', { ascending: false })
      .limit(100);
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { from_outlet_id, to_outlet_id, product_id, quantity, notes } = await req.json();
  if (!from_outlet_id || !to_outlet_id || !product_id || !quantity) {
    return NextResponse.json({ error: 'from_outlet_id, to_outlet_id, product_id, quantity required' }, { status: 400 });
  }
  if (from_outlet_id === to_outlet_id) {
    return NextResponse.json({ error: 'Source and destination must differ' }, { status: 400 });
  }
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('stock_transfers')
      .insert({
        org_id: ctx.org.id,
        from_outlet_id, to_outlet_id, product_id,
        quantity: Number(quantity),
        notes: notes ?? null,
        created_by: ctx.user.id,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
