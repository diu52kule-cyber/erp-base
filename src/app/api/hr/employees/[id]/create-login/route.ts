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

  const { role } = await req.json();

  const supabase = createClient();
  const admin = createAdminClient();

  // Fetch the employee — must belong to this org
  const { data: employee } = await supabase
    .from('employees')
    .select('id, name, email, user_id')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  if (employee.user_id) return NextResponse.json({ error: 'Employee already has a login account' }, { status: 400 });
  if (!employee.email) return NextResponse.json({ error: 'Employee must have an email address to create a login' }, { status: 400 });

  // Check if a Supabase user already exists with this email
  const { data: allUsers } = await admin.auth.admin.listUsers();
  const existingUser = allUsers?.users?.find(
    (u) => u.email?.toLowerCase() === employee.email!.toLowerCase(),
  );

  let userId: string;
  let generatedPassword: string | null = null;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    generatedPassword = generatePassword();
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email: employee.email.toLowerCase(),
      password: generatedPassword,
      email_confirm: true,
    });
    if (authErr || !created?.user) {
      return NextResponse.json({ error: authErr?.message ?? 'Failed to create login' }, { status: 500 });
    }
    userId = created.user.id;
  }

  // Add membership (if not already one)
  const { data: existingMembership } = await supabase
    .from('memberships')
    .select('id')
    .eq('org_id', ctx.org.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existingMembership) {
    await admin.from('memberships').insert({
      org_id: ctx.org.id,
      user_id: userId,
      role: role ?? 'staff',
    });
  }

  // Link user_id to the employee record
  await supabase.from('employees').update({ user_id: userId }).eq('id', params.id).eq('org_id', ctx.org.id);

  // Send welcome email (best-effort)
  if (generatedPassword) {
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    if (resendKey && fromEmail) {
      try {
        const { Resend } = await import('resend');
        await new Resend(resendKey).emails.send({
          from: fromEmail,
          to: employee.email.toLowerCase(),
          subject: `Your login for ${ctx.org.name}`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#171717">Hi ${employee.name},</h2>
            <p style="color:#525252">Your manager has created a workspace login for you at ${ctx.org.name}.</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:4px 0;font-size:14px"><strong>Email:</strong> ${employee.email.toLowerCase()}</p>
              <p style="margin:4px 0;font-size:14px"><strong>Password:</strong> <code style="background:#e5e5e5;padding:2px 6px;border-radius:4px">${generatedPassword}</code></p>
            </div>
            <p><a href="${appUrl}/login" style="display:inline-block;background:#171717;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Log in now</a></p>
            <p style="color:#a3a3a3;font-size:12px">Change your password after login via Settings → Password.</p>
          </div>`,
        });
      } catch { /* ignore */ }
    }
  }

  return NextResponse.json({
    success: true,
    user_id: userId,
    login_email: employee.email.toLowerCase(),
    ...(generatedPassword ? { generated_password: generatedPassword } : {}),
  });
}
