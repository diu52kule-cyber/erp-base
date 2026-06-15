import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

type LineItem = { product_id?: string; description: string; quantity: number; unit_price: number; gst_rate: number };

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { session_id, table_label, customer_name, payment_method, amount_tendered, items } = await req.json();
  if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 });

  const supabase = await createClient();

  // Calculate totals
  let subtotal = 0, gst_amount = 0;
  const lines = (items as LineItem[]).map((item) => {
    const lineAmt = Math.round(item.quantity * item.unit_price * 100) / 100;
    const lineGst = Math.round(lineAmt * (item.gst_rate / 100) * 100) / 100;
    subtotal   += lineAmt;
    gst_amount += lineGst;
    return { ...item, amount: lineAmt, gst_amount: lineGst, org_id: ctx.org!.id };
  });
  const total = Math.round((subtotal + gst_amount) * 100) / 100;
  const change_amount = amount_tendered ? Math.max(0, amount_tendered - total) : 0;

  // Get order number
  const { data: numData } = await supabase.rpc('next_pos_order_number', { p_org_id: ctx.org.id });
  const order_number = numData ?? `POS-${Date.now()}`;

  // Create order
  const { data: order, error: orderErr } = await supabase.from('pos_orders').insert({
    org_id: ctx.org.id, session_id, order_number, table_label, customer_name,
    subtotal, gst_amount, total, payment_method: payment_method ?? 'cash',
    amount_tendered, change_amount, status: 'completed',
  }).select().single();

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

  // Insert lines
  const { error: lineErr } = await supabase.from('pos_order_lines').insert(
    lines.map((l) => ({ ...l, order_id: order.id }))
  );
  if (lineErr) return NextResponse.json({ error: lineErr.message }, { status: 500 });

  // Deduct stock
  for (const item of items as LineItem[]) {
    if (item.product_id) {
      const { error: rpcErr } = await supabase.rpc('adjust_stock', { p_product_id: item.product_id, p_delta: -item.quantity });
      if (rpcErr) {
        // fall back: update directly
        const { data: prod } = await supabase.from('products').select('stock_qty').eq('id', item.product_id).single();
        if (prod) await supabase.from('products').update({ stock_qty: Math.max(0, prod.stock_qty - item.quantity) }).eq('id', item.product_id);
      }
    }
  }

  // Update session totals
  if (session_id) {
    const { error: sessionRpcErr } = await supabase.rpc('increment_pos_session', { p_session_id: session_id, p_total: total });
    if (sessionRpcErr) {
      const { data: sess } = await supabase.from('pos_sessions').select('total_sales,order_count').eq('id', session_id).single();
      if (sess) await supabase.from('pos_sessions').update({
        total_sales: (sess.total_sales ?? 0) + total,
        order_count: (sess.order_count ?? 0) + 1,
      }).eq('id', session_id);
    }
  }

  return NextResponse.json({ id: order.id, order_number, total, change_amount });
}
