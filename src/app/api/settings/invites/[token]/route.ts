import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

// GET — fetch invite details by token (public — no auth required)
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('org_invites')
    .select('id,email,role,expires_at,accepted_at,org_id,organizations(name,business_type)')
    .eq('token', params.token)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (data.accepted_at)  return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 });
  if (new Date(data.expires_at) < new Date()) return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });

  return NextResponse.json({
    email: data.email,
    role: data.role,
    org: data.organizations,
    expires_at: data.expires_at,
  });
}

// POST — accept invite (requires auth)
export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.user) return NextResponse.json({ error: 'You must be signed in to accept an invite' }, { status: 401 });

  const admin    = createAdminClient();
  const supabase = createClient();

  // Fetch invite
  const { data: invite, error: invErr } = await admin
    .from('org_invites')
    .select('id,org_id,role,email,accepted_at,expires_at')
    .eq('token', params.token)
    .single();

  if (invErr || !invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.accepted_at)  return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });

  // Email-match guard: invite must match the logged-in account
  if (invite.email && ctx.user.email && ctx.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}. Sign in with that account to accept it.` },
      { status: 403 },
    );
  }

  // Check not already a member
  const { data: existingMember } = await supabase
    .from('memberships')
    .select('id')
    .eq('org_id', invite.org_id)
    .eq('user_id', ctx.user.id)
    .maybeSingle();

  if (existingMember) {
    // Already a member — mark invite accepted and redirect
    await admin.from('org_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);
    return NextResponse.json({ org_id: invite.org_id, already_member: true });
  }

  // Create membership via admin (bypasses RLS since user is not yet a member)
  const { error: memErr } = await admin.from('memberships').insert({
    org_id: invite.org_id,
    user_id: ctx.user.id,
    role: invite.role,
  });

  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });

  // Mark invite accepted
  await admin.from('org_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);

  return NextResponse.json({ org_id: invite.org_id });
}
