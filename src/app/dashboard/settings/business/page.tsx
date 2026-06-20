import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { BUSINESS_TYPES } from '@/lib/modules';
import type { OrgRole } from '@/lib/types/roles';
import BusinessTypeClient from './BusinessTypeClient';

export const dynamic = 'force-dynamic';

export default async function BusinessTypePage() {
  const ctx = await getOrgContext();
  if (!ctx?.org) redirect('/login');
  if (!['owner', 'admin'].includes(ctx.org.role as OrgRole)) redirect('/dashboard/settings/preferences');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Business type</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Switch your business type to instantly retune which modules are enabled.
          {ctx.access === 'trial' && ' Great for trying different setups during your trial.'}
        </p>
      </div>
      <BusinessTypeClient types={BUSINESS_TYPES} current={ctx.org.business_type} />
    </div>
  );
}
