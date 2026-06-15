import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { canManageRoles, canRemoveMember } from '@/lib/types/roles';
import type { OrgRole } from '@/lib/types/roles';

// PATCH — change role
export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageRoles(ctx.org.role as OrgRole))
    return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 });
  if (params.userId === ctx.user.id)
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });

  const { role } = await req.json();
  const supabase = createClient();
  const { error } = await supabase.from('memberships')
    .update({ role })
    .eq('org_id', ctx.org.id)
    .eq('user_id', params.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove member
export async function DELETE(_req: NextRequest, { params }: { params: { userId: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canRemoveMember(ctx.org.role as OrgRole))
    return NextResponse.json({ error: 'Only owners can remove members' }, { status: 403 });
  if (params.userId === ctx.user.id)
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase.from('memberships')
    .delete()
    .eq('org_id', ctx.org.id)
    .eq('user_id', params.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
