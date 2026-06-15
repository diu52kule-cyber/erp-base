import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgContext } from '@/lib/entitlements';
import { redirect } from 'next/navigation';

const PLAN_COLORS: Record<string, string> = {
  trial:    'bg-yellow-50 text-yellow-700',
  starter:  'bg-blue-50 text-blue-700',
  growth:   'bg-indigo-50 text-indigo-700',
  scale:    'bg-purple-50 text-purple-700',
  custom:   'bg-neutral-100 text-neutral-700',
  suspended:'bg-red-50 text-red-600',
};
const STATUS_COLORS: Record<string, string> = {
  trial:     'bg-yellow-50 text-yellow-700',
  active:    'bg-green-50 text-green-700',
  suspended: 'bg-red-50 text-red-600',
  cancelled: 'bg-neutral-100 text-neutral-400',
};

function fmt(n: number) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

export default async function ClientsPage() {
  const ctx = await getOrgContext();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!ctx || (adminEmail && ctx.user.email !== adminEmail)) redirect('/dashboard');

  const admin = createAdminClient();
  const [{ data: orgs }, { data: plans }, { data: members }, { data: invoices }] = await Promise.all([
    admin.from('organizations').select('id,name,business_type,created_at').order('created_at', { ascending: false }),
    admin.from('org_plans').select('*'),
    admin.from('memberships').select('org_id'),
    admin.from('invoices').select('org_id,total,status'),
  ]);

  const planMap = Object.fromEntries((plans ?? []).map((p) => [p.org_id, p]));
  const memberCount = (members ?? []).reduce<Record<string, number>>((acc, m) => { acc[m.org_id] = (acc[m.org_id] ?? 0) + 1; return acc; }, {});
  const revenueMap = (invoices ?? []).reduce<Record<string, number>>((acc, i) => {
    if (i.status === 'paid') acc[i.org_id] = (acc[i.org_id] ?? 0) + Number(i.total);
    return acc;
  }, {});

  const totalRevenue = Object.values(revenueMap).reduce((s, v) => s + v, 0);
  const totalActive = (plans ?? []).filter((p) => p.status === 'active').length;
  const totalTrial  = (plans ?? []).filter((p) => p.status === 'trial').length;
  const totalMRR    = (plans ?? []).filter((p) => p.status === 'active').reduce((s, p) => s + Number(p.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Client Subscriptions</h1>
        <span className="text-sm text-neutral-400">{orgs?.length ?? 0} total orgs</span>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          ['Total Clients', orgs?.length ?? 0, ''],
          ['Active Plans', totalActive, 'text-green-600'],
          ['On Trial', totalTrial, 'text-yellow-600'],
          ['Monthly Revenue', fmt(totalMRR), 'text-indigo-600'],
        ].map(([label, value, cls]) => (
          <div key={label as string} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-400">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
              <th className="px-4 py-3 text-left font-medium">Organisation</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Plan</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">MRR</th>
              <th className="px-4 py-3 text-right font-medium">Members</th>
              <th className="px-4 py-3 text-right font-medium">Revenue Collected</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(orgs ?? []).map((org) => {
              const plan = planMap[org.id];
              return (
                <tr key={org.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium">{org.name}</td>
                  <td className="px-4 py-3 text-neutral-500 capitalize">{org.business_type}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_COLORS[plan?.plan_name ?? 'trial']}`}>
                      {plan?.plan_name ?? 'trial'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[plan?.status ?? 'trial']}`}>
                      {plan?.status ?? 'trial'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(Number(plan?.amount ?? 0))}</td>
                  <td className="px-4 py-3 text-right">{memberCount[org.id] ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-700">{fmt(revenueMap[org.id] ?? 0)}</td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{new Date(org.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/clients/${org.id}`} className="rounded-lg border border-neutral-200 px-3 py-1 text-xs hover:bg-neutral-100">
                      Manage →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
