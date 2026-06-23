import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS, BILLING_CYCLE_LABELS } from '@/lib/types/subscriptions';
import type { CustomerSubscription, SubscriptionPlan } from '@/lib/types/subscriptions';
import StatusButton from './StatusButton';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function SubscriptionDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('subscriptions') || !ctx.org) redirect('/dashboard');

  const supabase = createClient();
  const { data } = await supabase.from('customer_subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('id', params.id).eq('org_id', ctx.org.id).single();

  if (!data) notFound();
  const sub = data as CustomerSubscription & { plan: SubscriptionPlan };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/subscriptions" className="text-sm text-neutral-500 hover:text-neutral-900">← Subscriptions</Link>
          <h1 className="mt-1 text-2xl font-semibold">{sub.customer_name}</h1>
          {sub.customer_email && <p className="text-sm text-neutral-500">{sub.customer_email}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${SUBSCRIPTION_STATUS_COLORS[sub.status]}`}>
          {SUBSCRIPTION_STATUS_LABELS[sub.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
          <h2 className="font-medium">Plan</h2>
          {sub.plan ? (
            <div className="space-y-2">
              <p className="text-lg font-semibold">{sub.plan.name}</p>
              <p className="text-2xl font-bold">{fmt(sub.plan.price)}<span className="ml-1 text-sm font-normal text-neutral-400">/ {BILLING_CYCLE_LABELS[sub.plan.billing_cycle]}</span></p>
              {sub.plan.features.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {sub.plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : <p className="text-neutral-400">Plan removed</p>}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
          <h2 className="font-medium">Dates</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Started</span><span>{sub.starts_at ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Ends</span><span>{sub.ends_at ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Next Billing</span><span>{sub.next_billing_at ?? '—'}</span></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
        <h2 className="font-medium">Change Status</h2>
        <StatusButton subId={sub.id} currentStatus={sub.status} />
      </div>
    </div>
  );
}
