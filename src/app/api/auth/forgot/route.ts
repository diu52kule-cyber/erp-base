import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp-base-eight.vercel.app';

export async function POST(req: NextRequest) {
  // Rate limit: 3 password reset attempts per IP per 15 minutes
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const allowed = await checkRateLimit(rateLimitKey('forgot', ip), 3, 900);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many reset attempts. Please try again later.' }, { status: 429 });
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  let sent = false;

  // Preferred: branded email via Resend using an admin-generated recovery link.
  if (resendKey && from) {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${SITE}/reset-password` },
    });
    const link = data?.properties?.action_link;
    if (!error && link) {
      try {
        const { Resend } = await import('resend');
        await new Resend(resendKey).emails.send({
          from,
          to: email,
          subject: 'Reset your ERP Base password',
          html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#171717">Reset your password</h2>
            <p style="color:#525252">Click the button below to set a new password. This link expires in 1 hour.</p>
            <p><a href="${link}" style="display:inline-block;background:#171717;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none">Reset password</a></p>
            <p style="color:#a3a3a3;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
          </div>`,
        });
        sent = true;
      } catch { /* fall through to Supabase mailer */ }
    }
  }

  // Fallback: Supabase's built-in mailer (unbranded) so reset always works.
  if (!sent) {
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE}/reset-password` });
  }

  // Always succeed (don't reveal whether the email exists).
  return NextResponse.json({ success: true });
}
