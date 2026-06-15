import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ error: 'Razorpay not configured' }, { status: 503 });

  const { invoice_id } = await req.json();
  const supabase = createClient();
  const { data: invoice } = await supabase.from('invoices').select('total,invoice_number,customer_email,customer_name')
    .eq('id', invoice_id).eq('org_id', ctx.org.id).single();
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  // Create Razorpay order via HTTP API
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${credentials}` },
    body: JSON.stringify({
      amount:          Math.round(invoice.total * 100), // paise
      currency:        'INR',
      receipt:         invoice.invoice_number,
      notes:           { invoice_id, org_id: ctx.org.id },
    }),
  });

  if (!rzpRes.ok) {
    const err = await rzpRes.json();
    return NextResponse.json({ error: err.error?.description ?? 'Razorpay error' }, { status: 500 });
  }

  const order = await rzpRes.json();
  return NextResponse.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId });
}
