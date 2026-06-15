import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data: po } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', params.id).eq('org_id', ctx.org.id)
    .single();

  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [{ data: lines }, { data: grns }, { data: bills }] = await Promise.all([
    supabase.from('po_lines').select('*, product:products(name,sku,unit)').eq('po_id', params.id).order('sort_order'),
    supabase.from('goods_receipt_notes').select('*, grn_lines(*)').eq('po_id', params.id).order('received_date', { ascending: false }),
    supabase.from('vendor_bills').select('*').eq('po_id', params.id).order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({ po, lines: lines ?? [], grns: grns ?? [], bills: bills ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status } = await req.json();
  const supabase = createClient();

  const { error } = await supabase
    .from('purchase_orders')
    .update({ status })
    .eq('id', params.id).eq('org_id', ctx.org.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
