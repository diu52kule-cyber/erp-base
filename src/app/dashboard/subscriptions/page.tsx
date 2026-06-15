import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS, BILLING_CYCLE_LABELS } from '@/lib/types/subscriptions';
import type { CustomerSubscription, SubscriptionPlan } from '@/lib/types/subscriptions';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function SubscriptionsPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('subscriptions') || !ctx.org) redirect('/dashboard');

  const supabase = await createClient();
  const [{ data: subs }, { data: plans }] = await Promise.all([
    supabase.from('customer_subscriptions').select('*, plan:subscription_plans(name,price,billing_cycle)')
      .eq('org_id', ctx.org.id).order('created_at', { ascending: false }),
    supabase.from('subscription_plans').select('*').eq('org_id', ctx.org.id).eq('is_active', true),
  ]);

  const subList = (subs ?? []) as CustomerSubscription[];
  const planList = (plans ?? []) as SubscriptionPlan[];

  const active = subList.filter((s) => s.status === 'active');
  const mrr = active.reduce((total, s) => {
    const p = s.plan as any;
    if (!p) return total;
    const monthly = p.billing_cycle === 'annual' ? p.price / 12 : p.billing_cycle === 'quarterly' ? p.price / 3 : p.price;
    return total + monthly;
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subscriptions</h1>
          <p className="mt-1 text-sm text-neutral-500">Plans and customer subscriptions</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/subscriptions/plans" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
            Manage Plans
          </Link>
          <Link href="/dashboard/subscriptions/new" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
            + New Subscription
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Active', value: active.length },
          { label: 'Total Subscribers', value: subList.length },
          { label: 'Plans', value: planList.length },
          { label: 'MRR', value: fmt(mrr) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {subList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-neutral-500">No subscriptions yet</p>
          {planList.length === 0 && (
            <p className="mt-1 text-sm text-neutral-400">Create a plan first</p>
          )}
          <div className="mt-3 flex justify-center gap-2">
            {planList.length === 0 && (
              <Link href="/dashboard/subscriptions/plans/new" className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
                Create Plan
              </Link>
            )}
            <Link href="/dashboard/subscriptions/new" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">
              Add Subscriber
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Started</th>
                <th className="px-4 py-3 text-right font-medium">Next Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {subList.map((s) => {
                const p = s.plan as any;
                return (
                  <tr key={s.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/subscriptions/${s.id}`} className="font-medium hover:underline">{s.customer_name}</Link>
                      {s.customer_email && <p className="text-xs text-neutral-400">{s.customer_email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {p ? (
                        <>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-neutral-400">{fmt(p.price)} / {BILLING_CYCLE_LABELS[p.billing_cycle as keyof typeof BILLING_CYCLE_LABELS]}</p>
                        </>
                      ) : <span className="text-neutral-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SUBSCRIPTION_STATUS_COLORS[s.status]}`}>
                        {SUBSCRIPTION_STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{s.starts_at}</td>
                    <td className="px-4 py-3 text-right text-neutral-500">{s.next_billing_at ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
