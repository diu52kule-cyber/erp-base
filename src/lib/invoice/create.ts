import type { SupabaseClient } from '@supabase/supabase-js';
import { buildInvoiceComputation } from './server';
import { applyStockForDoc } from './stock';
import type { DocType } from './docTypes';
import type { CreateInvoiceInput } from '@/lib/types/billing';

export type CreateDocCtx = {
  orgId: string;
  userId: string | null;
  hasLedger: boolean;
  orgStateCode: string | null;
};

// Inserts a document (any doc_type) + its line items, then applies the
// side-effects that belong to that type:
//   invoice      -> receivable to customer ledger (+ optional payment-at-creation)
//   credit_note  -> negative adjustment to customer ledger (reduces receivable)
//   quote/proforma/challan -> none
export async function createDocument(
  supabase: SupabaseClient,
  ctx: CreateDocCtx,
  input: CreateInvoiceInput,
  docType: DocType,
): Promise<{ id: string; number: string } | { error: string }> {
  const { header, items } = buildInvoiceComputation(input, ctx.orgStateCode);

  const { data: docNumber, error: seqErr } = await supabase.rpc('next_document_number', {
    p_org_id: ctx.orgId,
    p_doc_type: docType,
  });
  if (seqErr || !docNumber) {
    return { error: seqErr?.message ?? 'Failed to generate document number' };
  }

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      org_id: ctx.orgId,
      invoice_number: docNumber as string,
      doc_type: docType,
      status: 'draft',
      amount_paid: 0,
      source_doc_id: input.source_doc_id ?? null,
      ...header,
      created_by: ctx.userId,
    })
    .select('id')
    .single();

  if (invErr || !invoice) {
    return { error: invErr?.message ?? 'Failed to create document' };
  }

  const { error: itemsErr } = await supabase
    .from('invoice_items')
    .insert(items.map((item) => ({ invoice_id: invoice.id, org_id: ctx.orgId, ...item })));
  if (itemsErr) return { error: itemsErr.message };

  // Move inventory: a sale (invoice) deducts stock; a credit note adds it back.
  await applyStockForDoc(supabase, ctx.orgId, ctx.userId, docType, docNumber as string, items, 'apply');

  if (docType === 'invoice') {
    if (header.customer_id && ctx.hasLedger) {
      try {
        await supabase.from('ledger_entries').insert({
          org_id: ctx.orgId,
          contact_id: header.customer_id,
          type: 'credit',
          amount: header.total,
          note: `Invoice ${docNumber}`,
          reference_type: 'invoice',
          reference_id: invoice.id,
          entry_date: header.issue_date,
          created_by: ctx.userId,
        });
      } catch { /* ledger optional */ }
    }

    // Payment(s) captured at creation — one or a split across cash/UPI/card/bank.
    // Anything not covered stays outstanding (credit / udhaar).
    const payLines = (input.payments?.length ? input.payments : input.payment ? [input.payment] : [])
      .filter((p) => p && p.method && p.method !== 'credit' && (Number(p.amount) || 0) > 0);
    if (payLines.length) {
      try {
        let totalPaid = 0;
        for (const pay of payLines) {
          const remaining = header.total - totalPaid;
          if (remaining <= 0.001) break;
          const payAmt = Math.min(Number(pay.amount) || 0, remaining);
          if (payAmt <= 0) continue;
          await supabase.from('payments').insert({
            org_id: ctx.orgId,
            invoice_id: invoice.id,
            amount: payAmt,
            method: pay.method,
            status: 'completed',
            reference_number: pay.reference?.trim() || null,
            paid_at: header.issue_date,
            created_by: ctx.userId,
          });
          totalPaid += payAmt;
          if (header.customer_id && ctx.hasLedger) {
            await supabase.from('ledger_entries').insert({
              org_id: ctx.orgId,
              contact_id: header.customer_id,
              type: 'payment',
              amount: -Math.abs(payAmt),
              note: `Payment (${pay.method}) on ${docNumber}`,
              reference_type: 'payment',
              reference_id: invoice.id,
              entry_date: header.issue_date,
              created_by: ctx.userId,
            });
          }
        }
        const fullyPaid = totalPaid >= header.total - 0.01;
        await supabase
          .from('invoices')
          .update({ status: fullyPaid ? 'paid' : totalPaid > 0 ? 'partial' : 'draft', amount_paid: totalPaid })
          .eq('id', invoice.id)
          .eq('org_id', ctx.orgId);
      } catch { /* payment optional */ }
    }
  }

  if (docType === 'credit_note' && header.customer_id && ctx.hasLedger) {
    // A credit note reduces what the customer owes.
    try {
      await supabase.from('ledger_entries').insert({
        org_id: ctx.orgId,
        contact_id: header.customer_id,
        type: 'adjustment',
        amount: -Math.abs(header.total),
        note: `Credit Note ${docNumber}`,
        reference_type: 'credit_note',
        reference_id: invoice.id,
        entry_date: header.issue_date,
        created_by: ctx.userId,
      });
    } catch { /* ledger optional */ }
  }

  return { id: invoice.id, number: docNumber as string };
}
