import { createAdminClient } from '@/lib/supabase/admin';
import { MODULES, BUSINESS_TYPES } from '@/lib/modules';

export const dynamic = 'force-dynamic';

const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default async function AdminAnalyticsPage() {
  const admin = createAdminClient();

  const [
    { data: orgs },
    { data: plans },
    { data: entitlements },
    { data: invoices },
    { data: members },
  ] = await Promise.all([
    admin.from('organizations').select('id,business_type,created_at'),
    admin.from('org_plans').select('org_id,plan_name,status,amount,billing_period'),
    admin.from('entitlements').select('org_id,module_key,enabled'),
    admin.from('invoices').select('org_id,total,status,created_at').eq('doc_type', 'invoice'),
    admin.from('memberships').select('org_id,role'),
  ]);

  const totalOrgs = orgs?.length ?? 0;

  // ── Module popularity ──────────────────────────────────────────────
  const moduleEnabledCount: Record<string, number> = {};
  const moduleOrgSet: Record<string, Set<string>> = {};
  for (const e of entitlements ?? []) {
    if (!e.enabled) continue;
    moduleEnabledCount[e.module_key] = (moduleEnabledCount[e.module_key] ?? 0) + 1;
    if (!moduleOrgSet[e.module_key]) moduleOrgSet[e.module_key] = new Set();
    moduleOrgSet[e.module_key].add(e.org_id);
  }
  const moduleStats = MODULES.map((m) => ({
    ...m,
    count: moduleEnabledCount[m.key] ?? 0,
    pct: totalOrgs > 0 ? Math.round(((moduleEnabledCount[m.key] ?? 0) / totalOrgs) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  // ── Business type breakdown ────────────────────────────────────────
  const typeCount: Record<string, number> = {};
  for (const o of orgs ?? []) {
    const t = o.business_type ?? 'general';
    typeCount[t] = (typeCount[t] ?? 0) + 1;
  }
  const typeStats = BUSINESS_TYPES.map((bt) => ({
    ...bt,
    count: typeCount[bt.key] ?? 0,
    pct: totalOrgs > 0 ? Math.round(((typeCount[bt.key] ?? 0) / totalOrgs) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  // ── Plan distribution ──────────────────────────────────────────────
  const planCountMap: Record<string, number> = {};
  const planRevMap: Record<string, number> = {};
  for (const p of plans ?? []) {
    const key = p.plan_name ?? 'trial';
    planCountMap[key] = (planCountMap[key] ?? 0) + 1;
    planRevMap[key] = (planRevMap[key] ?? 0) + Number(p.amount ?? 0);
  }
  const PLAN_ORDER = ['starter', 'growth', 'scale', 'custom', 'trial', 'suspended'];
  const planStats = PLAN_ORDER.map((name) => ({
    name,
    count: planCountMap[name] ?? 0,
    mrr: planRevMap[name] ?? 0,
    pct: totalOrgs > 0 ? Math.round(((planCountMap[name] ?? 0) / totalOrgs) * 100) : 0,
  })).filter((p) => p.count > 0);

  // ── Revenue by plan tier ───────────────────────────────────────────
  const planInvRevMap: Record<string, number> = {};
  const planMap = Object.fromEntries((plans ?? []).map((p) => [p.org_id, p.plan_name ?? 'trial']));
  for (const inv of invoices ?? []) {
    if (inv.status !== 'paid') continue;
    const planName = planMap[inv.org_id] ?? 'unknown';
    planInvRevMap[planName] = (planInvRevMap[planName] ?? 0) + Number(inv.total);
  }

  // ── Growth: new orgs per month (last 6) ───────────────────────────
  const growthBuckets: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    growthBuckets[d.toISOString().slice(0, 7)] = 0;
  }
  for (const o of orgs ?? []) {
    const key = (o.created_at as string).slice(0, 7);
    if (key in growthBuckets) growthBuckets[key]++;
  }
  const growthMonths = Object.entries(growthBuckets);
  const maxGrowth = Math.max(...growthMonths.map(([, v]) => v), 1);

  // ── Role distribution ──────────────────────────────────────────────
  const roleCount: Record<string, number> = {};
  for (const m of members ?? []) {
    roleCount[m.role] = (roleCount[m.role] ?? 0) + 1;
  }
  const roleStats = Object.entries(roleCount).sort(([, a], [, b]) => b - a).slice(0, 8);
  const totalMembers = members?.length ?? 0;

  const PLAN_COLORS: Record<string, string> = {
    trial: 'bg-yellow-400', starter: 'bg-blue-500', growth: 'bg-indigo-500',
    scale: 'bg-purple-600', custom: 'bg-neutral-500', suspended: 'bg-red-400',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Analytics</h1>
        <p className="text-sm text-neutral-400 mt-0.5">Platform-wide usage across {totalOrgs} organisations</p>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Orgs', value: totalOrgs, sub: 'all time' },
          { label: 'Total Members', value: totalMembers, sub: 'across all orgs' },
          { label: 'Avg Modules / Org', value: totalOrgs ? Math.round(Object.values(moduleEnabledCount).reduce((s, v) => s + v, 0) / totalOrgs) : 0, sub: `of ${MODULES.length} available` },
          { label: 'Total Platform Revenue', value: fmt(Object.values(planInvRevMap).reduce((s, v) => s + v, 0)), sub: 'paid invoices' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs text-neutral-400">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
            <p className="mt-0.5 text-xs text-neutral-300">{sub}</p>
          </div>
        ))}
      </div>

      {/* Growth chart + Plan distribution */}
      <div className="grid grid-cols-3 gap-6">
        {/* Org growth chart */}
        <div className="col-span-2 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold mb-4">New Organisations — last 6 months</h2>
          <div className="flex items-end gap-3 h-32">
            {growthMonths.map(([month, count]) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-neutral-400 tabular-nums">{count || '—'}</span>
                <div className="w-full rounded-t bg-neutral-900" style={{ height: `${Math.max(4, (count / maxGrowth) * 96)}px`, backgroundColor: count > 0 ? '#111827' : '#e5e7eb' }} />
                <span className="text-[10px] text-neutral-400">
                  {new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan distribution */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold mb-4">Plan Distribution</h2>
          <div className="space-y-3">
            {planStats.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize font-medium">{p.name}</span>
                  <span className="text-neutral-400 tabular-nums">{p.count} org{p.count !== 1 ? 's' : ''} · {p.pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                  <div className={`h-full rounded-full ${PLAN_COLORS[p.name] ?? 'bg-neutral-400'}`} style={{ width: `${p.pct}%` }} />
                </div>
                {p.mrr > 0 && <p className="text-[10px] text-neutral-400 mt-0.5">MRR {fmt(p.mrr)}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Business type + Role distribution */}
      <div className="grid grid-cols-2 gap-6">
        {/* Business types */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold mb-4">Business Types</h2>
          <div className="space-y-2.5">
            {typeStats.map((t) => (
              <div key={t.key} className="flex items-center gap-3">
                <span className="text-xl w-7 shrink-0 text-center">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{t.label}</span>
                    <span className="text-neutral-400 tabular-nums">{t.count} · {t.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full rounded-full bg-neutral-800" style={{ width: `${t.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role distribution */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold mb-4">Member Roles <span className="text-sm font-normal text-neutral-400">({totalMembers} total)</span></h2>
          <div className="space-y-2.5">
            {roleStats.map(([role, count]) => {
              const pct = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
              return (
                <div key={role} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="capitalize font-medium">{role}</span>
                      <span className="text-neutral-400 tabular-nums">{count} · {pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Module popularity — business */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="font-semibold mb-1">Module Adoption</h2>
        <p className="text-xs text-neutral-400 mb-5">How many organisations have each module enabled</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          {(['business', 'workspace'] as const).map((cat) => {
            const mods = moduleStats.filter((m) => m.category === cat);
            return (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">{cat === 'workspace' ? 'Workspace' : 'Business'}</p>
                <div className="space-y-2.5">
                  {mods.map((m) => (
                    <div key={m.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5">
                          <span>{m.icon}</span>
                          <span className="font-medium">{m.name}</span>
                        </span>
                        <span className="text-neutral-400 tabular-nums">{m.count}/{totalOrgs} · {m.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cat === 'workspace' ? 'bg-indigo-500' : 'bg-neutral-900'}`}
                          style={{ width: `${m.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue by plan tier */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="font-semibold mb-4">Invoice Revenue by Plan Tier</h2>
        {Object.keys(planInvRevMap).length === 0 ? (
          <p className="text-sm text-neutral-400">No paid invoices yet</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(planInvRevMap).sort(([, a], [, b]) => b - a).map(([name, rev]) => (
              <div key={name} className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-center">
                <p className="text-xs capitalize text-neutral-400">{name} tier</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-neutral-900">{fmt(rev)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
