import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminRequest } from '@/lib/adminAuth';
import { MODULES } from '@/lib/modules';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { id } = params;

  const [{ data: org }, { data: plan }, { data: members }, { data: entitlements }, { data: invoices }, { data: employees }] = await Promise.all([
    admin.from('organizations').select('*').eq('id', id).single(),
    admin.from('org_plans').select('*').eq('org_id', id).maybeSingle(),
    admin.from('memberships').select('user_id,role').eq('org_id', id),
    admin.from('entitlements').select('module_key,enabled').eq('org_id', id),
    admin.from('invoices').select('total,status').eq('org_id', id).eq('doc_type', 'invoice'),
    admin.from('employees').select('id').eq('org_id', id),
  ]);

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: { users } = { users: [] } } = userIds.length
    ? await admin.auth.admin.listUsers()
    : { data: { users: [] } };
  const emailMap = Object.fromEntries((users ?? []).map((u) => [u.id, u.email]));

  const enabledModules = new Set((entitlements ?? []).filter((e) => e.enabled).map((e) => e.module_key));
  const allModules = MODULES.map((m) => ({ ...m, enabled: enabledModules.has(m.key) }));
  const revenue = (invoices ?? []).filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);

  return NextResponse.json({
    org,
    plan: plan ?? { plan_name: 'trial', status: 'trial', amount: 0, billing_period: 'monthly', next_billing_date: null, notes: '' },
    members: (members ?? []).map((m) => ({ ...m, email: emailMap[m.user_id] ?? m.user_id })),
    modules: allModules,
    stats: {
      invoice_count: invoices?.length ?? 0,
      revenue,
      employee_count: employees?.length ?? 0,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { id } = params;
  const body = await req.json();

  if (body.plan) {
    await admin.from('org_plans').upsert({
      org_id: id,
      ...body.plan,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id' });
  }

  if (body.module_key !== undefined) {
    await admin.from('entitlements').upsert({
      org_id: id,
      module_key: body.module_key,
      enabled: body.enabled,
    }, { onConflict: 'org_id,module_key' });
  }

  if (body.all_modules !== undefined) {
    const rows = MODULES.map((m) => ({ org_id: id, module_key: m.key, enabled: body.all_modules }));
    await admin.from('entitlements').upsert(rows, { onConflict: 'org_id,module_key' });
  }

  // Toggle a specific set of modules (a bundle, e.g. all workspace modules)
  if (Array.isArray(body.module_keys)) {
    const rows = body.module_keys.map((key: string) => ({ org_id: id, module_key: key, enabled: !!body.enabled }));
    if (rows.length) await admin.from('entitlements').upsert(rows, { onConflict: 'org_id,module_key' });
  }

  return NextResponse.json({ success: true });
}
