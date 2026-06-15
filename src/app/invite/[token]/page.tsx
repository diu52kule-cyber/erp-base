import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import InviteClient from './InviteClient';

export default async function InvitePage({ params }: { params: { token: string } }) {
  const admin    = createAdminClient();
  const supabase = createClient();

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch invite details (server-side, bypasses RLS)
  const { data: invite } = await admin
    .from('org_invites')
    .select('email,role,expires_at,accepted_at,organizations(name,business_type)')
    .eq('token', params.token)
    .single();

  let inviteInfo = null;
  if (invite && !invite.accepted_at && new Date(invite.expires_at) >= new Date()) {
    inviteInfo = {
      email: invite.email,
      role: invite.role,
      org: invite.organizations as unknown as { name: string; business_type: string },
      expires_at: invite.expires_at,
    };
  }

  return <InviteClient token={params.token} invite={inviteInfo} loggedIn={!!user} />;
}
