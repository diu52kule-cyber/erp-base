import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(_req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('purchase')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createClient();
  const { data } = await supabase
    .from('purchase_returns')
    .select('*, lines:purchase_return_lines(*)')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('purchase')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { po_id, vendor_name, return_date, reason, notes, lines } = body;

  if (!vendor_name?.trim() || !lines?.length) {
    return NextResponse.json({ error: 'Vendor and at least one line required' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: numRow } = await supabase
    .rpc('next_return_number', { p_org_id: ctx.org.id });
  const return_number = numRow as string;

  let subtotal = 0, gst_amount = 0;
  for (const l of lines) {
    subtotal += l.amount;
    gst_amount += (l.amount * l.gst_rate) / 100;
  }
  const total = subtotal + gst_amount;

  const { data: pr, error: prErr } = await supabase
    .from('purchase_returns')
    .insert({
      org_id: ctx.org.id,
      po_id: po_id || null,
      return_number,
      vendor_name: vendor_name.trim(),
      return_date: return_date || new Date().toISOString().split('T')[0],
      reason: reason || null,
      notes: notes || null,
      subtotal,
      gst_amount,
      total,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (prErr || !pr) return NextResponse.json({ error: prErr?.message }, { status: 500 });

  const lineInserts = lines.map((l: any) => ({
    return_id: pr.id,
    po_line_id: l.po_line_id || null,
    product_id: l.product_id || null,
    description: l.description,
    quantity: l.quantity,
    unit_price: l.unit_price,
    gst_rate: l.gst_rate ?? 0,
    amount: l.amount,
  }));

  const { error: lineErr } = await supabase.from('purchase_return_lines').insert(lineInserts);
  if (lineErr) return NextResponse.json({ error: lineErr.message }, { status: 500 });

  // Reverse stock: we're returning goods to vendor, so decrement inventory
  for (const l of lines) {
    if (l.product_id) {
      try {
        await supabase.rpc('adjust_stock', {
          p_product_id: l.product_id,
          p_delta: -Math.abs(l.quantity),
          p_org_id: ctx.org.id,
        });
      } catch { /* non-fatal if RPC doesn't exist */ }
    }
  }

  return NextResponse.json({ id: pr.id, return_number });
}
