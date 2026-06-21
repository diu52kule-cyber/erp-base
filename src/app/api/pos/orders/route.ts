import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

type LineItem = {
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  discount_pct?: number;
};

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sessionId = req.nextUrl.searchParams.get('session_id');
  const supabase = createClient();

  let query = supabase
    .from('pos_orders')
    .select('id, order_number, total, payment_method, order_type, created_at, customer_id, contacts(name)')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (sessionId) query = query.eq('session_id', sessionId);

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    session_id, table_label, customer_id, customer_name,
    payment_method, amount_tendered, split_tenders,
    discount_type, discount_value, discount_amount,
    order_type = 'sale', refund_of_order_id,
    items,
  } = await req.json();

  if (!items?.length) return NextResponse.json({ error: 'No items' }, { status: 400 });

  const supabase = createClient();
  const isRefund = order_type === 'refund';

  // Calculate line-level totals
  let subtotal = 0, gst_amount = 0;
  const lines = (items as LineItem[]).map((item) => {
    const discPct = item.discount_pct ?? 0;
    const baseAmt = Math.round(item.quantity * item.unit_price * 100) / 100;
    const discAmt = Math.round(baseAmt * (discPct / 100) * 100) / 100;
    const lineAmt = Math.round((baseAmt - discAmt) * 100) / 100;
    const lineGst = Math.round(lineAmt * (item.gst_rate / 100) * 100) / 100;
    subtotal   += lineAmt;
    gst_amount += lineGst;
    return {
      ...item,
      discount_pct: discPct,
      discount_amount: discAmt,
      amount: isRefund ? -lineAmt : lineAmt,
      gst_amount: isRefund ? -lineGst : lineGst,
      org_id: ctx.org!.id,
    };
  });

  const grossTotal = Math.round((subtotal + gst_amount) * 100) / 100;
  const billDisc = discount_amount ?? 0;
  const total = isRefund
    ? -Math.round(Math.max(0, grossTotal - billDisc) * 100) / 100
    : Math.round(Math.max(0, grossTotal - billDisc) * 100) / 100;

  const payMethod = split_tenders?.length > 1 ? 'split' : (payment_method ?? 'cash');
  const tenderedAmt = amount_tendered ?? Math.abs(total);
  const change_amount = payMethod === 'cash' && !isRefund
    ? Math.max(0, tenderedAmt - Math.abs(total))
    : 0;

  const { data: numData } = await supabase.rpc('next_pos_order_number', { p_org_id: ctx.org.id });
  const order_number = numData ?? `POS-${Date.now()}`;

  const { data: order, error: orderErr } = await supabase.from('pos_orders').insert({
    org_id: ctx.org.id, session_id, order_number, table_label,
    customer_id: customer_id || null, customer_name: customer_name || null,
    order_type, refund_of_order_id: refund_of_order_id || null,
    subtotal: isRefund ? -subtotal : subtotal,
    gst_amount: isRefund ? -gst_amount : gst_amount,
    discount_type: discount_type || null,
    discount_value: discount_value ?? 0,
    discount_amount: billDisc,
    total,
    payment_method: payMethod,
    split_tenders: split_tenders?.length ? split_tenders : null,
    amount_tendered: tenderedAmt,
    change_amount,
    status: 'completed',
  }).select().single();

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

  await supabase.from('pos_order_lines').insert(
    lines.map((l) => ({ ...l, order_id: order.id }))
  );

  // Stock deduction (or restoration on refund)
  for (const item of items as LineItem[]) {
    if (item.product_id) {
      const delta = isRefund ? item.quantity : -item.quantity;
      const { error: rpcErr } = await supabase.rpc('adjust_stock', {
        p_product_id: item.product_id, p_delta: delta,
      });
      if (rpcErr) {
        const { data: prod } = await supabase.from('products').select('stock_qty').eq('id', item.product_id).single();
        if (prod) await supabase.from('products').update({
          stock_qty: Math.max(0, prod.stock_qty + delta),
        }).eq('id', item.product_id);
      }
    }
  }

  // Update session totals
  if (session_id) {
    const { error: rpcErr } = await supabase.rpc('increment_pos_session', {
      p_session_id: session_id, p_total: total,
    });
    if (rpcErr) {
      const { data: sess } = await supabase.from('pos_sessions').select('total_sales,order_count').eq('id', session_id).single();
      if (sess) await supabase.from('pos_sessions').update({
        total_sales: (sess.total_sales ?? 0) + total,
        order_count: (sess.order_count ?? 0) + 1,
      }).eq('id', session_id);
    }
  }

  // Ledger entry if customer attached and ledger enabled
  if (customer_id && ctx.enabledModules.has('ledger') && !isRefund) {
    try {
      await supabase.from('ledger_entries').insert({
        org_id: ctx.org.id,
        contact_id: customer_id,
        type: 'payment',
        amount: -Math.abs(total),
        note: `POS sale ${order_number}`,
        reference_type: 'pos_order',
        reference_id: order.id,
        entry_date: new Date().toISOString().split('T')[0],
        created_by: ctx.user.id,
      });
    } catch { /* ledger optional */ }
  }

  return NextResponse.json({ id: order.id, order_number, total, change_amount });
}
