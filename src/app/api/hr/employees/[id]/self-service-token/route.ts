import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = ctx.org.role as string;
  if (!['owner', 'admin', 'manager', 'hr'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createClient();
  // Verify employee belongs to this org
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('id', params.id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  // Generate a new UUID token using admin client (bypasses RLS on employees)
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('employees')
    .update({ self_service_token: crypto.randomUUID(), self_service_enabled: true })
    .eq('id', params.id)
    .select('self_service_token')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token: data.self_service_token });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('hr') || !ctx.org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  await admin
    .from('employees')
    .update({ self_service_token: null, self_service_enabled: false })
    .eq('id', params.id);

  return NextResponse.json({ ok: true });
}
