import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';
import { MODULES } from '@/lib/modules';
import ClientDetail from './ClientDetail';

const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-yellow-50 text-yellow-700', starter: 'bg-blue-50 text-blue-700',
  growth: 'bg-indigo-50 text-indigo-700', scale: 'bg-purple-50 text-purple-700',
  custom: 'bg-neutral-100 text-neutral-700', suspended: 'bg-red-50 text-red-600',
};

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!ctx || !adminEmail || ctx.user.email !== adminEmail) redirect('/dashboard');

  const admin = createAdminClient();
  const { id } = params;

  const [{ data: org }, { data: plan }, { data: members }, { data: entitlements }, { data: invoices }, { data: employees }] = await Promise.all([
    admin.from('organizations').select('*').eq('id', id).single(),
    admin.from('org_plans').select('*').eq('org_id', id).maybeSingle(),
    admin.from('memberships').select('user_id,role').eq('org_id', id),
    admin.from('entitlements').select('module_key,enabled').eq('org_id', id),
    admin.from('invoices').select('total,status').eq('org_id', id),
    admin.from('employees').select('id').eq('org_id', id),
  ]);

  if (!org) redirect('/admin/clients');

  // Get member emails via admin auth
  const { data: { users } = { users: [] } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = Object.fromEntries((users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email]));

  const enabledSet = new Set((entitlements ?? []).filter((e) => e.enabled).map((e) => e.module_key));
  const allModules = MODULES.map((m) => ({ ...m, enabled: enabledSet.has(m.key) }));

  const revenue = (invoices ?? []).filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);
  const resolvedPlan = plan ?? { plan_name: 'trial', status: 'trial', amount: 0, billing_period: 'monthly', next_billing_date: null, notes: '' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/clients" className="text-xs text-neutral-400 hover:text-neutral-600">← All Clients</Link>
          <h1 className="mt-1 text-2xl font-semibold">{org.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-neutral-400 capitalize">{org.business_type}</span>
            <span className="text-neutral-300">·</span>
            <span className="text-xs text-neutral-400">ID: {org.id.slice(0, 8)}…</span>
            <span className="text-neutral-300">·</span>
            <span className="text-xs text-neutral-400">Joined {new Date(org.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${PLAN_COLORS[resolvedPlan.plan_name]}`}>
          {resolvedPlan.plan_name}
        </span>
      </div>

      <ClientDetail
        orgId={id}
        orgName={org.name}
        initialPlan={resolvedPlan}
        initialModules={allModules}
        members={(members ?? []).map((m) => ({ ...m, email: emailMap[m.user_id] ?? undefined }))}
        stats={{ invoice_count: invoices?.length ?? 0, revenue, employee_count: employees?.length ?? 0 }}
      />
    </div>
  );
}
