import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const SITE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp-base-eight.vercel.app';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const admin = createAdminClient();
  // Generate a recovery link pointed at our live reset page (the redirect target
  // must also be allow-listed in Supabase → Auth → URL Configuration).
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${SITE}/reset-password` },
  });

  // Send our own branded email via Resend when a link was generated.
  const link = data?.properties?.action_link;
  if (!error && link) {
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (resendKey && from) {
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
      } catch { /* ignore email send errors */ }
    }
  }

  // Always succeed (don't reveal whether the email exists).
  return NextResponse.json({ success: true });
}
