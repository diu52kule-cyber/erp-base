import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { MODULES } from '@/lib/modules';
import ClientDetail from './ClientDetail';

export const dynamic = 'force-dynamic';

const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-yellow-50 text-yellow-700', starter: 'bg-blue-50 text-blue-700',
  growth: 'bg-indigo-50 text-indigo-700', scale: 'bg-purple-50 text-purple-700',
  custom: 'bg-neutral-100 text-neutral-700', suspended: 'bg-red-50 text-red-600',
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = createAdminClient();
  const { id } = await params;

  const [
    { data: org },
    { data: plan },
    { data: members },
    { data: entitlements },
    { data: invoices },
    { data: employees },
    { data: contacts },
    { data: posOrders },
  ] = await Promise.all([
    admin.from('organizations').select('*').eq('id', id).single(),
    admin.from('org_plans').select('*').eq('org_id', id).maybeSingle(),
    admin.from('memberships').select('user_id,role,job_title').eq('org_id', id),
    admin.from('entitlements').select('module_key,enabled').eq('org_id', id),
    admin.from('invoices').select('id,invoice_number,total,status,created_at').eq('org_id', id).eq('doc_type', 'invoice').order('created_at', { ascending: false }).limit(5),
    admin.from('employees').select('id,status').eq('org_id', id),
    admin.from('contacts').select('id').eq('org_id', id).is('archived_at', null),
    admin.from('pos_orders').select('id,total,created_at').eq('org_id', id).order('created_at', { ascending: false }).limit(1),
  ]);

  if (!org) redirect('/admin/clients');

  const { data: { users } = { users: [] } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.email]));

  const enabledSet = new Set((entitlements ?? []).filter((e) => e.enabled).map((e) => e.module_key));
  const allModules = MODULES.map((m) => ({ ...m, enabled: enabledSet.has(m.key) }));

  const allInvoices = (invoices ?? []);
  const paidRev = allInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);
  const resolvedPlan = plan ?? { plan_name: 'trial', status: 'trial', amount: 0, billing_period: 'monthly', next_billing_date: null, notes: '' };
  const activeEmps = (employees ?? []).filter((e: any) => e.status === 'active').length;

  // Owner email = first member with role 'owner'
  const ownerMember = (members ?? []).find((m) => m.role === 'owner');
  const ownerEmail = ownerMember ? emailMap[ownerMember.user_id] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/clients" className="text-xs text-neutral-400 hover:text-neutral-600">← All Clients</Link>
          <h1 className="mt-1 text-2xl font-semibold">{org.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span className="capitalize">{org.business_type}</span>
            <span className="text-neutral-300">·</span>
            <span>ID: {id.slice(0, 8)}…</span>
            <span className="text-neutral-300">·</span>
            <span>Joined {new Date(org.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            {ownerEmail && (
              <>
                <span className="text-neutral-300">·</span>
                <a href={`mailto:${ownerEmail}`} className="text-indigo-500 hover:underline">✉ {ownerEmail}</a>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ownerEmail && (
            <a href={`mailto:${ownerEmail}?subject=Your Gradia account`}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50">
              📧 Email owner
            </a>
          )}
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${PLAN_COLORS[resolvedPlan.plan_name] ?? 'bg-neutral-100'}`}>
            {resolvedPlan.plan_name}
          </span>
        </div>
      </div>

      <ClientDetail
        orgId={id}
        orgName={org.name}
        initialPlan={resolvedPlan as any}
        initialModules={allModules}
        members={(members ?? []).map((m: any) => ({ ...m, email: emailMap[m.user_id] ?? undefined }))}
        stats={{
          invoice_count: allInvoices.length,
          revenue: paidRev,
          employee_count: activeEmps,
          contact_count: contacts?.length ?? 0,
          pos_order_count: posOrders ? (posOrders as any[]).length : 0,
          last_pos_date: posOrders && (posOrders as any[]).length > 0 ? (posOrders as any[])[0].created_at : null,
        }}
        recentInvoices={(invoices ?? []).map((i: any) => ({
          id: i.id,
          number: i.invoice_number ?? '—',
          total: Number(i.total),
          status: i.status,
          date: i.created_at,
        }))}
        ownerEmail={ownerEmail ?? null}
      />
    </div>
  );
}
