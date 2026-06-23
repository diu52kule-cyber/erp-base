import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgContext } from '@/lib/entitlements';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('hr')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!['owner', 'admin', 'manager', 'hr'].includes(ctx.org.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const supabase = createClient();
  const admin = createAdminClient();

  const { data: employee } = await supabase
    .from('employees')
    .select('id, name, email, user_id')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  if (!employee.user_id) return NextResponse.json({ error: 'Employee does not have a login account' }, { status: 400 });

  const newPassword = generatePassword();

  const { error: updateErr } = await admin.auth.admin.updateUserById(employee.user_id, {
    password: newPassword,
  });

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Email the new password (best-effort)
  if (employee.email) {
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp-base-eight.vercel.app';
    if (resendKey && fromEmail) {
      try {
        const { Resend } = await import('resend');
        await new Resend(resendKey).emails.send({
          from: fromEmail,
          to: employee.email,
          subject: `Your password has been reset — ${ctx.org.name}`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#171717">Password reset</h2>
            <p style="color:#525252">Your password for ${ctx.org.name} has been reset by an admin.</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:4px 0;font-size:14px"><strong>New password:</strong> <code style="background:#e5e5e5;padding:2px 6px;border-radius:4px">${newPassword}</code></p>
            </div>
            <p><a href="${appUrl}/login" style="display:inline-block;background:#171717;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Log in</a></p>
            <p style="color:#a3a3a3;font-size:12px">Change your password via Settings → Password after logging in.</p>
          </div>`,
        });
      } catch { /* ignore */ }
    }
  }

  return NextResponse.json({ success: true, generated_password: newPassword });
}
