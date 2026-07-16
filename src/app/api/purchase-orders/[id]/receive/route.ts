import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // lines: [{ po_line_id, quantity_received }]
  const { received_date, notes, lines } = await req.json();
  if (!lines?.length) return NextResponse.json({ error: 'No lines provided' }, { status: 400 });

  const supabase = createClient();

  // Verify PO belongs to org and is receivable
  const { data: po } = await supabase
    .from('purchase_orders')
    .select('id,status,org_id')
    .eq('id', params.id).eq('org_id', ctx.org.id)
    .single();

  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
  if (!['sent', 'partial'].includes(po.status))
    return NextResponse.json({ error: `Cannot receive against a ${po.status} PO` }, { status: 400 });

  // Generate GRN number
  const { data: grnNumber } = await supabase.rpc('next_grn_number', { p_org_id: ctx.org.id });

  // Create GRN header
  const { data: grn, error: grnErr } = await supabase
    .from('goods_receipt_notes')
    .insert({
      org_id: ctx.org.id,
      po_id: params.id,
      grn_number: grnNumber,
      received_date: received_date || new Date().toISOString().split('T')[0],
      notes: notes?.trim() || null,
      created_by: ctx.user.id,
    })
    .select('id').single();

  if (grnErr || !grn) return NextResponse.json({ error: grnErr?.message ?? 'Failed to create GRN' }, { status: 500 });

  // Create GRN lines
  const { error: grnLinesErr } = await supabase.from('grn_lines').insert(
    lines.map((l: any) => ({
      grn_id: grn.id,
      po_line_id: l.po_line_id,
      quantity_received: l.quantity_received,
    }))
  );
  if (grnLinesErr) return NextResponse.json({ error: grnLinesErr.message }, { status: 500 });

  // Fetch PO lines to update received_qty and auto-increment stock
  const { data: poLines } = await supabase
    .from('po_lines')
    .select('id,product_id,quantity,received_qty,description,unit_price')
    .eq('po_id', params.id);

  const lineMap = new Map((poLines ?? []).map((l) => [l.id, l]));

  for (const received of lines) {
    const existing = lineMap.get(received.po_line_id);
    if (!existing) continue;

    const newReceived = (existing.received_qty ?? 0) + received.quantity_received;
    await supabase.from('po_lines')
      .update({ received_qty: newReceived })
      .eq('id', received.po_line_id);

    // Auto-increment inventory if product is linked
    if (existing.product_id && received.quantity_received > 0) {
      // Update stock_qty on product
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', existing.product_id)
        .single();

      if (prod) {
        // Increment stock, and refresh the product's cost price to this PO's
        // purchase rate so inventory valuation & margins reflect the latest buy.
        const prodUpdate: Record<string, unknown> = {
          stock_qty: (prod.stock_qty ?? 0) + received.quantity_received,
        };
        if (Number(existing.unit_price) > 0) prodUpdate.cost_price = Number(existing.unit_price);
        await supabase.from('products')
          .update(prodUpdate)
          .eq('id', existing.product_id);

        await supabase.from('stock_movements').insert({
          org_id: ctx.org.id,
          product_id: existing.product_id,
          type: 'in',
          quantity: received.quantity_received,
          notes: `GRN ${grnNumber} — PO ${params.id}`,
          created_by: ctx.user.id,
        });
      }
    }
  }

  // Recompute PO status
  const { data: updatedLines } = await supabase
    .from('po_lines')
    .select('quantity,received_qty')
    .eq('po_id', params.id);

  const allLines = updatedLines ?? [];
  const allReceived = allLines.every((l) => (l.received_qty ?? 0) >= l.quantity);
  const anyReceived = allLines.some((l) => (l.received_qty ?? 0) > 0);
  const newStatus = allReceived ? 'received' : anyReceived ? 'partial' : 'sent';

  await supabase.from('purchase_orders')
    .update({ status: newStatus })
    .eq('id', params.id);

  return NextResponse.json({ grn_id: grn.id, grn_number: grnNumber, new_status: newStatus });
}
