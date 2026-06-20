import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create user with email pre-confirmed — no confirmation email sent, no rate limit
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr) {
    const msg = createErr.message.toLowerCase().includes('already registered')
      ? 'An account with this email already exists.'
      : createErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Sign the user in so they get a session cookie
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) {
    return NextResponse.json({ error: signInErr.message }, { status: 400 });
  }

  // Best-effort welcome email (transactional via Resend). Never blocks signup.
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (resendKey && fromEmail) {
    try {
      const { Resend } = await import('resend');
      await new Resend(resendKey).emails.send({
        from: fromEmail,
        to: email,
        subject: 'Welcome to ERP Base 👋',
        html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#171717">Welcome to ERP Base</h2>
          <p style="color:#525252">Your account is ready. Set up your workspace and start your 7-day free trial.</p>
          <p><a href="https://erp-base-eight.vercel.app/dashboard" style="display:inline-block;background:#171717;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open your dashboard</a></p>
          <p style="color:#a3a3a3;font-size:12px">If you didn't create this account, you can ignore this email.</p>
        </div>`,
      });
    } catch { /* ignore email errors */ }
  }

  return NextResponse.json({ success: true });
}
