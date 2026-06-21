import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('payments')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const orgId = ctx.org.id;
  const { notes } = await req.json().catch(() => ({ notes: '' }));

  // Fetch the original payment
  const { data: original } = await supabase
    .from('payments')
    .select('id, amount, method, invoice_id, payment_type, status')
    .eq('id', params.id)
    .eq('org_id', orgId)
    .eq('status', 'completed')
    .neq('payment_type', 'refund')
    .maybeSingle();

  if (!original) {
    return NextResponse.json({ error: 'Payment not found or already refunded' }, { status: 404 });
  }

  // Create refund payment record
  const { error: refundErr } = await supabase.from('payments').insert({
    org_id: orgId,
    invoice_id: original.invoice_id,
    payment_type: 'refund',
    refund_of_payment_id: original.id,
    amount: Number(original.amount),
    method: original.method,
    status: 'completed',
    notes: notes?.trim() || `Refund of payment ${original.id.slice(0, 8)}`,
    paid_at: new Date().toISOString().split('T')[0],
    created_by: ctx.user.id,
  });

  if (refundErr) return NextResponse.json({ error: refundErr.message }, { status: 500 });

  // Re-sync invoice amount_paid and status
  if (original.invoice_id) {
    const [{ data: directPayments }, { data: allocations }, { data: inv }] = await Promise.all([
      supabase
        .from('payments')
        .select('amount, payment_type')
        .eq('org_id', orgId)
        .eq('invoice_id', original.invoice_id)
        .eq('status', 'completed'),
      supabase
        .from('payment_allocations')
        .select('amount')
        .eq('org_id', orgId)
        .eq('invoice_id', original.invoice_id),
      supabase
        .from('invoices')
        .select('total')
        .eq('id', original.invoice_id)
        .eq('org_id', orgId)
        .maybeSingle(),
    ]);

    const directPaid = (directPayments ?? []).reduce((s, p) => {
      return p.payment_type === 'refund' ? s - Number(p.amount) : s + Number(p.amount);
    }, 0);
    const allocPaid = (allocations ?? []).reduce((s, a) => s + Number(a.amount), 0);
    const totalPaid = Math.max(0, directPaid + allocPaid);
    const total = Number(inv?.total ?? 0);
    const newStatus = totalPaid >= total ? 'paid' : totalPaid > 0 ? 'partial' : 'refunded';

    await supabase
      .from('invoices')
      .update({ amount_paid: totalPaid, status: newStatus })
      .eq('id', original.invoice_id)
      .eq('org_id', orgId);

    // Reverse ledger entry
    if (ctx.enabledModules.has('ledger')) {
      try {
        const { data: inv2 } = await supabase
          .from('invoices')
          .select('customer_id, invoice_number')
          .eq('id', original.invoice_id)
          .maybeSingle();
        if (inv2?.customer_id) {
          await supabase.from('ledger_entries').insert({
            org_id: orgId,
            contact_id: inv2.customer_id,
            type: 'credit',
            amount: Math.abs(Number(original.amount)),
            note: `Refund issued for ${inv2.invoice_number ?? 'invoice'}`,
            reference_type: 'payment',
            reference_id: original.id,
            entry_date: new Date().toISOString().split('T')[0],
            created_by: ctx.user.id,
          });
        }
      } catch { /* ledger optional */ }
    }
  }

  return NextResponse.json({ success: true });
}
