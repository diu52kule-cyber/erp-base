import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';
import { fmtMoney } from '@/lib/invoice/format';

// Daily cron — sends a single reminder email for invoices that are ≥7 days overdue
// and haven't had a reminder in the last 7 days. Vercel cron: "0 9 * * *"
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resendKey  = process.env.RESEND_API_KEY;
  const fromEmail  = process.env.RESEND_FROM_EMAIL ?? 'invoices@erp-base.com';
  if (!resendKey) {
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not set' });
  }

  const admin  = createAdminClient();
  const resend = new Resend(resendKey);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString().split('T')[0];
  const now = new Date().toISOString();

  // Invoices ≥7 days past due, unpaid, with a customer email, and no recent reminder
  const { data: invoices, error } = await admin
    .from('invoices')
    .select('id, invoice_number, customer_name, customer_email, total, amount_paid, due_date, org_id')
    .eq('doc_type', 'invoice')
    .in('status', ['sent', 'partial'])
    .not('customer_email', 'is', null)
    .lte('due_date', sevenDaysAgo)
    .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lte.${new Date(Date.now() - 7 * 86400_000).toISOString()}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0, failed = 0;

  for (const inv of invoices ?? []) {
    if (!inv.customer_email) continue;

    // Fetch org name for the from field
    const { data: org } = await admin
      .from('organizations')
      .select('name')
      .eq('id', inv.org_id)
      .single();

    const balanceDue  = Math.max(0, (inv.total ?? 0) - (inv.amount_paid ?? 0));
    const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400_000);
    const payUrl      = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp-base-eight.vercel.app'}/pay/${inv.id}`;

    try {
      await resend.emails.send({
        from:    `${org?.name ?? 'Accounts'} <${fromEmail}>`,
        to:      [inv.customer_email],
        subject: `Payment reminder — ${inv.invoice_number} is ${daysOverdue} days overdue`,
        html: `
          <p>Dear ${inv.customer_name},</p>
          <p>This is a friendly reminder that invoice <strong>${inv.invoice_number}</strong>
             for <strong>${fmtMoney(balanceDue, 'INR')}</strong> is now
             <strong>${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue</strong>.</p>
          <p>
            <a href="${payUrl}" style="display:inline-block;background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
              Pay Now
            </a>
          </p>
          <p>If you have already paid, please disregard this message.</p>
          <p>Regards,<br/>${org?.name ?? 'Accounts Team'}</p>
        `,
      });

      await admin
        .from('invoices')
        .update({ last_reminder_sent_at: now })
        .eq('id', inv.id);

      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: (invoices ?? []).length });
}
