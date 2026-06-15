'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import type { CreateInvoiceInput, InvoiceStatus } from '@/lib/types/billing';

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<{ error: string } | { id: string }> {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('billing')) {
    return { error: 'Unauthorized' };
  }

  if (!input.customer_name?.trim()) {
    return { error: 'Customer name is required' };
  }
  if (!input.items.length || input.items.some((i) => !i.description.trim())) {
    return { error: 'All line items must have a description' };
  }

  const supabase = createClient();

  const itemsWithTotals = input.items.map((item) => {
    const amount = Math.round(item.quantity * item.unit_price * 100) / 100;
    const gst_amount = Math.round(amount * item.gst_rate) / 100;
    return { ...item, amount, gst_amount };
  });

  const subtotal = itemsWithTotals.reduce((s, i) => s + i.amount, 0);
  const gst_amount = itemsWithTotals.reduce((s, i) => s + i.gst_amount, 0);
  const total = Math.round((subtotal + gst_amount) * 100) / 100;

  const { data: invoiceNumber, error: seqErr } = await supabase.rpc(
    'next_invoice_number',
    { p_org_id: ctx.org.id }
  );
  if (seqErr || !invoiceNumber) {
    return { error: seqErr?.message ?? 'Failed to generate invoice number' };
  }

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      org_id: ctx.org.id,
      invoice_number: invoiceNumber as string,
      customer_name: input.customer_name.trim(),
      customer_email: input.customer_email?.trim() || null,
      customer_gstin: input.customer_gstin?.trim() || null,
      billing_address: input.billing_address?.trim() || null,
      status: 'draft',
      issue_date: input.issue_date,
      due_date: input.due_date || null,
      notes: input.notes?.trim() || null,
      subtotal,
      gst_amount,
      total,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (invErr || !invoice) {
    return { error: invErr?.message ?? 'Failed to create invoice' };
  }

  const { error: itemsErr } = await supabase.from('invoice_items').insert(
    itemsWithTotals.map((item, index) => ({
      invoice_id: invoice.id,
      org_id: ctx.org!.id,
      description: item.description.trim(),
      quantity: item.quantity,
      unit_price: item.unit_price,
      gst_rate: item.gst_rate,
      amount: item.amount,
      gst_amount: item.gst_amount,
      sort_order: index,
    }))
  );

  if (itemsErr) {
    return { error: itemsErr.message };
  }

  return { id: invoice.id };
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus
): Promise<{ error: string } | { success: true }> {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('billing')) {
    return { error: 'Unauthorized' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)
    .eq('org_id', ctx.org.id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/billing/${invoiceId}`);
  revalidatePath('/dashboard/billing');
  return { success: true };
}
