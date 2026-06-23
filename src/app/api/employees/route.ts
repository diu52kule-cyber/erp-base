import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgContext } from '@/lib/entitlements';

function generatePassword(): string {
  // Readable random password — avoids ambiguous chars (0/O, 1/l/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org || !ctx.enabledModules.has('hr')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    name, email, phone, department, designation,
    employment_type, joining_date, monthly_salary,
    create_login, role,
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (create_login && !email?.trim()) {
    return NextResponse.json({ error: 'Email is required to create a login account' }, { status: 400 });
  }

  const admin = createAdminClient();
  const supabase = createClient();

  let userId: string | null = null;
  let generatedPassword: string | null = null;

  if (create_login && email?.trim()) {
    // Check if a Supabase user with this email already exists
    const { data: existing } = await admin.auth.admin.listUsers();
    const existingUser = existing?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase().trim(),
    );

    if (existingUser) {
      // Already has an account — just link membership if not already a member
      userId = existingUser.id;
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
    } else {
      // Create a new Supabase auth user
      generatedPassword = generatePassword();
      const { data: created, error: authErr } = await admin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: generatedPassword,
        email_confirm: true,
      });
      if (authErr || !created?.user) {
        return NextResponse.json({ error: authErr?.message ?? 'Failed to create login account' }, { status: 500 });
      }
      userId = created.user.id;

      // Add them as a member of this org
      await admin.from('memberships').insert({
        org_id: ctx.org.id,
        user_id: userId,
        role: role ?? 'staff',
      });

      // Send welcome email with credentials (best-effort)
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp-base-eight.vercel.app';
      if (resendKey && fromEmail) {
        try {
          const { Resend } = await import('resend');
          await new Resend(resendKey).emails.send({
            from: fromEmail,
            to: email.toLowerCase().trim(),
            subject: `Your login for ${ctx.org.name}`,
            html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#171717">Welcome to ${ctx.org.name}</h2>
              <p style="color:#525252">Your manager has created a workspace account for you. Use these credentials to log in:</p>
              <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:4px 0;font-size:14px"><strong>Email:</strong> ${email.toLowerCase().trim()}</p>
                <p style="margin:4px 0;font-size:14px"><strong>Password:</strong> <code style="background:#e5e5e5;padding:2px 6px;border-radius:4px">${generatedPassword}</code></p>
              </div>
              <p><a href="${appUrl}/login" style="display:inline-block;background:#171717;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Log in now</a></p>
              <p style="color:#a3a3a3;font-size:12px">Please change your password after first login via Settings → Password.</p>
            </div>`,
          });
        } catch { /* ignore — credentials still shown in UI */ }
      }
    }
  }

  const { data, error } = await supabase
    .from('employees')
    .insert({
      org_id: ctx.org.id,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone || null,
      department: department || null,
      designation: designation || null,
      employment_type: employment_type || 'full-time',
      joining_date: joining_date || new Date().toISOString().split('T')[0],
      monthly_salary: parseFloat(monthly_salary) || 0,
      created_by: ctx.user.id,
      user_id: userId,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    ...(generatedPassword ? { generated_password: generatedPassword, login_email: email.toLowerCase().trim() } : {}),
  });
}
