import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });

  const body      = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const expected  = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (signature !== expected) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  const event = JSON.parse(body);
  if (event.event !== 'payment.captured') return NextResponse.json({ ok: true });

  const invoiceId = event.payload?.payment?.entity?.notes?.invoice_id;
  const orgId     = event.payload?.payment?.entity?.notes?.org_id;
  if (!invoiceId || !orgId) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  await admin.from('invoices').update({ status: 'paid' }).eq('id', invoiceId).eq('org_id', orgId);

  // Create payment record
  const payment = event.payload?.payment?.entity;
  try {
    await admin.from('payments').insert({
      org_id:         orgId,
      invoice_id:     invoiceId,
      amount:         (payment?.amount ?? 0) / 100,
      payment_method: 'razorpay',
      payment_date:   new Date().toISOString().split('T')[0],
      reference:      payment?.id,
      notes:          `Razorpay payment ${payment?.id}`,
    });
  } catch (_) { /* ignore duplicate or insert errors */ }

  return NextResponse.json({ ok: true });
}
