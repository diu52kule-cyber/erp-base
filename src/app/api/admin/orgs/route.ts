import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminRequest } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  const [{ data: orgs }, { data: plans }, { data: members }, { data: entitlements }] = await Promise.all([
    admin.from('organizations').select('id,name,business_type,created_at').order('created_at', { ascending: false }),
    admin.from('org_plans').select('*'),
    admin.from('memberships').select('org_id,user_id'),
    admin.from('entitlements').select('org_id,module_key,enabled').eq('enabled', true),
  ]);

  const { data: invoiceStats } = await admin.from('invoices').select('org_id,total,status');

  const planMap = Object.fromEntries((plans ?? []).map((p) => [p.org_id, p]));
  const memberCount = (members ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.org_id] = (acc[m.org_id] ?? 0) + 1; return acc;
  }, {});
  const moduleCount = (entitlements ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.org_id] = (acc[e.org_id] ?? 0) + 1; return acc;
  }, {});
  const orgRevenue = (invoiceStats ?? []).reduce<Record<string, { total: number; paid: number; count: number }>>((acc, inv) => {
    if (!acc[inv.org_id]) acc[inv.org_id] = { total: 0, paid: 0, count: 0 };
    acc[inv.org_id].count += 1;
    acc[inv.org_id].total += Number(inv.total ?? 0);
    if (inv.status === 'paid') acc[inv.org_id].paid += Number(inv.total ?? 0);
    return acc;
  }, {});

  const result = (orgs ?? []).map((o) => ({
    ...o,
    plan: planMap[o.id] ?? { plan_name: 'trial', status: 'trial', amount: 0, billing_period: 'monthly' },
    member_count: memberCount[o.id] ?? 0,
    module_count: moduleCount[o.id] ?? 0,
    invoice_count: orgRevenue[o.id]?.count ?? 0,
    total_revenue: orgRevenue[o.id]?.paid ?? 0,
  }));

  return NextResponse.json(result);
}
