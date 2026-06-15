import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import SubscriptionForm from './SubscriptionForm';
import type { SubscriptionPlan } from '@/lib/types/subscriptions';

export default async function NewSubscriptionPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('subscriptions') || !ctx.org) redirect('/dashboard');

  const supabase = await createClient();
  const { data } = await supabase.from('subscription_plans').select('*').eq('org_id', ctx.org.id).eq('is_active', true).order('price');
  const plans = (data ?? []) as SubscriptionPlan[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/subscriptions" className="text-sm text-neutral-500 hover:text-neutral-900">← Subscriptions</Link>
        <h1 className="mt-1 text-2xl font-semibold">New Subscription</h1>
      </div>
      <SubscriptionForm plans={plans} />
    </div>
  );
}
