import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import type { RecordPaymentInput } from '@/lib/types/payments';

// Recalculate invoice.amount_paid from all payments and allocations, then update status.
async function syncInvoice(supabase: ReturnType<typeof createClient>, orgId: string, invoiceId: string) {
  const [{ data: directPayments }, { data: allocations }, { data: inv }] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, payment_type')
      .eq('org_id', orgId)
      .eq('invoice_id', invoiceId)
      .eq('status', 'completed'),
    supabase
      .from('payment_allocations')
      .select('amount')
      .eq('org_id', orgId)
      .eq('invoice_id', invoiceId),
    supabase
      .from('invoices')
      .select('total, status')
      .eq('id', invoiceId)
      .eq('org_id', orgId)
      .maybeSingle(),
  ]);

  if (!inv || inv.status === 'cancelled') return;

  const directPaid = (directPayments ?? []).reduce((s, p) => {
    return p.payment_type === 'refund' ? s - Number(p.amount) : s + Number(p.amount);
  }, 0);
  const allocPaid = (allocations ?? []).reduce((s, a) => s + Number(a.amount), 0);
  const totalPaid = Math.max(0, directPaid + allocPaid);
  const total = Number(inv.total ?? 0);

  const newStatus = totalPaid >= total ? 'paid' : totalPaid > 0 ? 'partial' : 'sent';

  await supabase
    .from('invoices')
    .update({ amount_paid: totalPaid, status: newStatus })
    .eq('id', invoiceId)
    .eq('org_id', orgId);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('payments')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const input: RecordPaymentInput = await req.json();
  const supabase = createClient();
  const orgId = ctx.org.id;
  const hasLedger = ctx.enabledModules.has('ledger');

  // ── Credit / Udhaar ────────────────────────────────────────────────
  // No money collected — keep invoice outstanding, record ledger receivable.
  if (input.method === 'credit') {
    if (!input.invoiceId) {
      return NextResponse.json({ error: 'Select the invoice to put on credit' }, { status: 400 });
    }
    const { data: inv } = await supabase
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', input.invoiceId)
      .eq('org_id', orgId)
      .neq('status', 'paid')
      .select('customer_id, invoice_number, total')
      .maybeSingle();

    if (inv?.customer_id && hasLedger) {
      const { data: existing } = await supabase
        .from('ledger_entries')
        .select('id')
        .eq('org_id', orgId)
        .eq('reference_type', 'invoice')
        .eq('reference_id', input.invoiceId)
        .maybeSingle();
      if (!existing) {
        try {
          await supabase.from('ledger_entries').insert({
            org_id: orgId,
            contact_id: inv.customer_id,
            type: 'credit',
            amount: Number(inv.total) || Math.abs(Number(input.amount) || 0),
            note: `Credit / Udhaar for ${inv.invoice_number ?? 'invoice'}`,
            reference_type: 'invoice',
            reference_id: input.invoiceId,
            entry_date: input.paidAt,
            created_by: ctx.user.id,
          });
        } catch { /* ledger optional */ }
      }
    }
    return NextResponse.json({ success: true });
  }

  // ── Advance payment (no invoice — customer pays upfront) ────────────
  if (input.paymentType === 'advance') {
    if (!input.contactId) {
      return NextResponse.json({ error: 'Select the customer for this advance payment' }, { status: 400 });
    }
    const { data: pmt, error: payErr } = await supabase.from('payments').insert({
      org_id: orgId,
      contact_id: input.contactId,
      invoice_id: null,
      payment_type: 'advance',
      amount: input.amount,
      method: input.method,
      status: 'completed',
      reference_number: input.referenceNumber?.trim() || null,
      notes: input.notes?.trim() || null,
      paid_at: input.paidAt,
      created_by: ctx.user.id,
    }).select('id').single();

    if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });

    // Post advance to ledger as a credit balance (money received, not yet applied)
    if (hasLedger) {
      try {
        const { data: contact } = await supabase.from('contacts').select('name').eq('id', input.contactId).maybeSingle();
        await supabase.from('ledger_entries').insert({
          org_id: orgId,
          contact_id: input.contactId,
          type: 'payment',
          amount: -Math.abs(Number(input.amount)),
          note: `Advance payment received from ${contact?.name ?? 'customer'}`,
          reference_type: 'payment',
          reference_id: pmt!.id,
          entry_date: input.paidAt,
          created_by: ctx.user.id,
        });
      } catch { /* ledger optional */ }
    }
    return NextResponse.json({ success: true });
  }

  // ── Multi-invoice allocation ─────────────────────────────────────────
  if (input.allocations && input.allocations.length > 0) {
    const { data: pmt, error: payErr } = await supabase.from('payments').insert({
      org_id: orgId,
      invoice_id: null,
      payment_type: 'invoice',
      amount: input.amount,
      method: input.method,
      status: 'completed',
      reference_number: input.referenceNumber?.trim() || null,
      notes: input.notes?.trim() || null,
      paid_at: input.paidAt,
      created_by: ctx.user.id,
    }).select('id').single();

    if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });

    const allocationRows = input.allocations.map((a) => ({
      org_id: orgId,
      payment_id: pmt!.id,
      invoice_id: a.invoiceId,
      amount: a.amount,
    }));

    await supabase.from('payment_allocations').insert(allocationRows);

    // Sync each allocated invoice
    for (const a of input.allocations) {
      await syncInvoice(supabase, orgId, a.invoiceId);
      if (hasLedger) {
        try {
          const { data: inv } = await supabase
            .from('invoices')
            .select('customer_id, invoice_number')
            .eq('id', a.invoiceId)
            .maybeSingle();
          if (inv?.customer_id) {
            await supabase.from('ledger_entries').insert({
              org_id: orgId,
              contact_id: inv.customer_id,
              type: 'payment',
              amount: -Math.abs(Number(a.amount)),
              note: `Payment for ${inv.invoice_number ?? 'invoice'} (split)`,
              reference_type: 'payment',
              reference_id: pmt!.id,
              entry_date: input.paidAt,
              created_by: ctx.user.id,
            });
          }
        } catch { /* ledger optional */ }
      }
    }
    return NextResponse.json({ success: true });
  }

  // ── Standard single-invoice payment ─────────────────────────────────
  const { data: pmt, error: payErr } = await supabase.from('payments').insert({
    org_id: orgId,
    invoice_id: input.invoiceId || null,
    payment_type: 'invoice',
    amount: input.amount,
    method: input.method,
    status: 'completed',
    reference_number: input.referenceNumber?.trim() || null,
    notes: input.notes?.trim() || null,
    paid_at: input.paidAt,
    created_by: ctx.user.id,
  }).select('id').single();

  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });

  if (input.invoiceId) {
    await syncInvoice(supabase, orgId, input.invoiceId);

    if (hasLedger) {
      try {
        const { data: inv } = await supabase
          .from('invoices')
          .select('customer_id, invoice_number')
          .eq('id', input.invoiceId)
          .maybeSingle();
        if (inv?.customer_id) {
          await supabase.from('ledger_entries').insert({
            org_id: orgId,
            contact_id: inv.customer_id,
            type: 'payment',
            amount: -Math.abs(Number(input.amount)),
            note: `Payment for ${inv.invoice_number ?? 'invoice'}`,
            reference_type: 'payment',
            reference_id: pmt!.id,
            entry_date: input.paidAt,
            created_by: ctx.user.id,
          });
        }
      } catch { /* ledger optional */ }
    }
  }

  return NextResponse.json({ success: true });
}
