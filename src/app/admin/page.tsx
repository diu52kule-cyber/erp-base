import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function daysLeft(dateStr: string | null) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr + 'T23:59:59').getTime() - Date.now()) / 86400000);
}

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const admin = createAdminClient();
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: orgs }, { data: plans }, { data: invoices }] = await Promise.all([
    admin.from('organizations').select('id,name,business_type,created_at').order('created_at', { ascending: false }),
    admin.from('org_plans').select('*'),
    admin.from('invoices').select('org_id,total,status,created_at').eq('doc_type', 'invoice'),
  ]);

  const planMap = Object.fromEntries((plans ?? []).map((p) => [p.org_id, p]));

  // Platform KPIs
  const totalOrgs   = orgs?.length ?? 0;
  const active      = (plans ?? []).filter((p) => p.status === 'active');
  const trials      = (plans ?? []).filter((p) => p.status === 'trial');
  const suspended   = (plans ?? []).filter((p) => ['suspended', 'cancelled'].includes(p.status));
  const mrr         = active.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const totalRev    = (invoices ?? []).filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);

  // Trials expiring in ≤7 days
  const expiringSoon = (orgs ?? [])
    .map((org) => {
      const plan = planMap[org.id];
      if (plan?.status !== 'trial') return null;
      const days = daysLeft(plan.next_billing_date ?? null);
      if (days === null || days > 7) return null;
      return { org, plan, days };
    })
    .filter(Boolean) as { org: any; plan: any; days: number }[];

  // New this week
  const newThisWeek = (orgs ?? []).filter((o) => o.created_at >= since7);

  // Needs attention: suspended / expired trials (days < 0)
  const needsAttention = (orgs ?? [])
    .map((org) => {
      const plan = planMap[org.id];
      if (!plan) return null;
      if (plan.status === 'suspended') return { org, plan, reason: 'Suspended' };
      if (plan.status === 'cancelled') return { org, plan, reason: 'Cancelled' };
      const days = daysLeft(plan.next_billing_date ?? null);
      if (plan.status === 'trial' && days !== null && days < 0) return { org, plan, reason: 'Trial expired' };
      return null;
    })
    .filter(Boolean) as { org: any; plan: any; reason: string }[];

  // Revenue by month (last 6 months)
  const monthBuckets: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    monthBuckets[d.toISOString().slice(0, 7)] = 0;
  }
  for (const inv of (invoices ?? [])) {
    if (inv.status !== 'paid') continue;
    const key = (inv.created_at as string).slice(0, 7);
    if (key in monthBuckets) monthBuckets[key] += Number(inv.total);
  }
  const months = Object.entries(monthBuckets);
  const maxRev = Math.max(...months.map(([, v]) => v), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Platform Overview</h1>
          <p className="text-sm text-neutral-400 mt-0.5">All numbers are live across {totalOrgs} organisations</p>
        </div>
        <span className="text-xs text-neutral-400">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: 'Total Orgs',     value: totalOrgs,         sub: 'all time',          color: '' },
          { label: 'Active',         value: active.length,     sub: 'paying',            color: 'text-green-600' },
          { label: 'On Trial',       value: trials.length,     sub: 'free tier',         color: 'text-yellow-600' },
          { label: 'Churned',        value: suspended.length,  sub: 'suspended/cancelled', color: 'text-red-500' },
          { label: 'MRR',            value: fmt(mrr),          sub: 'monthly recurring', color: 'text-indigo-600' },
          { label: 'Total Revenue',  value: fmt(totalRev),     sub: 'all invoices paid', color: 'text-emerald-600' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-neutral-300">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Revenue bar chart */}
        <div className="col-span-2 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold mb-4">Revenue — last 6 months</h2>
          <div className="flex items-end gap-3 h-32">
            {months.map(([month, rev]) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-neutral-400 tabular-nums">
                  {rev > 0 ? (rev >= 100000 ? fmt(rev) : '₹' + (rev / 1000).toFixed(0) + 'k') : '—'}
                </span>
                <div className="w-full rounded-t" style={{
                  height: `${Math.max(4, (rev / maxRev) * 96)}px`,
                  backgroundColor: rev > 0 ? '#111827' : '#e5e7eb'
                }} />
                <span className="text-[10px] text-neutral-400">
                  {new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* New this week */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold mb-1">New this week</h2>
          <p className="text-xs text-neutral-400 mb-4">{newThisWeek.length} organisations signed up</p>
          {newThisWeek.length === 0 ? (
            <p className="text-sm text-neutral-300">None yet</p>
          ) : (
            <div className="space-y-2">
              {newThisWeek.slice(0, 6).map((org) => {
                const plan = planMap[org.id];
                return (
                  <div key={org.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium truncate max-w-[140px]">{org.name}</p>
                      <p className="text-xs text-neutral-400 capitalize">{org.business_type}</p>
                    </div>
                    <span className={`text-xs rounded-full px-2 py-0.5 ${plan?.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {plan?.status ?? 'trial'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Trials expiring soon */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-amber-900">Trials expiring soon</h2>
              <p className="text-xs text-amber-600 mt-0.5">Within 7 days — reach out or extend</p>
            </div>
            <span className="rounded-full bg-amber-200 text-amber-800 text-xs font-semibold px-3 py-1">{expiringSoon.length}</span>
          </div>
          {expiringSoon.length === 0 ? (
            <p className="text-sm text-amber-600">No trials expiring soon 🎉</p>
          ) : (
            <div className="space-y-2">
              {expiringSoon.map(({ org, plan, days }) => (
                <div key={org.id} className="flex items-center justify-between rounded-lg bg-white border border-amber-200 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-neutral-400 capitalize">{org.business_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold tabular-nums ${days <= 1 ? 'text-red-600' : days <= 3 ? 'text-orange-500' : 'text-amber-600'}`}>
                      {days <= 0 ? 'Expired' : `${days}d left`}
                    </span>
                    <Link href={`/admin/clients/${org.id}`}
                      className="rounded-lg bg-amber-900 px-2.5 py-1 text-xs text-white hover:bg-amber-800">
                      Manage →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Needs attention */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-red-900">Needs attention</h2>
              <p className="text-xs text-red-500 mt-0.5">Suspended, cancelled, or expired</p>
            </div>
            <span className="rounded-full bg-red-200 text-red-800 text-xs font-semibold px-3 py-1">{needsAttention.length}</span>
          </div>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-red-500">Nothing flagged 🎉</p>
          ) : (
            <div className="space-y-2">
              {needsAttention.slice(0, 6).map(({ org, reason }) => (
                <div key={org.id} className="flex items-center justify-between rounded-lg bg-white border border-red-200 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-neutral-400 capitalize">{org.business_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-red-600">{reason}</span>
                    <Link href={`/admin/clients/${org.id}`}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100">
                      Fix →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
