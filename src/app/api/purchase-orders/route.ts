import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('purchase'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('purchase'))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { vendor_name, vendor_id, vendor_gstin, billing_address, issue_date, expected_delivery, notes, items } = body;

  if (!vendor_name?.trim()) return NextResponse.json({ error: 'Vendor name required' }, { status: 400 });
  if (!items?.length || items.some((i: any) => !i.description?.trim()))
    return NextResponse.json({ error: 'All line items need a description' }, { status: 400 });

  const supabase = createClient();
  const { data: poNumber } = await supabase.rpc('next_po_number', { p_org_id: ctx.org.id });

  const itemsCalc = items.map((item: any) => {
    const amount = Math.round(item.quantity * item.unit_price * 100) / 100;
    const gst_amount = Math.round(amount * item.gst_rate) / 100;
    return { ...item, amount, gst_amount };
  });

  const subtotal   = itemsCalc.reduce((s: number, i: any) => s + i.amount, 0);
  const gst_amount = itemsCalc.reduce((s: number, i: any) => s + i.gst_amount, 0);
  const total      = Math.round((subtotal + gst_amount) * 100) / 100;

  const { data: po, error: poErr } = await supabase
    .from('purchase_orders')
    .insert({
      org_id: ctx.org.id,
      po_number: poNumber,
      vendor_id: vendor_id || null,
      vendor_name: vendor_name.trim(),
      vendor_gstin: vendor_gstin?.trim().toUpperCase() || null,
      billing_address: billing_address?.trim() || null,
      status: 'draft',
      issue_date: issue_date || new Date().toISOString().split('T')[0],
      expected_delivery: expected_delivery || null,
      notes: notes?.trim() || null,
      subtotal, gst_amount, total,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (poErr || !po) return NextResponse.json({ error: poErr?.message ?? 'Failed to create PO' }, { status: 500 });

  const { error: linesErr } = await supabase.from('po_lines').insert(
    itemsCalc.map((item: any, index: number) => ({
      po_id: po.id,
      org_id: ctx.org!.id,
      product_id: item.product_id || null,
      description: item.description.trim(),
      quantity: item.quantity,
      received_qty: 0,
      unit_price: item.unit_price,
      gst_rate: item.gst_rate,
      amount: item.amount,
      gst_amount: item.gst_amount,
      sort_order: index,
    }))
  );

  if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 });
  return NextResponse.json({ id: po.id });
}
