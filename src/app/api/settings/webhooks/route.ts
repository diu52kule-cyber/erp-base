import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';
import { canManageRoles } from '@/lib/types/roles';
import type { OrgRole } from '@/lib/types/roles';
import crypto from 'crypto';

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageRoles(ctx.org.role as OrgRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const supabase = await createClient();
  const { data } = await supabase.from('webhooks').select('id,url,events,active,created_at')
    .eq('org_id', ctx.org.id).order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageRoles(ctx.org.role as OrgRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { url, events } = await req.json();
  if (!url || !events?.length) return NextResponse.json({ error: 'URL and events required' }, { status: 400 });
  const secret = 'whsec_' + crypto.randomBytes(20).toString('hex');
  const supabase = await createClient();
  const { data, error } = await supabase.from('webhooks')
    .insert({ org_id: ctx.org.id, url, events, secret, active: true })
    .select('id,url,events,active,created_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, secret });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageRoles(ctx.org.role as OrgRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await req.json();
  const supabase = await createClient();
  await supabase.from('webhooks').delete().eq('id', id).eq('org_id', ctx.org.id);
  return NextResponse.json({ success: true });
}
