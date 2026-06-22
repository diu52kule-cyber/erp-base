import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Public endpoint — no auth required.
// Creates a Razorpay order for the given invoice so the customer can pay online.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminClient();

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, total, amount_paid, invoice_number, customer_email, customer_name, status, currency, org_id')
    .eq('id', params.id)
    .single();

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  if (!['sent', 'partial'].includes(invoice.status)) {
    return NextResponse.json({ error: 'Invoice is not payable' }, { status: 400 });
  }
  if ((invoice.currency ?? 'INR') !== 'INR') {
    return NextResponse.json({ error: 'Online payment is available for INR invoices only' }, { status: 400 });
  }

  const balanceDue = Math.max(0, (invoice.total ?? 0) - (invoice.amount_paid ?? 0));
  if (balanceDue <= 0) return NextResponse.json({ error: 'No balance due' }, { status: 400 });

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Online payment is not configured' }, { status: 503 });
  }

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${credentials}` },
    body: JSON.stringify({
      amount:   Math.round(balanceDue * 100), // paise
      currency: 'INR',
      receipt:  invoice.invoice_number,
      notes:    { invoice_id: invoice.id, org_id: invoice.org_id },
    }),
  });

  if (!rzpRes.ok) {
    const err = await rzpRes.json();
    return NextResponse.json({ error: err.error?.description ?? 'Payment gateway error' }, { status: 500 });
  }

  const order = await rzpRes.json();
  return NextResponse.json({
    order_id:       order.id,
    amount:         order.amount,
    currency:       order.currency,
    key_id:         keyId,
    customer_name:  invoice.customer_name,
    customer_email: invoice.customer_email ?? '',
    description:    invoice.invoice_number,
  });
}
