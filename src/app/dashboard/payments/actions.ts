'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import type { RecordPaymentInput } from '@/lib/types/payments';

export async function recordManualPayment(
  input: RecordPaymentInput
): Promise<{ error: string } | { success: true }> {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('payments')) {
    return { error: 'Unauthorized' };
  }

  const supabase = createClient();

  const { error: payErr } = await supabase.from('payments').insert({
    org_id: ctx.org.id,
    invoice_id: input.invoiceId || null,
    amount: input.amount,
    method: input.method,
    status: 'completed',
    reference_number: input.referenceNumber?.trim() || null,
    notes: input.notes?.trim() || null,
    paid_at: input.paidAt,
    created_by: ctx.user.id,
  });

  if (payErr) return { error: payErr.message };

  if (input.invoiceId) {
    await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', input.invoiceId)
      .eq('org_id', ctx.org.id);
  }

  return { success: true as const };
}

export async function createRazorpayOrder(invoiceId: string): Promise<
  | { error: string }
  | { orderId: string; amount: number; currency: string; keyId: string; customerName: string; invoiceNumber: string }
> {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('payments')) {
    return { error: 'Unauthorized' };
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return { error: 'Payment gateway not configured' };

  const supabase = createClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('total, invoice_number, customer_name')
    .eq('id', invoiceId)
    .eq('org_id', ctx.org.id)
    .single();

  if (!invoice) return { error: 'Invoice not found' };

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
    },
    body: JSON.stringify({
      amount: Math.round(invoice.total * 100),
      currency: 'INR',
      receipt: invoiceId,
      notes: { invoice_number: invoice.invoice_number },
    }),
  });

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    return { error: err?.error?.description ?? 'Failed to create payment order' };
  }

  const order = await res.json();
  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId,
    customerName: invoice.customer_name,
    invoiceNumber: invoice.invoice_number,
  };
}

export async function verifyAndRecordPayment(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  invoiceId: string;
  amountPaise: number;
}): Promise<{ error: string } | { success: true }> {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('payments')) {
    return { error: 'Unauthorized' };
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return { error: 'Payment gateway not configured' };

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex');

  if (expected !== input.signature) return { error: 'Payment verification failed' };

  const supabase = createClient();

  const { error: payErr } = await supabase.from('payments').insert({
    org_id: ctx.org.id,
    invoice_id: input.invoiceId,
    amount: input.amountPaise / 100,
    method: 'razorpay',
    status: 'completed',
    gateway_order_id: input.orderId,
    gateway_payment_id: input.paymentId,
    paid_at: new Date().toISOString(),
    created_by: ctx.user.id,
  });

  if (payErr) return { error: payErr.message };

  await supabase
    .from('invoices')
    .update({ status: 'paid' })
    .eq('id', input.invoiceId)
    .eq('org_id', ctx.org.id);

  revalidatePath('/dashboard/payments');
  revalidatePath(`/dashboard/billing/${input.invoiceId}`);
  return { success: true };
}
