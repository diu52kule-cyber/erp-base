import { createAdminClient } from '@/lib/supabase/admin';
import ClientsTable from './ClientsTable';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const admin = createAdminClient();
  const [{ data: orgs }, { data: plans }, { data: members }, { data: invoices }] = await Promise.all([
    admin.from('organizations').select('id,name,business_type,created_at').order('created_at', { ascending: false }),
    admin.from('org_plans').select('*'),
    admin.from('memberships').select('org_id'),
    admin.from('invoices').select('org_id,total,status,created_at').eq('doc_type', 'invoice'),
  ]);

  const planMap  = Object.fromEntries((plans ?? []).map((p) => [p.org_id, p]));
  const memberCount = (members ?? []).reduce<Record<string, number>>((acc, m) => { acc[m.org_id] = (acc[m.org_id] ?? 0) + 1; return acc; }, {});

  // Revenue per org (paid invoices only)
  const revenueMap: Record<string, number> = {};
  // Last active date per org (most recent paid invoice)
  const lastActiveMap: Record<string, string> = {};
  for (const inv of (invoices ?? [])) {
    if (inv.status === 'paid') {
      revenueMap[inv.org_id] = (revenueMap[inv.org_id] ?? 0) + Number(inv.total);
      if (!lastActiveMap[inv.org_id] || inv.created_at > lastActiveMap[inv.org_id]) {
        lastActiveMap[inv.org_id] = inv.created_at;
      }
    }
  }

  const rows = (orgs ?? []).map((org) => {
    const plan = planMap[org.id];
    return {
      id:               org.id,
      name:             org.name,
      business_type:    org.business_type,
      created_at:       org.created_at,
      plan:             plan?.plan_name ?? 'trial',
      status:           plan?.status ?? 'trial',
      amount:           Number(plan?.amount ?? 0),
      next_billing_date: plan?.next_billing_date ?? null,
      members:          memberCount[org.id] ?? 0,
      revenue:          revenueMap[org.id] ?? 0,
      last_active:      lastActiveMap[org.id] ?? null,
    };
  });

  const totalActive = rows.filter((r) => r.status === 'active').length;
  const totalTrial  = rows.filter((r) => r.status === 'trial').length;
  const totalMRR    = rows.filter((r) => r.status === 'active').reduce((s, r) => s + r.amount, 0);
  const totalRev    = Object.values(revenueMap).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Client Subscriptions</h1>
        <span className="text-sm text-neutral-400">{rows.length} total organisations</span>
      </div>
      <ClientsTable rows={rows} totalMRR={totalMRR} totalActive={totalActive} totalTrial={totalTrial} totalRev={totalRev} />
    </div>
  );
}
