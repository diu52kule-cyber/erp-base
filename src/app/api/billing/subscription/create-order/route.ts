import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';

// Creates a Razorpay order for the org's subscription amount (set by admin per client).
// On capture, the Razorpay webhook (notes.kind === 'subscription') reactivates the plan.
export async function POST() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ error: 'Online payment is not configured yet. Please contact us on WhatsApp.' }, { status: 503 });

  const amount = ctx.plan.amount;
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Your subscription price has not been set. Please contact us on WhatsApp for a quote.' }, { status: 400 });
  }

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${credentials}` },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `sub_${ctx.org.id.slice(0, 18)}_${Date.now()}`,
      notes: {
        kind: 'subscription',
        org_id: ctx.org.id,
        period: ctx.plan.billing_period,
      },
    }),
  });

  if (!rzpRes.ok) {
    const err = await rzpRes.json().catch(() => ({}));
    return NextResponse.json({ error: err.error?.description ?? 'Could not start payment.' }, { status: 500 });
  }

  const order = await rzpRes.json();
  return NextResponse.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId });
}
