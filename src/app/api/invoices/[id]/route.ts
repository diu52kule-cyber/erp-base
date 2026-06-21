import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { buildInvoiceComputation, validateInvoiceInput } from '@/lib/invoice/server';
import type { CreateInvoiceInput } from '@/lib/types/billing';

// ---- Edit a document (keeps the same number + doc_type) ----
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('billing')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const input: CreateInvoiceInput = await req.json();
  const validationError = validateInvoiceInput(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('invoices')
    .select('id, doc_type, status, amount_paid, invoice_number')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status === 'cancelled') {
    return NextResponse.json({ error: 'Cancelled documents cannot be edited' }, { status: 400 });
  }

  const { data: gstSettings } = await supabase
    .from('org_gst_settings')
    .select('state_code')
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  const { header, items } = buildInvoiceComputation(input, gstSettings?.state_code ?? null);

  const amountPaid = Number(existing.amount_paid) || 0;
  let status = existing.status as string;
  if (amountPaid > 0) status = amountPaid >= header.total - 0.01 ? 'paid' : 'sent';

  const { error: updErr } = await supabase
    .from('invoices')
    .update({ ...header, status })
    .eq('id', params.id)
    .eq('org_id', ctx.org.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Replace line items.
  await supabase.from('invoice_items').delete().eq('invoice_id', params.id).eq('org_id', ctx.org.id);
  const { error: itemsErr } = await supabase.from('invoice_items').insert(
    items.map((item) => ({ invoice_id: params.id, org_id: ctx.org!.id, ...item }))
  );
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  // Re-sync the customer ledger: refresh the receivable to the new total.
  if (existing.doc_type === 'invoice' && ctx.enabledModules.has('ledger')) {
    try {
      await supabase
        .from('ledger_entries')
        .delete()
        .eq('org_id', ctx.org.id)
        .eq('reference_type', 'invoice')
        .eq('reference_id', params.id);
      if (header.customer_id) {
        await supabase.from('ledger_entries').insert({
          org_id: ctx.org.id,
          contact_id: header.customer_id,
          type: 'credit',
          amount: header.total,
          note: `Invoice ${existing.invoice_number}`,
          reference_type: 'invoice',
          reference_id: params.id,
          entry_date: header.issue_date,
          created_by: ctx.user.id,
        });
        // keep payment entries pointing at the (possibly new) customer
        await supabase
          .from('ledger_entries')
          .update({ contact_id: header.customer_id })
          .eq('org_id', ctx.org.id)
          .eq('reference_type', 'payment')
          .eq('reference_id', params.id);
      }
    } catch { /* ledger optional */ }
  }

  return NextResponse.json({ id: params.id });
}

// ---- Delete (draft) or Void (issued) ----
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('billing')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('invoices')
    .select('id, status, doc_type')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { count: paymentCount } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', ctx.org.id)
    .eq('invoice_id', params.id);

  const canHardDelete = existing.status === 'draft' && !paymentCount;

  if (canHardDelete) {
    // Remove any ledger entries this document created, then drop it (items cascade).
    await supabase
      .from('ledger_entries')
      .delete()
      .eq('org_id', ctx.org.id)
      .eq('reference_id', params.id)
      .in('reference_type', ['invoice', 'payment']);
    const { error } = await supabase.from('invoices').delete().eq('id', params.id).eq('org_id', ctx.org.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ mode: 'deleted' });
  }

  // Void: keep the record for the audit trail, clear the receivable it raised.
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'cancelled' })
    .eq('id', params.id)
    .eq('org_id', ctx.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from('ledger_entries')
    .delete()
    .eq('org_id', ctx.org.id)
    .eq('reference_type', 'invoice')
    .eq('reference_id', params.id);

  return NextResponse.json({ mode: 'voided' });
}
