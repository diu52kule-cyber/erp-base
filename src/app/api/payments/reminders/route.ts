import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { Resend } from 'resend';

export async function POST(_req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('payments')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'invoices@gradia.in';

  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Find overdue invoices: past due_date, unpaid, with customer email
  const { data: overdue } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_name, customer_email, total, amount_paid, due_date')
    .eq('org_id', ctx.org.id)
    .eq('doc_type', 'invoice')
    .in('status', ['sent', 'partial'])
    .lt('due_date', today)
    .not('customer_email', 'is', null)
    .order('due_date', { ascending: true });

  if (!overdue?.length) {
    return NextResponse.json({ sent: 0, message: 'No overdue invoices with email addresses' });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const inv of overdue) {
    const balance = Math.max(0, Number(inv.total) - Number(inv.amount_paid ?? 0));
    const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000);

    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: fromEmail,
          to: inv.customer_email!,
          subject: `Payment Reminder: ${inv.invoice_number} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>Dear ${inv.customer_name},</p>
              <p>This is a friendly reminder that invoice <strong>${inv.invoice_number}</strong> is overdue by <strong>${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</strong>.</p>
              <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e5e5; color: #666;">Invoice</td>
                  <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">${inv.invoice_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e5e5; color: #666;">Due Date</td>
                  <td style="padding: 8px; border: 1px solid #e5e5e5;">${new Date(inv.due_date).toLocaleDateString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e5e5; color: #666;">Amount Due</td>
                  <td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold; color: #b91c1c;">₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </table>
              <p>Please arrange payment at the earliest. If you have already made the payment, please disregard this reminder.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated reminder. Please do not reply to this email.</p>
            </div>
          `,
        });
        sent++;
      } catch (e: any) {
        errors.push(`${inv.invoice_number}: ${e?.message ?? 'send failed'}`);
        continue;
      }
    }

    // Update last_reminder_sent_at regardless of email success
    await supabase
      .from('invoices')
      .update({ last_reminder_sent_at: new Date().toISOString() })
      .eq('id', inv.id);

    if (!resendKey) sent++;
  }

  return NextResponse.json({
    sent,
    total: overdue.length,
    emailConfigured: !!resendKey,
    errors: errors.length ? errors : undefined,
  });
}
