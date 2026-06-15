import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { BILLING_CYCLE_LABELS } from '@/lib/types/subscriptions';
import type { SubscriptionPlan } from '@/lib/types/subscriptions';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function PlansPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('subscriptions') || !ctx.org) redirect('/dashboard');

  const supabase = await createClient();
  const { data } = await supabase.from('subscription_plans').select('*').eq('org_id', ctx.org.id).order('price');
  const plans = (data ?? []) as SubscriptionPlan[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/subscriptions" className="text-sm text-neutral-500 hover:text-neutral-900">← Subscriptions</Link>
          <h1 className="mt-1 text-2xl font-semibold">Plans</h1>
        </div>
        <Link href="/dashboard/subscriptions/plans/new" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
          + New Plan
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
          <p className="text-neutral-500">No plans yet</p>
          <Link href="/dashboard/subscriptions/plans/new" className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">
            Create your first plan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold">{p.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {p.description && <p className="text-sm text-neutral-500">{p.description}</p>}
              <div>
                <span className="text-2xl font-bold">{fmt(p.price)}</span>
                <span className="ml-1 text-sm text-neutral-400">/ {BILLING_CYCLE_LABELS[p.billing_cycle]}</span>
              </div>
              {p.features.length > 0 && (
                <ul className="space-y-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
