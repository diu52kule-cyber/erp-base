import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bill_number, bill_date, due_date, notes } = await req.json();

  const supabase = createClient();

  const { data: po } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', params.id).eq('org_id', ctx.org.id)
    .single();

  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
  if (!['received', 'partial'].includes(po.status))
    return NextResponse.json({ error: 'Can only bill received or partially received POs' }, { status: 400 });

  // Check not already billed
  const { data: existing } = await supabase
    .from('vendor_bills')
    .select('id')
    .eq('po_id', params.id)
    .limit(1);

  if (existing?.length) return NextResponse.json({ error: 'This PO already has a vendor bill' }, { status: 400 });

  const { data: bill, error: billErr } = await supabase
    .from('vendor_bills')
    .insert({
      org_id: ctx.org.id,
      po_id: params.id,
      bill_number: bill_number?.trim() || null,
      vendor_name: po.vendor_name,
      vendor_gstin: po.vendor_gstin,
      bill_date: bill_date || new Date().toISOString().split('T')[0],
      due_date: due_date || null,
      subtotal: po.subtotal,
      gst_amount: po.gst_amount,
      total: po.total,
      status: 'received',
      notes: notes?.trim() || null,
      created_by: ctx.user.id,
    })
    .select('id').single();

  if (billErr || !bill) return NextResponse.json({ error: billErr?.message ?? 'Failed to create bill' }, { status: 500 });

  await supabase.from('purchase_orders').update({ status: 'billed' }).eq('id', params.id);

  return NextResponse.json({ id: bill.id });
}
