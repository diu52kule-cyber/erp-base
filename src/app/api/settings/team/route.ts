import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgContext } from '@/lib/entitlements';
import { canInvite } from '@/lib/types/roles';
import type { OrgRole } from '@/lib/types/roles';

// GET — list all members + pending invites
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const admin    = createAdminClient();

  const [{ data: memberships }, { data: invites }] = await Promise.all([
    supabase.from('memberships').select('id,user_id,role,created_at').eq('org_id', ctx.org.id),
    supabase.from('org_invites').select('id,email,role,token,expires_at,accepted_at,created_at')
      .eq('org_id', ctx.org.id).is('accepted_at', null).gt('expires_at', new Date().toISOString()),
  ]);

  // Fetch user emails via admin client
  const userIds = (memberships ?? []).map((m) => m.user_id);
  const userEmails: Record<string, string> = {};
  for (const id of userIds) {
    try {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) userEmails[id] = data.user.email;
    } catch {}
  }

  const members = (memberships ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    email: userEmails[m.user_id] ?? 'Unknown',
    role: m.role as OrgRole,
    joined_at: m.created_at,
    is_self: m.user_id === ctx.user.id,
  }));

  return NextResponse.json({ members, invites: invites ?? [] });
}

// POST — create an invite
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canInvite(ctx.org.role as OrgRole))
    return NextResponse.json({ error: 'Only owners and managers can invite members' }, { status: 403 });

  const { email, role } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const supabase = createClient();

  // Check if already a member
  const admin = createAdminClient();
  const { data: existing } = await admin.auth.admin.listUsers();
  const existingUser = existing?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase().trim());
  if (existingUser) {
    const { data: existingMember } = await supabase
      .from('memberships')
      .select('id')
      .eq('org_id', ctx.org.id)
      .eq('user_id', existingUser.id)
      .maybeSingle();
    if (existingMember) return NextResponse.json({ error: 'User is already a member of this organisation' }, { status: 400 });
  }

  // Delete any existing pending invite for this email
  await supabase.from('org_invites')
    .delete()
    .eq('org_id', ctx.org.id)
    .eq('email', email.toLowerCase().trim())
    .is('accepted_at', null);

  const { data: invite, error } = await supabase.from('org_invites')
    .insert({
      org_id: ctx.org.id,
      email: email.toLowerCase().trim(),
      role: role ?? 'staff',
      invited_by: ctx.user.id,
    })
    .select('token')
    .single();

  if (error || !invite) return NextResponse.json({ error: error?.message ?? 'Failed to create invite' }, { status: 500 });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invite/${invite.token}`;
  return NextResponse.json({ token: invite.token, invite_url: inviteUrl });
}
