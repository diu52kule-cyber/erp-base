import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrgContext } from '@/lib/entitlements';
import PlanForm from './PlanForm';

export default async function NewPlanPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('subscriptions') || !ctx.org) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/subscriptions/plans" className="text-sm text-neutral-500 hover:text-neutral-900">← Plans</Link>
        <h1 className="mt-1 text-2xl font-semibold">New Plan</h1>
      </div>
      <PlanForm />
    </div>
  );
}
